#!/usr/bin/env python3
"""
Migration script to migrate StoleCheck data from MongoDB to Google Cloud Firestore.
Usage: python migrate_from_mongo.py --mongo-url="..." --gcp-project-id="..."
"""
import asyncio
import argparse
import logging
from typing import List
import base64
from motor.motor_asyncio import AsyncIOMotorClient
from google.cloud import firestore, storage
import uuid

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


async def migrate_data(mongo_url: str, db_name: str, gcp_project_id: str, skip_images: bool = False):
    """Migrate all data from MongoDB to Firestore."""

    # Connect to MongoDB
    mongo_client = AsyncIOMotorClient(mongo_url)
    mongo_db = mongo_client[db_name]

    # Initialize Firestore
    fs_client = firestore.Client(project=gcp_project_id)

    # Initialize Cloud Storage (optional, for image migration)
    gcs_client = storage.Client(project=gcp_project_id)
    gcs_bucket = None
    if not skip_images:
        gcs_bucket = gcs_client.bucket("stolecheck-images-prod")

    try:
        logger.info("Starting data migration from MongoDB to Firestore...")

        # Migrate users
        await migrate_users(mongo_db, fs_client)

        # Migrate user sessions
        await migrate_user_sessions(mongo_db, fs_client)

        # Migrate stolen items (with image migration)
        await migrate_stolen_items(mongo_db, fs_client, gcs_bucket, skip_images)

        # Migrate verifications
        await migrate_verifications(mongo_db, fs_client)

        # Migrate alerts
        await migrate_alerts(mongo_db, fs_client)

        # Migrate cases
        await migrate_cases(mongo_db, fs_client)

        # Migrate activity log
        await migrate_activity_log(mongo_db, fs_client)

        logger.info("Migration completed successfully!")

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
    finally:
        mongo_client.close()


async def migrate_users(mongo_db, fs_client):
    """Migrate users collection."""
    logger.info("Migrating users...")
    count = 0

    cursor = mongo_db.users.find({})
    async for doc in cursor:
        user_id = doc.pop("_id", None)
        fs_client.collection("users").document(str(user_id)).set(doc)
        count += 1

    logger.info(f"Migrated {count} users")


async def migrate_user_sessions(mongo_db, fs_client):
    """Migrate user sessions."""
    logger.info("Migrating user sessions...")
    count = 0

    cursor = mongo_db.user_sessions.find({})
    async for doc in cursor:
        session_id = doc.pop("_id", None)
        fs_client.collection("user_sessions").document(str(session_id)).set(doc)
        count += 1

    logger.info(f"Migrated {count} user sessions")


async def migrate_stolen_items(mongo_db, fs_client, gcs_bucket, skip_images: bool):
    """Migrate stolen items with image migration to Cloud Storage."""
    logger.info("Migrating stolen items...")
    count = 0

    cursor = mongo_db.stolen_items.find({})
    async for doc in cursor:
        item_id = doc.pop("_id", None)

        # Migrate images to Cloud Storage
        if not skip_images and doc.get("images"):
            migrated_images = []
            for idx, image_b64 in enumerate(doc.get("images", [])):
                try:
                    if isinstance(image_b64, str) and image_b64.startswith("data:"):
                        image_b64 = image_b64.split(",")[1]

                    image_bytes = base64.b64decode(image_b64)
                    user_id = doc.get("user_id", "unknown")
                    file_path = f"users/{user_id}/{item_id}/{idx}_{uuid.uuid4().hex[:8]}.jpg"

                    blob = gcs_bucket.blob(file_path)
                    blob.upload_from_string(image_bytes, content_type="image/jpeg")

                    migrated_images.append({
                        "bucket_path": f"gs://stolecheck-images-prod/{file_path}",
                        "uploaded_at": doc.get("created_at"),
                        "size_bytes": len(image_bytes),
                    })
                    logger.debug(f"Migrated image {idx} for item {item_id}")
                except Exception as e:
                    logger.warning(f"Failed to migrate image {idx} for item {item_id}: {e}")

            doc["images"] = migrated_images

        fs_client.collection("stolen_items").document(str(item_id)).set(doc)
        count += 1

    logger.info(f"Migrated {count} stolen items")


async def migrate_verifications(mongo_db, fs_client):
    """Migrate verifications."""
    logger.info("Migrating verifications...")
    count = 0

    cursor = mongo_db.verifications.find({})
    async for doc in cursor:
        verification_id = doc.pop("_id", None)
        fs_client.collection("verifications").document(str(verification_id)).set(doc)
        count += 1

    logger.info(f"Migrated {count} verifications")


async def migrate_alerts(mongo_db, fs_client):
    """Migrate alerts."""
    logger.info("Migrating alerts...")
    count = 0

    cursor = mongo_db.alerts.find({})
    async for doc in cursor:
        alert_id = doc.pop("_id", None)
        fs_client.collection("alerts").document(str(alert_id)).set(doc)
        count += 1

    logger.info(f"Migrated {count} alerts")


async def migrate_cases(mongo_db, fs_client):
    """Migrate cases."""
    logger.info("Migrating cases...")
    count = 0

    cursor = mongo_db.cases.find({})
    async for doc in cursor:
        case_id = doc.pop("_id", None)
        fs_client.collection("cases").document(str(case_id)).set(doc)
        count += 1

    logger.info(f"Migrated {count} cases")


async def migrate_activity_log(mongo_db, fs_client):
    """Migrate activity log."""
    logger.info("Migrating activity log...")
    count = 0

    cursor = mongo_db.activity_log.find({})
    async for doc in cursor:
        activity_id = doc.pop("_id", None)
        fs_client.collection("activity_log").document(str(activity_id)).set(doc)
        count += 1

    logger.info(f"Migrated {count} activity log entries")


def main():
    parser = argparse.ArgumentParser(description="Migrate StoleCheck data from MongoDB to Firestore")
    parser.add_argument("--mongo-url", required=True, help="MongoDB connection URL")
    parser.add_argument("--db-name", default="stolecheck", help="MongoDB database name")
    parser.add_argument("--gcp-project-id", required=True, help="GCP project ID")
    parser.add_argument("--skip-images", action="store_true", help="Skip image migration")

    args = parser.parse_args()

    asyncio.run(
        migrate_data(
            mongo_url=args.mongo_url,
            db_name=args.db_name,
            gcp_project_id=args.gcp_project_id,
            skip_images=args.skip_images,
        )
    )


if __name__ == "__main__":
    main()
