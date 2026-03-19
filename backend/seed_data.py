"""Seed script for StoleCheck demo data."""
import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']


def hash_pw(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


async def seed():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Clear existing data
    for col in ["users", "stolen_items", "verifications", "alerts", "cases", "activity_log", "user_sessions"]:
        await db[col].delete_many({})

    now = datetime.now(timezone.utc)

    # ---- Users ----
    users = [
        {"user_id": "user_admin001", "email": "admin@stolecheck.in", "name": "Rajesh Kumar", "role": "admin", "password_hash": hash_pw("admin123"), "picture": None, "created_at": (now - timedelta(days=90)).isoformat()},
        {"user_id": "user_victim001", "email": "priya@example.com", "name": "Priya Sharma", "role": "victim", "password_hash": hash_pw("pass123"), "picture": None, "created_at": (now - timedelta(days=60)).isoformat()},
        {"user_id": "user_victim002", "email": "amit@example.com", "name": "Amit Patel", "role": "victim", "password_hash": hash_pw("pass123"), "picture": None, "created_at": (now - timedelta(days=45)).isoformat()},
        {"user_id": "user_buyer001", "email": "ravi@example.com", "name": "Ravi Verma", "role": "buyer", "password_hash": hash_pw("pass123"), "picture": None, "created_at": (now - timedelta(days=30)).isoformat()},
        {"user_id": "user_buyer002", "email": "sneha@example.com", "name": "Sneha Reddy", "role": "buyer", "password_hash": hash_pw("pass123"), "picture": None, "created_at": (now - timedelta(days=20)).isoformat()},
        {"user_id": "user_leo001", "email": "inspector@police.gov.in", "name": "Inspector Mehra", "role": "law_enforcement", "password_hash": hash_pw("pass123"), "picture": None, "created_at": (now - timedelta(days=80)).isoformat()},
        {"user_id": "user_leo002", "email": "si.singh@police.gov.in", "name": "SI Harpreet Singh", "role": "law_enforcement", "password_hash": hash_pw("pass123"), "picture": None, "created_at": (now - timedelta(days=70)).isoformat()},
    ]
    await db.users.insert_many(users)
    print(f"  Seeded {len(users)} users")

    # ---- Stolen Items ----
    items = [
        {
            "item_id": "item_gold001", "scid": "SC-GOLD0001", "user_id": "user_victim001",
            "category": "jewellery", "title": "22K Gold Necklace with Ruby Pendant",
            "description": "Traditional Indian 22 karat gold necklace with a large oval ruby pendant, approximately 45 grams, intricate temple design work",
            "brand": "Tanishq", "model": "Temple Collection 2024", "color": "Gold",
            "distinguishing_marks": "Small scratch near the clasp, hallmark BIS 916 engraved on back of pendant",
            "estimated_value": 350000, "purchase_date": "2024-06-15",
            "unique_identifiers": {"hallmark_id": "BIS916-HYD-2024-78432"},
            "fir_number": "FIR/2025/HYD/8834", "theft_date": "2025-11-20",
            "theft_location": "Hyderabad, Banjara Hills",
            "images": [], "status": "active",
            "created_at": (now - timedelta(days=55)).isoformat(),
        },
        {
            "item_id": "item_car001", "scid": "SC-VEH00001", "user_id": "user_victim001",
            "category": "vehicle", "title": "Honda City 2023 ZX CVT Petrol",
            "description": "Silver Honda City sedan, 2023 model ZX CVT variant, petrol, 15-inch diamond cut alloy wheels, sunroof equipped, driven 18,000 km",
            "brand": "Honda", "model": "City ZX CVT 2023", "color": "Platinum White Pearl",
            "distinguishing_marks": "Small dent on rear left bumper, aftermarket dashcam installed",
            "estimated_value": 1250000, "purchase_date": "2023-03-10",
            "unique_identifiers": {"vin": "MAHCM5648P0012345", "registration": "TS09-FA-7721"},
            "fir_number": "FIR/2025/HYD/9012", "theft_date": "2025-12-01",
            "theft_location": "Hyderabad, Madhapur",
            "images": [], "status": "active",
            "created_at": (now - timedelta(days=40)).isoformat(),
        },
        {
            "item_id": "item_phone001", "scid": "SC-ELEC0001", "user_id": "user_victim002",
            "category": "electronics", "title": "iPhone 16 Pro Max 256GB",
            "description": "Apple iPhone 16 Pro Max, Natural Titanium color, 256GB storage, with original case and screen protector",
            "brand": "Apple", "model": "iPhone 16 Pro Max", "color": "Natural Titanium",
            "distinguishing_marks": "Cracked corner of screen protector (bottom left), custom engraving 'AP' on back",
            "estimated_value": 144900, "purchase_date": "2025-01-05",
            "unique_identifiers": {"imei": "354876110987654", "serial_number": "DNQVK0A1HG"},
            "fir_number": "FIR/2025/MUM/4421", "theft_date": "2025-10-15",
            "theft_location": "Mumbai, Andheri West",
            "images": [], "status": "active",
            "created_at": (now - timedelta(days=30)).isoformat(),
        },
        {
            "item_id": "item_laptop001", "scid": "SC-ELEC0002", "user_id": "user_victim002",
            "category": "electronics", "title": "MacBook Pro 16-inch M3 Max",
            "description": "Apple MacBook Pro 16-inch with M3 Max chip, 36GB RAM, 1TB SSD, Space Black. Has stickers on lid.",
            "brand": "Apple", "model": "MacBook Pro 16 M3 Max", "color": "Space Black",
            "distinguishing_marks": "Developer conference sticker on lid, slight scuff on bottom right corner",
            "estimated_value": 349900, "purchase_date": "2024-08-20",
            "unique_identifiers": {"serial_number": "C02ZT3ABCD1F"},
            "fir_number": None, "theft_date": "2025-11-05",
            "theft_location": "Bangalore, Koramangala",
            "images": [], "status": "active",
            "created_at": (now - timedelta(days=25)).isoformat(),
        },
        {
            "item_id": "item_gold002", "scid": "SC-GOLD0002", "user_id": "user_victim001",
            "category": "jewellery", "title": "Diamond Engagement Ring 1.5 Carat",
            "description": "Platinum diamond solitaire engagement ring, 1.5 carat round brilliant cut diamond, VS1 clarity, F color grade, GIA certified",
            "brand": "CaratLane", "model": "Classic Solitaire", "color": "Platinum/Diamond",
            "distinguishing_marks": "GIA inscription on girdle of diamond, ring size 6",
            "estimated_value": 800000, "purchase_date": "2023-12-25",
            "unique_identifiers": {"hallmark_id": "PT950-DEL-2023-11234", "gia_number": "GIA-7281946532"},
            "fir_number": "FIR/2025/DEL/2201", "theft_date": "2025-09-10",
            "theft_location": "Delhi, Connaught Place",
            "images": [], "status": "active",
            "created_at": (now - timedelta(days=50)).isoformat(),
        },
        {
            "item_id": "item_bike001", "scid": "SC-VEH00002", "user_id": "user_victim002",
            "category": "vehicle", "title": "Royal Enfield Classic 350 Reborn",
            "description": "Royal Enfield Classic 350 Reborn in Halcyon Black, 2024 model, with aftermarket exhaust and touring accessories",
            "brand": "Royal Enfield", "model": "Classic 350 Reborn 2024", "color": "Halcyon Black",
            "distinguishing_marks": "Custom leather saddle bags, aftermarket RedRooster exhaust, small dent on fuel tank right side",
            "estimated_value": 215000, "purchase_date": "2024-04-01",
            "unique_identifiers": {"vin": "ME1RE3E88P0034567", "registration": "KA01-MN-4456"},
            "fir_number": "FIR/2025/BLR/6677", "theft_date": "2025-12-10",
            "theft_location": "Bangalore, Indiranagar",
            "images": [], "status": "active",
            "created_at": (now - timedelta(days=15)).isoformat(),
        },
        {
            "item_id": "item_watch001", "scid": "SC-OTH00001", "user_id": "user_victim001",
            "category": "other", "title": "Rolex Submariner Date 41mm",
            "description": "Rolex Submariner Date in Oystersteel with black dial and Cerachrom bezel insert, 41mm case",
            "brand": "Rolex", "model": "Submariner Date 126610LN", "color": "Steel/Black",
            "distinguishing_marks": "Tiny scratch on bracelet link 3rd from clasp, comes with original box and papers",
            "estimated_value": 1100000, "purchase_date": "2022-09-15",
            "unique_identifiers": {"serial_number": "3YK88291"},
            "fir_number": "FIR/2025/CHN/1133", "theft_date": "2025-08-22",
            "theft_location": "Chennai, T. Nagar",
            "images": [], "status": "recovered",
            "created_at": (now - timedelta(days=80)).isoformat(),
        },
        {
            "item_id": "item_camera001", "scid": "SC-ELEC0003", "user_id": "user_victim002",
            "category": "electronics", "title": "Sony A7 IV Full Frame Camera",
            "description": "Sony Alpha A7 IV mirrorless camera body with 28-70mm kit lens, 33MP full frame sensor",
            "brand": "Sony", "model": "A7 IV ILCE-7M4", "color": "Black",
            "distinguishing_marks": "Peak Design strap attached, small nick on bottom plate from tripod mount",
            "estimated_value": 198000, "purchase_date": "2024-02-14",
            "unique_identifiers": {"serial_number": "SN-7851234"},
            "fir_number": None, "theft_date": "2025-11-28",
            "theft_location": "Mumbai, Bandra",
            "images": [], "status": "active",
            "created_at": (now - timedelta(days=10)).isoformat(),
        },
    ]
    await db.stolen_items.insert_many(items)
    print(f"  Seeded {len(items)} stolen items")

    # ---- Alerts ----
    alerts = [
        {
            "alert_id": "alert_001", "item_id": "item_gold001", "scid": "SC-GOLD0001",
            "item_title": "22K Gold Necklace with Ruby Pendant", "category": "jewellery",
            "tps_score": 85, "risk_level": "stolen",
            "scan_location": "Hyderabad, Charminar Market",
            "scanner_info": "User: user_buyer001",
            "status": "investigating",
            "created_at": (now - timedelta(days=10)).isoformat(),
        },
        {
            "alert_id": "alert_002", "item_id": "item_phone001", "scid": "SC-ELEC0001",
            "item_title": "iPhone 16 Pro Max 256GB", "category": "electronics",
            "tps_score": 92, "risk_level": "stolen",
            "scan_location": "Mumbai, Chor Bazaar",
            "scanner_info": "User: user_buyer002",
            "status": "new",
            "created_at": (now - timedelta(days=5)).isoformat(),
        },
        {
            "alert_id": "alert_003", "item_id": "item_car001", "scid": "SC-VEH00001",
            "item_title": "Honda City 2023 ZX CVT Petrol", "category": "vehicle",
            "tps_score": 78, "risk_level": "stolen",
            "scan_location": "Hyderabad, Attapur",
            "scanner_info": "User: user_buyer001",
            "status": "new",
            "created_at": (now - timedelta(days=3)).isoformat(),
        },
        {
            "alert_id": "alert_004", "item_id": "item_laptop001", "scid": "SC-ELEC0002",
            "item_title": "MacBook Pro 16-inch M3 Max", "category": "electronics",
            "tps_score": 65, "risk_level": "suspicious",
            "scan_location": "Bangalore, SP Road",
            "scanner_info": "User: user_buyer002",
            "status": "resolved",
            "created_at": (now - timedelta(days=8)).isoformat(),
        },
    ]
    await db.alerts.insert_many(alerts)
    print(f"  Seeded {len(alerts)} alerts")

    # ---- Cases ----
    cases = [
        {
            "case_id": "case_001", "alert_id": "alert_001",
            "item_id": "item_gold001", "scid": "SC-GOLD0001",
            "assigned_officer": "Inspector Mehra",
            "status": "in_progress",
            "notes": "Suspect identified at Charminar market. Coordinating with local jewellers for verification.",
            "created_at": (now - timedelta(days=9)).isoformat(),
            "updated_at": (now - timedelta(days=2)).isoformat(),
        },
        {
            "case_id": "case_002", "alert_id": "alert_004",
            "item_id": "item_laptop001", "scid": "SC-ELEC0002",
            "assigned_officer": "SI Harpreet Singh",
            "status": "closed",
            "notes": "Item verified as legitimate resale. Seller had original purchase receipt. Alert dismissed.",
            "created_at": (now - timedelta(days=7)).isoformat(),
            "updated_at": (now - timedelta(days=4)).isoformat(),
        },
    ]
    await db.cases.insert_many(cases)
    print(f"  Seeded {len(cases)} cases")

    # ---- Verifications ----
    verifications = [
        {
            "verification_id": "ver_001", "user_id": "user_buyer001",
            "search_type": "text_search", "tps_score": 85, "risk_level": "stolen",
            "matched_items_count": 1, "matched_items": [{"scid": "SC-GOLD0001", "confidence": 85}],
            "ai_analysis": "Text match on gold necklace description",
            "created_at": (now - timedelta(days=10)).isoformat(),
        },
        {
            "verification_id": "ver_002", "user_id": "user_buyer002",
            "search_type": "id_scan", "tps_score": 92, "risk_level": "stolen",
            "matched_items_count": 1, "matched_items": [{"scid": "SC-ELEC0001", "confidence": 100}],
            "ai_analysis": "Exact IMEI match found",
            "created_at": (now - timedelta(days=5)).isoformat(),
        },
        {
            "verification_id": "ver_003", "user_id": "user_buyer001",
            "search_type": "text_search", "tps_score": 15, "risk_level": "safe",
            "matched_items_count": 0, "matched_items": [],
            "ai_analysis": "No matches found",
            "created_at": (now - timedelta(days=12)).isoformat(),
        },
        {
            "verification_id": "ver_004", "user_id": "user_buyer002",
            "search_type": "photo", "tps_score": 45, "risk_level": "suspicious",
            "matched_items_count": 1, "matched_items": [{"scid": "SC-ELEC0002", "confidence": 45}],
            "ai_analysis": "Partial visual match",
            "created_at": (now - timedelta(days=8)).isoformat(),
        },
    ]
    await db.verifications.insert_many(verifications)
    print(f"  Seeded {len(verifications)} verifications")

    # ---- Activity Log ----
    activities = [
        {"activity_id": "act_001", "type": "item_registered", "user_id": "user_victim001", "item_id": "item_gold001", "scid": "SC-GOLD0001", "description": "Stolen gold necklace registered", "created_at": (now - timedelta(days=55)).isoformat()},
        {"activity_id": "act_002", "type": "item_registered", "user_id": "user_victim001", "item_id": "item_car001", "scid": "SC-VEH00001", "description": "Stolen Honda City registered", "created_at": (now - timedelta(days=40)).isoformat()},
        {"activity_id": "act_003", "type": "verification", "user_id": "user_buyer001", "description": "Verification scan (text_search): TPS=85", "created_at": (now - timedelta(days=10)).isoformat()},
        {"activity_id": "act_004", "type": "verification", "user_id": "user_buyer002", "description": "Verification scan (id_scan): TPS=92", "created_at": (now - timedelta(days=5)).isoformat()},
        {"activity_id": "act_005", "type": "item_registered", "user_id": "user_victim002", "item_id": "item_phone001", "scid": "SC-ELEC0001", "description": "Stolen iPhone 16 Pro Max registered", "created_at": (now - timedelta(days=30)).isoformat()},
        {"activity_id": "act_006", "type": "case_created", "user_id": "user_leo001", "description": "Case opened for gold necklace alert", "created_at": (now - timedelta(days=9)).isoformat()},
    ]
    await db.activity_log.insert_many(activities)
    print(f"  Seeded {len(activities)} activity logs")

    print("\nSeed complete! Demo credentials:")
    print("  Admin:           admin@stolecheck.in / admin123")
    print("  Victim (Priya):  priya@example.com / pass123")
    print("  Victim (Amit):   amit@example.com / pass123")
    print("  Buyer (Ravi):    ravi@example.com / pass123")
    print("  Buyer (Sneha):   sneha@example.com / pass123")
    print("  Law Enforcement: inspector@police.gov.in / pass123")
    print("  Law Enforcement: si.singh@police.gov.in / pass123")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
