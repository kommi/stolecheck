from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid


# --- Auth Models ---
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "victim"  # victim, buyer, law_enforcement, admin

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    role: str
    picture: Optional[str] = None
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse


# --- Stolen Item Models ---
class StolenItemCreate(BaseModel):
    category: str  # jewellery, vehicle, electronics, other
    title: str
    description: str
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    distinguishing_marks: Optional[str] = None
    estimated_value: Optional[float] = None
    purchase_date: Optional[str] = None
    unique_identifiers: Optional[dict] = None  # {hallmark_id, vin, imei, serial_number, chassis_number}
    fir_number: Optional[str] = None
    theft_date: Optional[str] = None
    theft_location: Optional[str] = None
    images: Optional[List[str]] = None  # base64 encoded images

class StolenItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str
    scid: str  # StoleCheck ID
    user_id: str
    category: str
    title: str
    description: str
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    distinguishing_marks: Optional[str] = None
    estimated_value: Optional[float] = None
    purchase_date: Optional[str] = None
    unique_identifiers: Optional[dict] = None
    fir_number: Optional[str] = None
    theft_date: Optional[str] = None
    theft_location: Optional[str] = None
    images: Optional[List[str]] = None
    status: str = "active"  # active, recovered, closed
    created_at: str

class StolenItemUpdate(BaseModel):
    status: Optional[str] = None
    fir_number: Optional[str] = None
    description: Optional[str] = None


# --- Buyer Verification Models ---
class VerificationRequest(BaseModel):
    search_type: str  # photo, id_scan, text_search
    image_base64: Optional[str] = None
    identifier_type: Optional[str] = None  # imei, vin, hallmark, serial
    identifier_value: Optional[str] = None
    search_text: Optional[str] = None
    category: Optional[str] = None

class TPSResult(BaseModel):
    tps_score: int  # 0-100
    risk_level: str  # safe, suspicious, stolen
    visual_similarity: float = 0.0
    id_match_confidence: float = 0.0
    metadata_match: float = 0.0
    contextual_risk: float = 0.0
    matched_items: List[dict] = []
    ai_analysis: Optional[str] = None

class VerificationHistoryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    verification_id: str
    user_id: str
    search_type: str
    tps_score: int
    risk_level: str
    matched_items_count: int
    created_at: str


# --- Law Enforcement Models ---
class AlertResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    alert_id: str
    item_id: str
    scid: str
    item_title: str
    category: str
    tps_score: int
    risk_level: str
    scan_location: Optional[str] = None
    scanner_info: Optional[str] = None
    status: str = "new"  # new, investigating, resolved, dismissed
    created_at: str

class CaseCreate(BaseModel):
    alert_id: str
    assigned_officer: Optional[str] = None
    notes: Optional[str] = None

class CaseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    case_id: str
    alert_id: str
    item_id: str
    scid: str
    assigned_officer: Optional[str] = None
    status: str = "open"  # open, in_progress, closed
    notes: Optional[str] = None
    created_at: str
    updated_at: str


# --- Admin Models ---
class AdminStats(BaseModel):
    total_users: int
    total_items: int
    total_verifications: int
    total_alerts: int
    items_recovered: int
    active_cases: int
    users_by_role: dict
    items_by_category: dict
    recent_activity: List[dict]
