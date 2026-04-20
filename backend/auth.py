import os
import jwt
import bcrypt
import uuid
import json
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict
from fastapi import Request, HTTPException
from dotenv import load_dotenv
from google.auth.transport import requests
from google.oauth2 import id_token

load_dotenv()

JWT_SECRET = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

GOOGLE_OAUTH_CLIENT_ID = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
GOOGLE_OAUTH_CLIENT_SECRET = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")


def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, role: str) -> str:
    """Create JWT token with user_id and role."""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request, db) -> dict:
    """Get current user from request (session cookie or JWT token)."""
    # Check session cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        session = await db.user_sessions.find_one(
            {"session_token": session_token}, {"_id": 0}
        )
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one(
                    {"user_id": session["user_id"]}, {"_id": 0}
                )
                if user:
                    return user

    # Check Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        # Try JWT first
        try:
            payload = decode_token(token)
            user = await db.users.find_one(
                {"user_id": payload["user_id"]}, {"_id": 0}
            )
            if user:
                return user
        except HTTPException:
            pass
        # Try session token
        session = await db.user_sessions.find_one(
            {"session_token": token}, {"_id": 0}
        )
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.users.find_one(
                    {"user_id": session["user_id"]}, {"_id": 0}
                )
                if user:
                    return user

    raise HTTPException(status_code=401, detail="Not authenticated")


def verify_google_oauth_token(id_token_str: str) -> Optional[Dict]:
    """
    Verify Google OAuth ID token and extract user info.

    Args:
        id_token_str: ID token from Google OAuth response

    Returns:
        User info dict with email, name, picture, or None if verification fails
    """
    if not GOOGLE_OAUTH_CLIENT_ID:
        raise ValueError("GOOGLE_OAUTH_CLIENT_ID not configured")

    try:
        idinfo = id_token.verify_oauth2_token(
            id_token_str, requests.Request(), GOOGLE_OAUTH_CLIENT_ID
        )

        if idinfo["iss"] not in [
            "accounts.google.com",
            "https://accounts.google.com",
        ]:
            raise ValueError("Invalid token issuer")

        return {
            "email": idinfo["email"],
            "name": idinfo.get("name", idinfo["email"].split("@")[0]),
            "picture": idinfo.get("picture"),
            "verified_email": idinfo.get("email_verified", False),
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid OAuth token: {str(e)}")


async def create_or_update_user(db, email: str, name: str, picture: Optional[str] = None, role: str = "victim") -> dict:
    """Create new user or update existing user."""
    existing = await db.users.find_one({"email": email}, {"_id": 0})

    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}},
        )
        return {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": existing.get("role", role),
            "picture": picture,
            "created_at": existing["created_at"],
        }
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        created_at = datetime.now(timezone.utc).isoformat()
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "picture": picture,
            "created_at": created_at,
        })
        return {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "picture": picture,
            "created_at": created_at,
        }


async def create_session(db, user_id: str, expiry_days: int = 7) -> str:
    """Create a session for user and return session token."""
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = (datetime.now(timezone.utc) + timedelta(days=expiry_days)).isoformat()

    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return session_token
