import os
import logging
import json
import base64
import asyncio
from io import BytesIO
from dotenv import load_dotenv
from PIL import Image
from google import genai
from google.genai import types

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set. AI features will be disabled.")

_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
MODEL = "gemini-2.0-flash"


def _parse_json(text: str) -> dict:
    """Strip markdown fences and parse JSON from model response."""
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0]
    elif "```" in text:
        text = text.split("```")[1].split("```")[0]
    return json.loads(text.strip())


def _b64_to_image(b64: str) -> Image.Image:
    """Decode base64 string (with or without data URI prefix) to PIL Image."""
    if b64.startswith("data:"):
        b64 = b64.split(",", 1)[1]
    return Image.open(BytesIO(base64.b64decode(b64)))


async def analyze_item_image(image_base64: str, context: str = "") -> dict:
    """Analyze an uploaded image using Gemini and return structured item details."""
    if not _client:
        return {"error": "GEMINI_API_KEY not configured", "description": "Analysis unavailable"}

    try:
        image = _b64_to_image(image_base64)

        prompt = (
            "You are an expert item identification system for StoleCheck, a stolen goods "
            "detection platform. Analyze the image and extract item details.\n\n"
            "Respond ONLY in JSON:\n"
            '{"category":"jewellery|vehicle|electronics|other","brand":null,"model":null,'
            '"color":"string","material":null,"distinguishing_marks":null,'
            '"visible_identifiers":null,"condition":"string",'
            '"key_features":["..."],"description":"brief description"}'
        )
        if context:
            prompt += f"\n\nContext: {context}"

        response = await asyncio.to_thread(
            _client.models.generate_content,
            model=MODEL,
            contents=[prompt, image],
        )

        try:
            return _parse_json(response.text)
        except (json.JSONDecodeError, ValueError):
            return {"description": response.text, "key_features": [], "category": "other"}

    except Exception as e:
        logger.error(f"Image analysis error: {e}")
        return {"error": str(e), "description": "Analysis failed", "key_features": []}


async def compare_images_real(scan_image_base64: str, stored_items: list) -> dict:
    """
    Compare a scanned image against stored stolen items using Gemini.
    Items with stored photos get real image-vs-image comparison;
    items without photos get image-vs-text-description comparison.
    """
    if not _client:
        return {
            "visual_similarity": 0.0,
            "matched_items": [],
            "ai_analysis": "AI comparison unavailable — GEMINI_API_KEY not configured",
        }

    if not stored_items:
        return {
            "visual_similarity": 0.0,
            "matched_items": [],
            "ai_analysis": "No items in database to compare against.",
        }

    items_with_images = [i for i in stored_items if i.get("images")]
    items_without_images = [i for i in stored_items if not i.get("images")]

    all_matched = []
    best_visual_sim = 0.0
    analysis_parts = []

    # Phase 1: real image-vs-image comparison
    for item in items_with_images[:5]:
        try:
            stored_b64 = item["images"][0]
            if isinstance(stored_b64, dict):
                stored_b64 = stored_b64.get("url", "")
            if not stored_b64:
                continue

            result = await _compare_two_images(scan_image_base64, stored_b64, item)
            if result["similarity"] > 0:
                best_visual_sim = max(best_visual_sim, result["similarity"] / 100.0)
                all_matched.append({
                    "scid": item.get("scid", ""),
                    "title": item.get("title", ""),
                    "category": item.get("category", ""),
                    "confidence": result["similarity"],
                    "reason": result["reason"],
                })
                analysis_parts.append(
                    f"[{item['scid']}] {item['title']}: {result['similarity']}% — {result['reason']}"
                )
        except Exception as e:
            logger.warning(f"Image comparison failed for {item.get('scid')}: {e}")

    # Phase 2: image-vs-text for items without photos
    if items_without_images:
        try:
            text_result = await _compare_image_vs_text_descriptions(
                scan_image_base64, items_without_images[:10]
            )
            for m in text_result.get("matched_items", []):
                sim = m.get("confidence", 0)
                if sim > 15:
                    best_visual_sim = max(best_visual_sim, sim / 100.0 * 0.6)
                    all_matched.append(m)
            if text_result.get("analysis"):
                analysis_parts.append(text_result["analysis"])
        except Exception as e:
            logger.warning(f"Text-based comparison failed: {e}")

    all_matched.sort(key=lambda x: x.get("confidence", 0), reverse=True)

    return {
        "visual_similarity": best_visual_sim,
        "matched_items": all_matched[:10],
        "ai_analysis": " | ".join(analysis_parts) or "Comparison complete. No strong matches found.",
    }


async def _compare_two_images(scan_b64: str, stored_b64: str, stored_item: dict) -> dict:
    """Compare two actual images using Gemini."""
    try:
        scan_img = _b64_to_image(scan_b64)
        stored_img = _b64_to_image(stored_b64)

        item_ctx = (
            f"Stored item: {stored_item.get('title','Unknown')} "
            f"({stored_item.get('category','')}) — "
            f"{stored_item.get('brand','')} {stored_item.get('model','')} "
            f"{stored_item.get('color','')}"
        )
        if stored_item.get("distinguishing_marks"):
            item_ctx += f" — Marks: {stored_item['distinguishing_marks']}"

        prompt = (
            "You are a forensic image comparison expert for StoleCheck.\n"
            "Image 1 = buyer's scan. Image 2 = stolen database photo.\n"
            "Compare carefully: same item? brand/model/color match? distinguishing marks?\n"
            f"{item_ctx}\n\n"
            "Respond ONLY in JSON:\n"
            '{"similarity":0-100,"is_same_item":true/false,"reason":"concise explanation",'
            '"matching_features":[],"differing_features":[]}'
        )

        response = await asyncio.to_thread(
            _client.models.generate_content,
            model=MODEL,
            contents=[prompt, scan_img, stored_img],
        )

        result = _parse_json(response.text)
        return {
            "similarity": min(max(int(result.get("similarity", 0)), 0), 100),
            "is_same_item": result.get("is_same_item", False),
            "reason": result.get("reason", ""),
            "matching_features": result.get("matching_features", []),
        }
    except Exception as e:
        logger.error(f"Two-image comparison error: {e}")
        return {"similarity": 0, "is_same_item": False, "reason": str(e)}


async def _compare_image_vs_text_descriptions(scan_b64: str, items: list) -> dict:
    """Fallback: match scan image against text descriptions for items without photos."""
    try:
        descriptions = []
        for item in items:
            d = (
                f"- SCID:{item.get('scid','N/A')} Title:{item.get('title','N/A')} "
                f"Cat:{item.get('category','N/A')} Brand:{item.get('brand','N/A')} "
                f"Color:{item.get('color','N/A')} Desc:{item.get('description','N/A')}"
            )
            if item.get("distinguishing_marks"):
                d += f" Marks:{item['distinguishing_marks']}"
            descriptions.append(d)

        prompt = (
            "You are a forensic item matching system.\n"
            "Compare the scanned image against these stolen item descriptions (no photos available):\n"
            + "\n".join(descriptions)
            + "\n\nRespond ONLY in JSON:\n"
            '{"matched_items":[{"scid":"...","title":"...","category":"...","confidence":0-100,"reason":"..."}],'
            '"analysis":"brief summary"}'
        )

        scan_img = _b64_to_image(scan_b64)
        response = await asyncio.to_thread(
            _client.models.generate_content,
            model=MODEL,
            contents=[prompt, scan_img],
        )

        try:
            return _parse_json(response.text)
        except (json.JSONDecodeError, ValueError):
            return {"matched_items": [], "analysis": response.text[:200]}

    except Exception as e:
        logger.error(f"Text comparison error: {e}")
        return {"matched_items": [], "analysis": f"Comparison failed: {e}"}


def calculate_tps(
    visual_sim: float,
    id_confidence: float,
    metadata_match: float,
    contextual_risk: float,
) -> dict:
    """Calculate Theft Probability Score (TPS). Weights: Visual 40%, ID 35%, Metadata 15%, Context 10%."""
    tps = int(
        (visual_sim * 40)
        + (id_confidence * 35)
        + (metadata_match * 15)
        + (contextual_risk * 10)
    )

    # Exact ID match (IMEI/VIN) overrides to at least 88
    if id_confidence >= 1.0:
        tps = max(tps, 88)

    tps = max(0, min(100, tps))

    if tps <= 30:
        risk_level = "safe"
    elif tps <= 70:
        risk_level = "suspicious"
    else:
        risk_level = "stolen"

    return {
        "tps_score": tps,
        "risk_level": risk_level,
        "visual_similarity": round(visual_sim, 2),
        "id_match_confidence": round(id_confidence, 2),
        "metadata_match": round(metadata_match, 2),
        "contextual_risk": round(contextual_risk, 2),
    }
