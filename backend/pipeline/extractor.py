"""Step 1 — extract structured signals from the raw reviews."""
from .openrouter_client import chat_json

EXTRACTION_MODEL = "meta-llama/llama-3.3-70b-instruct:free"

SYSTEM_PROMPT = """You are a product review analyst for Mumzworld, the Middle East's largest baby e-commerce platform.

Extract structured signals from the reviews below. STRICT RULES:
1. Only extract what is EXPLICITLY stated. Never infer or assume.
2. Flag ALL safety concerns, even if only 1 review mentions them.
3. Note conflicting opinions — do not pick a side.
4. If fewer than 5 reviews exist, add "insufficient_data" to confidence_factors.
5. Detect both EN and AR reviews. Extract signals from both.
6. Off-topic reviews (delivery, packaging) should not influence product signals.

Return ONLY valid JSON. No preamble.

Schema:
{
  "aspects_mentioned": [string],
  "age_groups_mentioned": [string],
  "safety_concerns": [{"description": string, "review_ids": [int]}],
  "quality_issues": [{"description": string, "review_ids": [int]}],
  "top_positives": [{"description": string, "review_ids": [int]}],
  "top_negatives": [{"description": string, "review_ids": [int]}],
  "conflicting_opinions": [string],
  "review_language_mix": {"en": int, "ar": int},
  "confidence_factors": [string],
  "off_topic_review_count": int
}
"""


def _format_reviews(reviews: list[dict]) -> str:
    lines = []
    for r in reviews:
        lines.append(
            f"[id={r['id']} rating={r['rating']} lang={r['language']} age={r.get('reviewer_child_age') or 'n/a'}] {r['text']}"
        )
    return "\n".join(lines)


async def extract_signals(product_name: str, reviews: list[dict]) -> dict:
    user = (
        f"Product: {product_name}\n"
        f"Total reviews: {len(reviews)}\n\n"
        f"Reviews:\n{_format_reviews(reviews)}"
    )
    return await chat_json(EXTRACTION_MODEL, SYSTEM_PROMPT, user, temperature=0.1)
