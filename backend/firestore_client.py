"""
Firestore database client for StoleCheck.
Provides abstraction layer for Firestore operations.
"""
import os
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from google.cloud import firestore
from google.oauth2.service_account import Credentials

logger = logging.getLogger(__name__)


class FirestoreDB:
    """Firestore database client wrapper."""

    def __init__(self, credentials_path: Optional[str] = None, project_id: Optional[str] = None):
        """
        Initialize Firestore client.

        Args:
            credentials_path: Path to service account JSON key. If None, uses GOOGLE_APPLICATION_CREDENTIALS env var
            project_id: GCP project ID. If None, reads from env var GCP_PROJECT_ID
        """
        self.project_id = project_id or os.environ.get("GCP_PROJECT_ID")

        if credentials_path:
            creds = Credentials.from_service_account_file(credentials_path)
            self.db = firestore.Client(credentials=creds, project=self.project_id)
        else:
            self.db = firestore.Client(project=self.project_id)

        logger.info(f"Firestore client initialized for project: {self.project_id}")

    async def get_user(self, user_id: str) -> Optional[Dict]:
        """Get user by ID."""
        doc = self.db.collection("users").document(user_id).get()
        return doc.to_dict() if doc.exists else None

    async def find_user_by_email(self, email: str) -> Optional[Dict]:
        """Find user by email address."""
        docs = self.db.collection("users").where("email", "==", email).stream()
        for doc in docs:
            return doc.to_dict()
        return None

    async def create_user(self, user_id: str, email: str, name: str, role: str = "victim", picture: Optional[str] = None) -> Dict:
        """Create new user."""
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.db.collection("users").document(user_id).set(user_doc)
        return user_doc

    async def update_user(self, user_id: str, updates: Dict) -> None:
        """Update user document."""
        self.db.collection("users").document(user_id).update(updates)

    async def create_user_session(self, user_id: str, session_token: str, expires_at: str) -> Dict:
        """Create user session."""
        session_doc = {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.db.collection("user_sessions").document(session_token).set(session_doc)
        return session_doc

    async def get_user_session(self, session_token: str) -> Optional[Dict]:
        """Get user session by token."""
        doc = self.db.collection("user_sessions").document(session_token).get()
        return doc.to_dict() if doc.exists else None

    async def find_user_session_by_token(self, session_token: str) -> Optional[Dict]:
        """Find user session by token."""
        docs = self.db.collection("user_sessions").where("session_token", "==", session_token).stream()
        for doc in docs:
            return doc.to_dict()
        return None

    async def delete_user_session(self, session_token: str) -> None:
        """Delete user session."""
        self.db.collection("user_sessions").document(session_token).delete()

    async def create_stolen_item(self, item_id: str, item_data: Dict) -> Dict:
        """Create stolen item."""
        item_data["item_id"] = item_id
        item_data["created_at"] = datetime.now(timezone.utc).isoformat()
        self.db.collection("stolen_items").document(item_id).set(item_data)
        return item_data

    async def get_stolen_item(self, item_id: str) -> Optional[Dict]:
        """Get stolen item by ID."""
        doc = self.db.collection("stolen_items").document(item_id).get()
        return doc.to_dict() if doc.exists else None

    async def get_stolen_items_by_user(self, user_id: str) -> List[Dict]:
        """Get all stolen items for a user."""
        items = []
        docs = self.db.collection("stolen_items").where("user_id", "==", user_id).stream()
        for doc in docs:
            items.append(doc.to_dict())
        return items

    async def get_all_stolen_items(self, limit: int = 100) -> List[Dict]:
        """Get all stolen items."""
        items = []
        docs = self.db.collection("stolen_items").limit(limit).stream()
        for doc in docs:
            items.append(doc.to_dict())
        return items

    async def update_stolen_item(self, item_id: str, updates: Dict) -> None:
        """Update stolen item."""
        self.db.collection("stolen_items").document(item_id).update(updates)

    async def create_verification(self, verification_id: str, verification_data: Dict) -> Dict:
        """Create verification record."""
        verification_data["verification_id"] = verification_id
        verification_data["created_at"] = datetime.now(timezone.utc).isoformat()
        self.db.collection("verifications").document(verification_id).set(verification_data)
        return verification_data

    async def get_verification(self, verification_id: str) -> Optional[Dict]:
        """Get verification by ID."""
        doc = self.db.collection("verifications").document(verification_id).get()
        return doc.to_dict() if doc.exists else None

    async def get_verifications_by_user(self, user_id: str) -> List[Dict]:
        """Get all verifications for a user."""
        verifications = []
        docs = self.db.collection("verifications").where("user_id", "==", user_id).stream()
        for doc in docs:
            verifications.append(doc.to_dict())
        return verifications

    async def create_alert(self, alert_id: str, alert_data: Dict) -> Dict:
        """Create alert."""
        alert_data["alert_id"] = alert_id
        alert_data["created_at"] = datetime.now(timezone.utc).isoformat()
        self.db.collection("alerts").document(alert_id).set(alert_data)
        return alert_data

    async def get_alerts(self, limit: int = 50) -> List[Dict]:
        """Get recent alerts."""
        alerts = []
        docs = (
            self.db.collection("alerts")
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        for doc in docs:
            alerts.append(doc.to_dict())
        return alerts

    async def get_alert(self, alert_id: str) -> Optional[Dict]:
        """Get alert by ID."""
        doc = self.db.collection("alerts").document(alert_id).get()
        return doc.to_dict() if doc.exists else None

    async def update_alert(self, alert_id: str, updates: Dict) -> None:
        """Update alert."""
        self.db.collection("alerts").document(alert_id).update(updates)

    async def create_case(self, case_id: str, case_data: Dict) -> Dict:
        """Create case."""
        case_data["case_id"] = case_id
        case_data["created_at"] = datetime.now(timezone.utc).isoformat()
        self.db.collection("cases").document(case_id).set(case_data)
        return case_data

    async def get_case(self, case_id: str) -> Optional[Dict]:
        """Get case by ID."""
        doc = self.db.collection("cases").document(case_id).get()
        return doc.to_dict() if doc.exists else None

    async def get_cases_by_officer(self, officer_id: str) -> List[Dict]:
        """Get all cases for an officer."""
        cases = []
        docs = self.db.collection("cases").where("officer_id", "==", officer_id).stream()
        for doc in docs:
            cases.append(doc.to_dict())
        return cases

    async def update_case(self, case_id: str, updates: Dict) -> None:
        """Update case."""
        self.db.collection("cases").document(case_id).update(updates)

    async def log_activity(self, activity_id: str, activity_data: Dict) -> Dict:
        """Log activity."""
        activity_data["activity_id"] = activity_id
        activity_data["created_at"] = datetime.now(timezone.utc).isoformat()
        self.db.collection("activity_log").document(activity_id).set(activity_data)
        return activity_data

    async def get_activity_log(self, limit: int = 50) -> List[Dict]:
        """Get activity log."""
        activities = []
        docs = (
            self.db.collection("activity_log")
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        for doc in docs:
            activities.append(doc.to_dict())
        return activities

    async def get_admin_stats(self) -> Dict:
        """Get admin statistics."""
        users_count = len(list(self.db.collection("users").stream()))
        items_count = len(list(self.db.collection("stolen_items").stream()))
        verifications_count = len(list(self.db.collection("verifications").stream()))
        alerts_count = len(list(self.db.collection("alerts").stream()))

        return {
            "total_users": users_count,
            "total_stolen_items": items_count,
            "total_verifications": verifications_count,
            "total_alerts": alerts_count,
        }
