"""Step 4 — assemble + Pydantic-validate the final verdict."""
from models.verdict import MomsVerdict


def validate_and_assemble(product_name: str, review_count: int, en_verdict: dict, ar_verdict: dict) -> MomsVerdict:
    en = {k: v for k, v in en_verdict.items() if k not in {"product_name", "review_count"}}
    combined = {
        "product_name": product_name,
        "review_count": review_count,
        **en,
        **ar_verdict,
    }
    return MomsVerdict(**combined)
