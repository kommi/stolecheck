"""
Google Cloud Storage client for StoleCheck.
Handles image uploads, downloads, and signed URL generation.
"""
import os
import logging
from typing import Optional, BinaryIO
from datetime import timedelta
from google.cloud import storage
from google.oauth2.service_account import Credentials

logger = logging.getLogger(__name__)


class CloudStorageClient:
    """Google Cloud Storage client wrapper."""

    def __init__(self, bucket_name: Optional[str] = None, credentials_path: Optional[str] = None):
        """
        Initialize Cloud Storage client.

        Args:
            bucket_name: GCS bucket name. If None, reads from GCS_BUCKET_NAME env var
            credentials_path: Path to service account JSON key. If None, uses GOOGLE_APPLICATION_CREDENTIALS env var
        """
        self.bucket_name = bucket_name or os.environ.get("GCS_BUCKET_NAME")

        if not self.bucket_name:
            raise ValueError("GCS_BUCKET_NAME not configured")

        if credentials_path:
            creds = Credentials.from_service_account_file(credentials_path)
            self.client = storage.Client(credentials=creds)
        else:
            self.client = storage.Client()

        self.bucket = self.client.bucket(self.bucket_name)
        logger.info(f"Cloud Storage client initialized for bucket: {self.bucket_name}")

    async def upload_image(self, file_path: str, file_bytes: bytes, content_type: str = "image/jpeg") -> str:
        """
        Upload image to Cloud Storage.

        Args:
            file_path: Path in bucket (e.g., "users/{user_id}/{item_id}/image.jpg")
            file_bytes: Image file bytes
            content_type: MIME type

        Returns:
            Bucket path (gs://bucket/path)
        """
        try:
            blob = self.bucket.blob(file_path)
            blob.upload_from_string(file_bytes, content_type=content_type)
            logger.info(f"Image uploaded: gs://{self.bucket_name}/{file_path}")
            return f"gs://{self.bucket_name}/{file_path}"
        except Exception as e:
            logger.error(f"Image upload failed: {e}")
            raise

    async def download_image(self, file_path: str) -> bytes:
        """
        Download image from Cloud Storage.

        Args:
            file_path: Path in bucket (e.g., "users/{user_id}/{item_id}/image.jpg")

        Returns:
            Image file bytes
        """
        try:
            blob = self.bucket.blob(file_path)
            return blob.download_as_bytes()
        except Exception as e:
            logger.error(f"Image download failed: {e}")
            raise

    async def generate_signed_url(self, file_path: str, expiry_hours: int = 7 * 24) -> str:
        """
        Generate signed URL for temporary access.

        Args:
            file_path: Path in bucket
            expiry_hours: URL expiry time in hours (default: 7 days)

        Returns:
            Signed URL string
        """
        try:
            blob = self.bucket.blob(file_path)
            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(hours=expiry_hours),
                method="GET",
            )
            return signed_url
        except Exception as e:
            logger.error(f"Signed URL generation failed: {e}")
            raise

    async def delete_image(self, file_path: str) -> None:
        """
        Delete image from Cloud Storage.

        Args:
            file_path: Path in bucket
        """
        try:
            blob = self.bucket.blob(file_path)
            blob.delete()
            logger.info(f"Image deleted: gs://{self.bucket_name}/{file_path}")
        except Exception as e:
            logger.error(f"Image deletion failed: {e}")
            raise

    async def list_images(self, prefix: str) -> list:
        """
        List images in a directory.

        Args:
            prefix: Directory prefix (e.g., "users/{user_id}/")

        Returns:
            List of blob names
        """
        try:
            blobs = self.client.list_blobs(self.bucket_name, prefix=prefix)
            return [blob.name for blob in blobs]
        except Exception as e:
            logger.error(f"List operation failed: {e}")
            raise

    async def get_blob_metadata(self, file_path: str) -> dict:
        """
        Get blob metadata.

        Args:
            file_path: Path in bucket

        Returns:
            Metadata dict with size, content_type, created_time, etc.
        """
        try:
            blob = self.bucket.blob(file_path)
            blob.reload()
            return {
                "name": blob.name,
                "size": blob.size,
                "content_type": blob.content_type,
                "created": blob.time_created.isoformat() if blob.time_created else None,
                "updated": blob.updated.isoformat() if blob.updated else None,
            }
        except Exception as e:
            logger.error(f"Metadata fetch failed: {e}")
            raise
