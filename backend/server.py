from fastapi import FastAPI, APIRouter, Request, HTTPException, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

from models import (
    UserCreate, UserLogin, UserResponse, TokenResponse,
    StolenItemCreate, StolenItemResponse, StolenItemUpdate,
    VerificationRequest, TPSResult, VerificationHistoryResponse,
    AlertResponse, CaseCreate, CaseResponse, AdminStats,
)
from auth import (
    hash_password, verify_password, create_token,
    get_current_user, exchange_session_id,
)
from ai_service import analyze_item_image, compare_images_real, calculate_tps

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="StoleCheck API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# =================== AUTH ROUTES ===================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    user_doc = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "password_hash": hash_password(data.password),
        "role": data.role,
        "picture": None,
        "created_at": now,
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_id, data.role)
    return TokenResponse(
        token=token,
        user=UserResponse(user_id=user_id, email=data.email, name=data.name, role=data.role, picture=None, created_at=now)
    )


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["user_id"], user["role"])
    return TokenResponse(
        token=token,
        user=UserResponse(
            user_id=user["user_id"], email=user["email"], name=user["name"],
            role=user["role"], picture=user.get("picture"), created_at=user["created_at"]
        )
    )


@api_router.post("/auth/google-session")
async def google_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    auth_data = await exchange_session_id(session_id)
    email = auth_data["email"]
    name = auth_data.get("name", email.split("@")[0])
    picture = auth_data.get("picture")
    session_token = auth_data.get("session_token", f"sess_{uuid.uuid4().hex}")

    # Find or create user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
        role = existing.get("role", "victim")
        created_at = existing["created_at"]
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        created_at = datetime.now(timezone.utc).isoformat()
        role = "victim"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "picture": picture,
            "created_at": created_at,
        })

    # Store session
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none",
        path="/", max_age=7 * 24 * 3600,
    )
    return {
        "user": {
            "user_id": user_id, "email": email, "name": name,
            "role": role, "picture": picture, "created_at": created_at,
        },
        "token": session_token,
    }


@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request, db)
    return UserResponse(
        user_id=user["user_id"], email=user["email"], name=user["name"],
        role=user.get("role", "victim"), picture=user.get("picture"),
        created_at=user.get("created_at", ""),
    )


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/", secure=True, samesite="none")
    return {"message": "Logged out"}


# =================== STOLEN ITEMS ROUTES ===================

@api_router.post("/items", response_model=StolenItemResponse, status_code=201)
async def create_stolen_item(data: StolenItemCreate, request: Request):
    user = await get_current_user(request, db)
    item_id = f"item_{uuid.uuid4().hex[:12]}"
    scid = f"SC-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc).isoformat()

    item_doc = {
        "item_id": item_id,
        "scid": scid,
        "user_id": user["user_id"],
        "category": data.category,
        "title": data.title,
        "description": data.description,
        "brand": data.brand,
        "model": data.model,
        "color": data.color,
        "distinguishing_marks": data.distinguishing_marks,
        "estimated_value": data.estimated_value,
        "purchase_date": data.purchase_date,
        "unique_identifiers": data.unique_identifiers or {},
        "fir_number": data.fir_number,
        "theft_date": data.theft_date,
        "theft_location": data.theft_location,
        "images": data.images or [],
        "status": "active",
        "created_at": now,
    }

    # If images provided, try AI analysis for enrichment
    if data.images and len(data.images) > 0:
        try:
            analysis = await analyze_item_image(data.images[0], f"Category: {data.category}, Title: {data.title}")
            if analysis and not analysis.get("error"):
                if not data.brand and analysis.get("brand"):
                    item_doc["brand"] = analysis["brand"]
                if not data.color and analysis.get("color"):
                    item_doc["color"] = analysis["color"]
                item_doc["ai_analysis"] = analysis
        except Exception as e:
            logger.warning(f"AI analysis failed: {e}")

    await db.stolen_items.insert_one(item_doc)

    # Create activity log
    await db.activity_log.insert_one({
        "activity_id": f"act_{uuid.uuid4().hex[:12]}",
        "type": "item_registered",
        "user_id": user["user_id"],
        "item_id": item_id,
        "scid": scid,
        "description": f"New stolen item registered: {data.title}",
        "created_at": now,
    })

    return StolenItemResponse(**{k: v for k, v in item_doc.items() if k != "ai_analysis" and k != "password_hash"})


@api_router.get("/items")
async def get_stolen_items(request: Request, category: Optional[str] = None, status: Optional[str] = None):
    user = await get_current_user(request, db)
    query = {"user_id": user["user_id"]}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    items = await db.stolen_items.find(query, {"_id": 0, "ai_analysis": 0}).sort("created_at", -1).to_list(100)
    return items


@api_router.get("/items/{item_id}")
async def get_item(item_id: str, request: Request):
    await get_current_user(request, db)
    item = await db.stolen_items.find_one({"item_id": item_id}, {"_id": 0, "ai_analysis": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@api_router.patch("/items/{item_id}")
async def update_item(item_id: str, data: StolenItemUpdate, request: Request):
    user = await get_current_user(request, db)
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.stolen_items.update_one(
        {"item_id": item_id, "user_id": user["user_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item = await db.stolen_items.find_one({"item_id": item_id}, {"_id": 0, "ai_analysis": 0})
    return item


@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, request: Request):
    user = await get_current_user(request, db)
    result = await db.stolen_items.delete_one({"item_id": item_id, "user_id": user["user_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted"}


# =================== BUYER VERIFICATION ROUTES ===================

@api_router.post("/verify", response_model=TPSResult)
async def verify_item(data: VerificationRequest, request: Request):
    user = await get_current_user(request, db)
    
    visual_sim = 0.0
    id_confidence = 0.0
    metadata_match = 0.0
    contextual_risk = 0.0
    matched_items = []
    ai_analysis = ""

    if data.search_type == "photo" and data.image_base64:
        # Photo-based scan - use AI with REAL image comparison
        query = {}
        if data.category:
            query["category"] = data.category
        query["status"] = "active"
        # IMPORTANT: Include images for real visual comparison
        stored_items = await db.stolen_items.find(query, {"_id": 0}).sort("created_at", -1).to_list(50)
        
        if stored_items:
            result = await compare_images_real(data.image_base64, stored_items)
            visual_sim = result.get("visual_similarity", 0.0)
            ai_analysis = result.get("ai_analysis", "")
            for m in result.get("matched_items", []):
                # Enrich matched item with full details from DB
                scid = m.get("scid", "")
                stored = next((i for i in stored_items if i.get("scid") == scid), None)
                match_entry = {
                    "scid": scid,
                    "confidence": m.get("confidence", 0),
                    "reason": m.get("reason", ""),
                }
                if stored:
                    match_entry["title"] = stored.get("title", "")
                    match_entry["category"] = stored.get("category", "")
                    match_entry["brand"] = stored.get("brand", "")
                    match_entry["model"] = stored.get("model", "")
                    match_entry["color"] = stored.get("color", "")
                    match_entry["description"] = stored.get("description", "")
                    match_entry["distinguishing_marks"] = stored.get("distinguishing_marks", "")
                    match_entry["estimated_value"] = stored.get("estimated_value")
                    match_entry["theft_location"] = stored.get("theft_location", "")
                    match_entry["theft_date"] = stored.get("theft_date", "")
                    match_entry["fir_number"] = stored.get("fir_number", "")
                    # Include first image for side-by-side comparison
                    if stored.get("images") and len(stored["images"]) > 0:
                        match_entry["image"] = stored["images"][0]
                matched_items.append(match_entry)
                if m.get("confidence", 0) > 50:
                    metadata_match = max(metadata_match, m["confidence"] / 100.0)

    elif data.search_type == "id_scan" and data.identifier_value:
        # ID-based scan
        id_type = data.identifier_type or "serial_number"
        id_val = data.identifier_value.strip().upper()
        
        # Search in unique_identifiers field
        items = await db.stolen_items.find(
            {"status": "active"},
            {"_id": 0}
        ).to_list(1000)
        
        for item in items:
            ids = item.get("unique_identifiers", {})
            for key, val in ids.items():
                if val and id_val in str(val).upper():
                    is_exact = id_val == str(val).upper()
                    confidence = 100 if is_exact else 70
                    id_confidence = max(id_confidence, confidence / 100.0)
                    # Exact ID match is strong evidence - boost metadata and contextual scores
                    if is_exact:
                        metadata_match = max(metadata_match, 0.8)
                        contextual_risk = max(contextual_risk, 0.9)
                    else:
                        metadata_match = max(metadata_match, 0.4)
                    match_entry = {
                        "scid": item.get("scid", ""),
                        "title": item.get("title", ""),
                        "category": item.get("category", ""),
                        "brand": item.get("brand", ""),
                        "model": item.get("model", ""),
                        "color": item.get("color", ""),
                        "description": item.get("description", ""),
                        "distinguishing_marks": item.get("distinguishing_marks", ""),
                        "estimated_value": item.get("estimated_value"),
                        "theft_location": item.get("theft_location", ""),
                        "theft_date": item.get("theft_date", ""),
                        "fir_number": item.get("fir_number", ""),
                        "confidence": confidence,
                        "reason": f"{'Exact' if is_exact else 'Partial'} ID match on {key}: {val}",
                    }
                    if item.get("images") and len(item["images"]) > 0:
                        match_entry["image"] = item["images"][0]
                    matched_items.append(match_entry)
        
        ai_analysis = f"ID scan completed. Searched for {id_type}: {id_val}"

    elif data.search_type == "text_search" and data.search_text:
        # Text-based search
        search = data.search_text.lower()
        query = {"status": "active"}
        if data.category:
            query["category"] = data.category
        
        items = await db.stolen_items.find(query, {"_id": 0}).to_list(1000)
        
        for item in items:
            score = 0
            searchable = f"{item.get('title', '')} {item.get('description', '')} {item.get('brand', '')} {item.get('model', '')} {item.get('color', '')}".lower()
            words = search.split()
            matched_words = sum(1 for w in words if w in searchable)
            if matched_words > 0:
                score = int((matched_words / len(words)) * 100)
                metadata_match = max(metadata_match, score / 100.0)
                match_entry = {
                    "scid": item.get("scid", ""),
                    "title": item.get("title", ""),
                    "category": item.get("category", ""),
                    "brand": item.get("brand", ""),
                    "model": item.get("model", ""),
                    "color": item.get("color", ""),
                    "description": item.get("description", ""),
                    "distinguishing_marks": item.get("distinguishing_marks", ""),
                    "estimated_value": item.get("estimated_value"),
                    "theft_location": item.get("theft_location", ""),
                    "theft_date": item.get("theft_date", ""),
                    "fir_number": item.get("fir_number", ""),
                    "confidence": score,
                    "reason": f"Text match: {matched_words}/{len(words)} keywords matched",
                }
                if item.get("images") and len(item["images"]) > 0:
                    match_entry["image"] = item["images"][0]
                matched_items.append(match_entry)
        
        matched_items.sort(key=lambda x: x["confidence"], reverse=True)
        matched_items = matched_items[:10]
        ai_analysis = f"Text search completed for: {data.search_text}"

    # Calculate contextual risk (only boost, don't reduce previously set values)
    if matched_items:
        general_risk = min(0.5, len(matched_items) * 0.1)
        contextual_risk = max(contextual_risk, general_risk)

    tps = calculate_tps(visual_sim, id_confidence, metadata_match, contextual_risk)
    tps["matched_items"] = matched_items
    tps["ai_analysis"] = ai_analysis

    # Save verification history
    verification_id = f"ver_{uuid.uuid4().hex[:12]}"
    await db.verifications.insert_one({
        "verification_id": verification_id,
        "user_id": user["user_id"],
        "search_type": data.search_type,
        "tps_score": tps["tps_score"],
        "risk_level": tps["risk_level"],
        "matched_items_count": len(matched_items),
        "matched_items": matched_items,
        "ai_analysis": ai_analysis,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # Create alert if high risk
    if tps["tps_score"] > 70 and matched_items:
        for m_item in matched_items[:3]:
            stored = await db.stolen_items.find_one({"scid": m_item.get("scid")}, {"_id": 0})
            if stored:
                await db.alerts.insert_one({
                    "alert_id": f"alert_{uuid.uuid4().hex[:12]}",
                    "item_id": stored.get("item_id", ""),
                    "scid": m_item.get("scid", ""),
                    "item_title": stored.get("title", ""),
                    "category": stored.get("category", ""),
                    "tps_score": tps["tps_score"],
                    "risk_level": tps["risk_level"],
                    "scan_location": "Online Scan",
                    "scanner_info": f"User: {user['user_id']}",
                    "status": "new",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })

    # Activity log
    await db.activity_log.insert_one({
        "activity_id": f"act_{uuid.uuid4().hex[:12]}",
        "type": "verification",
        "user_id": user["user_id"],
        "description": f"Verification scan ({data.search_type}): TPS={tps['tps_score']}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return TPSResult(**tps)


@api_router.get("/verify/history")
async def get_verification_history(request: Request):
    user = await get_current_user(request, db)
    history = await db.verifications.find(
        {"user_id": user["user_id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return history


# =================== LAW ENFORCEMENT ROUTES ===================

@api_router.get("/law/alerts")
async def get_alerts(request: Request, status: Optional[str] = None):
    user = await get_current_user(request, db)
    if user.get("role") not in ["law_enforcement", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if status:
        query["status"] = status
    alerts = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return alerts


@api_router.patch("/law/alerts/{alert_id}")
async def update_alert(alert_id: str, request: Request):
    user = await get_current_user(request, db)
    if user.get("role") not in ["law_enforcement", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    body = await request.json()
    status = body.get("status")
    if status:
        await db.alerts.update_one({"alert_id": alert_id}, {"$set": {"status": status}})
    alert = await db.alerts.find_one({"alert_id": alert_id}, {"_id": 0})
    return alert


@api_router.post("/law/cases")
async def create_case(data: CaseCreate, request: Request):
    user = await get_current_user(request, db)
    if user.get("role") not in ["law_enforcement", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    alert = await db.alerts.find_one({"alert_id": data.alert_id}, {"_id": 0})
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    case_id = f"case_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    case_doc = {
        "case_id": case_id,
        "alert_id": data.alert_id,
        "item_id": alert.get("item_id", ""),
        "scid": alert.get("scid", ""),
        "assigned_officer": data.assigned_officer or user["name"],
        "status": "open",
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    await db.cases.insert_one(case_doc)
    await db.alerts.update_one({"alert_id": data.alert_id}, {"$set": {"status": "investigating"}})
    return case_doc


@api_router.get("/law/cases")
async def get_cases(request: Request, status: Optional[str] = None):
    user = await get_current_user(request, db)
    if user.get("role") not in ["law_enforcement", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = {}
    if status:
        query["status"] = status
    cases = await db.cases.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return cases


@api_router.patch("/law/cases/{case_id}")
async def update_case(case_id: str, request: Request):
    user = await get_current_user(request, db)
    if user.get("role") not in ["law_enforcement", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    body = await request.json()
    update = {}
    if body.get("status"):
        update["status"] = body["status"]
    if body.get("notes"):
        update["notes"] = body["notes"]
    if body.get("assigned_officer"):
        update["assigned_officer"] = body["assigned_officer"]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.cases.update_one({"case_id": case_id}, {"$set": update})
    case = await db.cases.find_one({"case_id": case_id}, {"_id": 0})
    return case


@api_router.get("/law/stats")
async def get_law_stats(request: Request):
    user = await get_current_user(request, db)
    if user.get("role") not in ["law_enforcement", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    total_alerts = await db.alerts.count_documents({})
    new_alerts = await db.alerts.count_documents({"status": "new"})
    investigating = await db.alerts.count_documents({"status": "investigating"})
    resolved = await db.alerts.count_documents({"status": "resolved"})
    total_cases = await db.cases.count_documents({})
    open_cases = await db.cases.count_documents({"status": "open"})
    total_items = await db.stolen_items.count_documents({})
    recovered = await db.stolen_items.count_documents({"status": "recovered"})

    return {
        "total_alerts": total_alerts,
        "new_alerts": new_alerts,
        "investigating": investigating,
        "resolved": resolved,
        "total_cases": total_cases,
        "open_cases": open_cases,
        "total_items": total_items,
        "recovered": recovered,
    }


# =================== ALL ITEMS (for law enforcement) ===================

@api_router.get("/law/items")
async def get_all_items(request: Request, category: Optional[str] = None, status: Optional[str] = None):
    user = await get_current_user(request, db)
    if user.get("role") not in ["law_enforcement", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    query = {}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    # Include images in list view (police need to see them)
    items = await db.stolen_items.find(query, {"_id": 0, "ai_analysis": 0}).sort("created_at", -1).to_list(200)
    return items


@api_router.get("/law/items/{item_id}")
async def get_item_for_law(item_id: str, request: Request):
    """Get full item details including images - for law enforcement."""
    user = await get_current_user(request, db)
    if user.get("role") not in ["law_enforcement", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    item = await db.stolen_items.find_one({"item_id": item_id}, {"_id": 0})
    if not item:
        # Also try by SCID
        item = await db.stolen_items.find_one({"scid": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    # Also get the reporter's info (masked for privacy)
    reporter = await db.users.find_one({"user_id": item.get("user_id")}, {"_id": 0, "password_hash": 0})
    item["reporter_name"] = reporter.get("name", "Unknown") if reporter else "Unknown"
    item["reporter_email"] = reporter.get("email", "") if reporter else ""
    return item


# =================== ADMIN ROUTES ===================

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    user = await get_current_user(request, db)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_users = await db.users.count_documents({})
    total_items = await db.stolen_items.count_documents({})
    total_verifications = await db.verifications.count_documents({})
    total_alerts = await db.alerts.count_documents({})
    items_recovered = await db.stolen_items.count_documents({"status": "recovered"})
    active_cases = await db.cases.count_documents({"status": {"$in": ["open", "in_progress"]}})

    # Users by role
    roles = {}
    for role in ["victim", "buyer", "law_enforcement", "admin"]:
        roles[role] = await db.users.count_documents({"role": role})

    # Items by category
    categories = {}
    for cat in ["jewellery", "vehicle", "electronics", "other"]:
        categories[cat] = await db.stolen_items.count_documents({"category": cat})

    # Recent activity
    activity = await db.activity_log.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)

    return AdminStats(
        total_users=total_users,
        total_items=total_items,
        total_verifications=total_verifications,
        total_alerts=total_alerts,
        items_recovered=items_recovered,
        active_cases=active_cases,
        users_by_role=roles,
        items_by_category=categories,
        recent_activity=activity,
    )


@api_router.get("/admin/users")
async def get_all_users(request: Request):
    user = await get_current_user(request, db)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(200)
    return users


@api_router.patch("/admin/users/{user_id}/role")
async def update_user_role(user_id: str, request: Request):
    user = await get_current_user(request, db)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    body = await request.json()
    new_role = body.get("role")
    if new_role not in ["victim", "buyer", "law_enforcement", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": new_role}})
    return {"message": "Role updated"}


# =================== PUBLIC ROUTES ===================

@api_router.get("/")
async def root():
    return {"message": "StoleCheck API v1.0", "status": "operational"}


@api_router.get("/public/stats")
async def public_stats():
    total_items = await db.stolen_items.count_documents({})
    recovered = await db.stolen_items.count_documents({"status": "recovered"})
    total_verifications = await db.verifications.count_documents({})
    total_users = await db.users.count_documents({})
    return {
        "total_items_registered": total_items,
        "items_recovered": recovered,
        "total_verifications": total_verifications,
        "registered_users": total_users,
    }


# =================== SETUP ===================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
