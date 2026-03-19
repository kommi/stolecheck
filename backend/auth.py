import os
import jwt
import bcrypt
import uuid
import aiohttp
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRY_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(request: Request, db) -> dict:
    # Check cookie first
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


async def exchange_session_id(session_id: str) -> dict:
    """Exchange Emergent Auth session_id for user data."""
    url = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers={"X-Session-ID": session_id}) as resp:
            if resp.status != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            return await resp.json()
