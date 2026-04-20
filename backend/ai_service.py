import os
import logging
import json
import base64
import asyncio
from io import BytesIO
from typing import Optional, List
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image

load_dotenv()

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set. AI features will be disabled.")

genai.configure(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None


async def analyze_item_image(image_base64: str, context: str = "") -> dict:
    """Analyze an uploaded image using Gemini to extract item details."""
    if not GEMINI_API_KEY:
        return {"error": "GEMINI_API_KEY not configured", "description": "Analysis unavailable"}

    try:
        image_bytes = base64.b64decode(image_base64)
        image = Image.open(BytesIO(image_bytes))

        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = """You are an expert item identification and analysis system for StoleCheck,
a stolen goods detection platform. Analyze the provided image and extract:
1. Item category (jewellery, vehicle, electronics, other)
2. Brand/make if identifiable
3. Model if identifiable
4. Color and material
5. Distinguishing marks or features
6. Any visible serial numbers, IMEI, VIN, or other identifiers
7. Estimated condition
8. Key visual features for matching

Respond in JSON format with these fields:
{
  "category": "string",
  "brand": "string or null",
  "model": "string or null",
  "color": "string",
  "material": "string or null",
  "distinguishing_marks": "string or null",
  "visible_identifiers": "string or null",
  "condition": "string",
  "key_features": ["list of visual features"],
  "description": "brief text description of the item"
}"""

        if context:
            prompt += f"\n\nAdditional context: {context}"

        response = await asyncio.to_thread(
            model.generate_content,
            [prompt, image]
        )

        response_text = response.text

        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text

            result = json.loads(json_str.strip())
            return result
        except (json.JSONDecodeError, IndexError, ValueError) as e:
            logger.warning(f"Failed to parse JSON response: {e}")
            return {
                "description": response_text,
                "key_features": [],
                "category": "other"
            }

    except Exception as e:
        logger.error(f"Image analysis error: {e}")
        return {
            "error": str(e),
            "description": "Analysis failed",
            "key_features": []
        }


async def compare_images_real(scan_image_base64: str, stored_items: list) -> dict:
    """
    Compare a scanned image against stored stolen items using Gemini.
    Sends BOTH the scanned image AND stored item images for real visual comparison.
    """
    if not GEMINI_API_KEY:
        return {
            "visual_similarity": 0.0,
            "matched_items": [],
            "ai_analysis": "AI comparison unavailable - GEMINI_API_KEY not configured"
        }

    try:
        if not stored_items:
            return {
                "visual_similarity": 0.0,
                "matched_items": [],
                "ai_analysis": "No items in database to compare against."
            }

        items_with_images = [i for i in stored_items if i.get("images") and len(i["images"]) > 0]
        items_without_images = [i for i in stored_items if not i.get("images") or len(i["images"]) == 0]

        all_matched = []
        best_visual_sim = 0.0
        all_analysis_parts = []

        if items_with_images:
            for item in items_with_images[:5]:
                try:
                    stored_image_b64 = item["images"][0]
                    if isinstance(stored_image_b64, dict):
                        stored_image_b64 = stored_image_b64.get("url", "")

                    if not stored_image_b64:
                        continue

                    result = await _compare_two_images(
                        scan_image_base64,
                        stored_image_b64,
                        item
                    )

                    if result["similarity"] > 0:
                        best_visual_sim = max(best_visual_sim, result["similarity"] / 100.0)
                        all_matched.append({
                            "scid": item.get("scid", ""),
                            "title": item.get("title", ""),
                            "category": item.get("category", ""),
                            "confidence": result["similarity"],
                            "reason": result["reason"],
                        })
                        all_analysis_parts.append(
                            f"[{item['scid']}] {item['title']}: {result['similarity']}% - {result['reason']}"
                        )
                except Exception as e:
                    logger.warning(f"Image comparison failed for {item.get('scid')}: {e}")

        if items_without_images:
            try:
                text_result = await _compare_image_vs_text_descriptions(
                    scan_image_base64,
                    items_without_images[:10]
                )
                for m in text_result.get("matched_items", []):
                    sim = m.get("confidence", 0)
                    if sim > 15:
                        best_visual_sim = max(best_visual_sim, sim / 100.0 * 0.6)
                        all_matched.append(m)
                if text_result.get("analysis"):
                    all_analysis_parts.append(text_result["analysis"])
            except Exception as e:
                logger.warning(f"Text-based comparison failed: {e}")

        all_matched.sort(key=lambda x: x.get("confidence", 0), reverse=True)

        return {
            "visual_similarity": best_visual_sim,
            "matched_items": all_matched[:10],
            "ai_analysis": " | ".join(all_analysis_parts) if all_analysis_parts else "Comparison complete. No strong matches found."
        }
    except Exception as e:
        logger.error(f"Image comparison error: {e}")
        return {
            "visual_similarity": 0.0,
            "matched_items": [],
            "ai_analysis": f"Comparison failed: {str(e)}"
        }


async def _compare_two_images(scan_b64: str, stored_b64: str, stored_item: dict) -> dict:
    """Compare two actual images using Gemini - real visual comparison."""
    if not GEMINI_API_KEY:
        return {"similarity": 0, "is_same_item": False, "reason": "AI unavailable"}

    try:
        scan_image_bytes = base64.b64decode(scan_b64)
        stored_image_bytes = base64.b64decode(stored_b64)

        scan_image = Image.open(BytesIO(scan_image_bytes))
        stored_image = Image.open(BytesIO(stored_image_bytes))

        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = """You are a forensic image comparison expert for StoleCheck stolen goods detection.
You are given TWO images:
- Image 1: A photo taken by a buyer of an item they want to verify
- Image 2: A photo from the stolen items database

Compare these two images carefully. Consider:
1. Are they the same item or same type of item?
2. Do brand, model, color, shape match?
3. Any matching distinguishing marks, scratches, dents, stickers?
4. Overall visual similarity

Be HONEST and PRECISE. If the items look identical or very similar, say so with high confidence.
If they are clearly different items, say so with low confidence.

Respond ONLY in JSON:
{
  "similarity": 0-100,
  "is_same_item": true/false,
  "reason": "concise explanation",
  "matching_features": ["list of matching visual features"],
  "differing_features": ["list of differences if any"]
}"""

        item_context = f"\nStored item: {stored_item.get('title', 'Unknown')} ({stored_item.get('category', '')}) - {stored_item.get('brand', '')} {stored_item.get('model', '')} {stored_item.get('color', '')}"
        if stored_item.get('distinguishing_marks'):
            item_context += f" - Marks: {stored_item['distinguishing_marks']}"
        prompt += item_context

        response = await asyncio.to_thread(
            model.generate_content,
            [prompt, scan_image, stored_image]
        )

        response_text = response.text

        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text

            result = json.loads(json_str.strip())
            return {
                "similarity": min(max(result.get("similarity", 0), 0), 100),
                "is_same_item": result.get("is_same_item", False),
                "reason": result.get("reason", "No analysis provided"),
                "matching_features": result.get("matching_features", []),
            }
        except (json.JSONDecodeError, IndexError, ValueError):
            return {
                "similarity": 0,
                "is_same_item": False,
                "reason": response_text[:200]
            }

    except Exception as e:
        logger.error(f"Image comparison error: {e}")
        return {"similarity": 0, "is_same_item": False, "reason": str(e)}


async def _compare_image_vs_text_descriptions(scan_b64: str, items: list) -> dict:
    """Fallback: compare scan image against text descriptions of items without photos."""
    if not GEMINI_API_KEY:
        return {"matched_items": [], "analysis": "AI unavailable"}

    try:
        items_desc = []
        for item in items:
            desc = f"- SCID: {item.get('scid', 'N/A')}, Title: {item.get('title', 'N/A')}, "
            desc += f"Category: {item.get('category', 'N/A')}, Brand: {item.get('brand', 'N/A')}, "
            desc += f"Color: {item.get('color', 'N/A')}, Description: {item.get('description', 'N/A')}"
            if item.get('distinguishing_marks'):
                desc += f", Marks: {item['distinguishing_marks']}"
            items_desc.append(desc)

        items_text = "\n".join(items_desc)

        image_bytes = base64.b64decode(scan_b64)
        image = Image.open(BytesIO(image_bytes))

        model = genai.GenerativeModel("gemini-2.0-flash")

        prompt = f"""You are a forensic item matching system. Compare the scanned image against these stolen item descriptions (no photos available for these items):

{items_text}

Analyze what is in the image and whether it matches any described stolen items.
Respond in JSON:
{{
  "matched_items": [
    {{
      "scid": "item SCID",
      "title": "item title",
      "category": "category",
      "confidence": 0-100,
      "reason": "why it matches"
    }}
  ],
  "analysis": "brief summary"
}}"""

        response = await asyncio.to_thread(
            model.generate_content,
            [prompt, image]
        )

        response_text = response.text

        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0]
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0]
            else:
                json_str = response_text

            return json.loads(json_str.strip())
        except (json.JSONDecodeError, IndexError, ValueError):
            return {"matched_items": [], "analysis": response_text[:200]}

    except Exception as e:
        logger.error(f"Text-based comparison error: {e}")
        return {"matched_items": [], "analysis": f"Comparison failed: {str(e)}"}


def calculate_tps(visual_sim: float, id_confidence: float, metadata_match: float, contextual_risk: float) -> dict:
    """Calculate Theft Probability Score (TPS) with weighted components."""
    tps = int(
        (visual_sim * 40) +
        (id_confidence * 35) +
        (metadata_match * 15) +
        (contextual_risk * 10)
    )

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
