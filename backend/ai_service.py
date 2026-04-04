import os
import logging
import json
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

logger = logging.getLogger(__name__)

EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")


async def analyze_item_image(image_base64: str, context: str = "") -> dict:
    """Analyze an uploaded image using Gemini 3 Flash to extract item details."""
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"analysis-{os.urandom(8).hex()}",
            system_message="""You are an expert item identification and analysis system for StoleCheck, 
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
        ).with_model("gemini", "gemini-3-flash-preview")

        image_content = ImageContent(image_base64=image_base64)
        prompt = "Analyze this item image in detail for the stolen goods database."
        if context:
            prompt += f" Additional context: {context}"

        response = await chat.send_message(
            UserMessage(text=prompt, file_contents=[image_content])
        )
        
        try:
            text = response
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            return json.loads(text.strip())
        except (json.JSONDecodeError, IndexError):
            return {"description": response, "key_features": []}
    except Exception as e:
        logger.error(f"Image analysis error: {e}")
        return {"error": str(e), "description": "Analysis failed", "key_features": []}


async def compare_images_real(scan_image_base64: str, stored_items: list) -> dict:
    """
    Compare a scanned image against stored stolen items using Gemini.
    Sends BOTH the scanned image AND stored item images for real visual comparison.
    """
    try:
        if not stored_items:
            return {
                "visual_similarity": 0.0,
                "matched_items": [],
                "ai_analysis": "No items in database to compare against."
            }

        # Separate items WITH images vs without images
        items_with_images = [i for i in stored_items if i.get("images") and len(i["images"]) > 0]
        items_without_images = [i for i in stored_items if not i.get("images") or len(i["images"]) == 0]

        all_matched = []
        best_visual_sim = 0.0
        all_analysis_parts = []

        # --- Phase 1: Real image-vs-image comparison for items WITH stored photos ---
        if items_with_images:
            # Compare against up to 5 items with images (send both images to Gemini)
            for item in items_with_images[:5]:
                try:
                    result = await _compare_two_images(
                        scan_image_base64,
                        item["images"][0],
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
                            "item_image": item["images"][0][:100] + "..." if item.get("images") else None,
                        })
                        all_analysis_parts.append(
                            f"[{item['scid']}] {item['title']}: {result['similarity']}% - {result['reason']}"
                        )
                except Exception as e:
                    logger.warning(f"Image comparison failed for {item.get('scid')}: {e}")

        # --- Phase 2: Image-vs-text comparison for items WITHOUT stored photos ---
        if items_without_images:
            try:
                text_result = await _compare_image_vs_text_descriptions(
                    scan_image_base64,
                    items_without_images[:10]
                )
                for m in text_result.get("matched_items", []):
                    sim = m.get("confidence", 0)
                    if sim > 15:
                        best_visual_sim = max(best_visual_sim, sim / 100.0 * 0.6)  # Discount text-only matches
                        all_matched.append(m)
                if text_result.get("analysis"):
                    all_analysis_parts.append(text_result["analysis"])
            except Exception as e:
                logger.warning(f"Text-based comparison failed: {e}")

        # Sort by confidence
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
    """Compare two actual images using Gemini - the REAL comparison."""
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"imgcmp-{os.urandom(8).hex()}",
        system_message="""You are a forensic image comparison expert for StoleCheck stolen goods detection.
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
    ).with_model("gemini", "gemini-3-flash-preview")

    scan_img = ImageContent(image_base64=scan_b64)
    stored_img = ImageContent(image_base64=stored_b64)

    item_context = f"Stored item: {stored_item.get('title', 'Unknown')} ({stored_item.get('category', '')}) - {stored_item.get('brand', '')} {stored_item.get('model', '')} {stored_item.get('color', '')}"
    if stored_item.get('distinguishing_marks'):
        item_context += f" - Marks: {stored_item['distinguishing_marks']}"

    response = await chat.send_message(
        UserMessage(
            text=f"Compare these two images. Image 1 is the buyer's scan, Image 2 is from the stolen database. {item_context}",
            file_contents=[scan_img, stored_img]
        )
    )

    try:
        text = response
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        result = json.loads(text.strip())
        return {
            "similarity": result.get("similarity", 0),
            "is_same_item": result.get("is_same_item", False),
            "reason": result.get("reason", ""),
            "matching_features": result.get("matching_features", []),
        }
    except (json.JSONDecodeError, IndexError):
        return {"similarity": 0, "is_same_item": False, "reason": response}


async def _compare_image_vs_text_descriptions(scan_b64: str, items: list) -> dict:
    """Fallback: compare scan image against text descriptions of items without photos."""
    items_desc = []
    for item in items:
        desc = f"- SCID: {item.get('scid', 'N/A')}, Title: {item.get('title', 'N/A')}, "
        desc += f"Category: {item.get('category', 'N/A')}, Brand: {item.get('brand', 'N/A')}, "
        desc += f"Color: {item.get('color', 'N/A')}, Description: {item.get('description', 'N/A')}"
        if item.get('distinguishing_marks'):
            desc += f", Marks: {item['distinguishing_marks']}"
        items_desc.append(desc)

    items_text = "\n".join(items_desc)

    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=f"txtcmp-{os.urandom(8).hex()}",
        system_message=f"""You are a forensic item matching system. Compare the scanned image against these stolen item descriptions (no photos available for these items):

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
    ).with_model("gemini", "gemini-3-flash-preview")

    scan_img = ImageContent(image_base64=scan_b64)
    response = await chat.send_message(
        UserMessage(
            text="Identify what is in this image and check if it matches any stolen item descriptions.",
            file_contents=[scan_img]
        )
    )

    try:
        text = response
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text.strip())
    except (json.JSONDecodeError, IndexError):
        return {"matched_items": [], "analysis": response}


def calculate_tps(visual_sim: float, id_confidence: float, metadata_match: float, contextual_risk: float) -> dict:
    """Calculate Theft Probability Score (TPS) with weighted components."""
    # Weights from DPR: Visual 40%, ID 35%, Metadata 15%, Context 10%
    tps = int(
        (visual_sim * 40) +
        (id_confidence * 35) +
        (metadata_match * 15) +
        (contextual_risk * 10)
    )

    # Exact ID match override: an exact IMEI/VIN/serial match is near-certain proof
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
