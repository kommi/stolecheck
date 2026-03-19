import os
import base64
import tempfile
import logging
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
        
        # Try to parse JSON from response
        import json
        try:
            # Clean response - find JSON block
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


async def compare_images(scan_image_base64: str, stored_items: list) -> dict:
    """Compare a scanned image against stored stolen items using Gemini."""
    try:
        if not stored_items:
            return {
                "visual_similarity": 0.0,
                "matched_items": [],
                "ai_analysis": "No items in database to compare against."
            }

        # Build comparison context
        items_desc = []
        for item in stored_items[:10]:  # Limit to 10 items
            desc = f"- SCID: {item.get('scid', 'N/A')}, Title: {item.get('title', 'N/A')}, "
            desc += f"Category: {item.get('category', 'N/A')}, Brand: {item.get('brand', 'N/A')}, "
            desc += f"Color: {item.get('color', 'N/A')}, Description: {item.get('description', 'N/A')}"
            if item.get('distinguishing_marks'):
                desc += f", Marks: {item['distinguishing_marks']}"
            items_desc.append(desc)

        items_text = "\n".join(items_desc)

        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"compare-{os.urandom(8).hex()}",
            system_message=f"""You are an expert forensic item comparison system for StoleCheck.
You are comparing a scanned image against a database of reported stolen items.

Here are the stolen items in the database:
{items_text}

Analyze the scanned image and determine if it matches any of the stolen items.
Consider: visual similarity, category match, brand match, color match, and any distinguishing features.

Respond in JSON format:
{{
  "visual_similarity_score": 0-100,
  "matched_items": [
    {{
      "scid": "matched item SCID",
      "confidence": 0-100,
      "reason": "why this matches"
    }}
  ],
  "analysis": "detailed analysis of the comparison",
  "risk_assessment": "safe/suspicious/stolen"
}}"""
        ).with_model("gemini", "gemini-3-flash-preview")

        image_content = ImageContent(image_base64=scan_image_base64)
        response = await chat.send_message(
            UserMessage(
                text="Compare this scanned item image against the stolen items database. Provide similarity scores.",
                file_contents=[image_content]
            )
        )

        import json
        try:
            text = response
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0]
            elif "```" in text:
                text = text.split("```")[1].split("```")[0]
            result = json.loads(text.strip())
            return {
                "visual_similarity": result.get("visual_similarity_score", 0) / 100.0,
                "matched_items": result.get("matched_items", []),
                "ai_analysis": result.get("analysis", "")
            }
        except (json.JSONDecodeError, IndexError):
            return {
                "visual_similarity": 0.0,
                "matched_items": [],
                "ai_analysis": response
            }
    except Exception as e:
        logger.error(f"Image comparison error: {e}")
        return {
            "visual_similarity": 0.0,
            "matched_items": [],
            "ai_analysis": f"Comparison failed: {str(e)}"
        }


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
