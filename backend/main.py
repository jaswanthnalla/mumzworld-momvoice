"""FastAPI entrypoint for MomVoice."""
import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ValidationError

from models.verdict import MomsVerdict
from pipeline.extractor import extract_signals
from pipeline.synthesizer import synthesize_en
from pipeline.arabic_generator import generate_arabic
from pipeline.validator import validate_and_assemble
from pipeline.retriever import select_reviews

load_dotenv()

DATA_DIR = Path(__file__).parent / "data" / "sample_products"

app = FastAPI(title="MomVoice", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VerdictRequest(BaseModel):
    product_name: str
    reviews: list[dict[str, Any]]


@app.exception_handler(ValidationError)
async def pydantic_handler(_: Request, exc: ValidationError):
    return JSONResponse(status_code=422, content={"detail": "schema_validation_failed", "errors": exc.errors()})


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/products")
def list_products():
    out = []
    if not DATA_DIR.exists():
        return out
    for p in sorted(DATA_DIR.glob("*.json")):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        out.append({
            "product_id": data.get("product_id", p.stem),
            "product_name": data.get("product_name", p.stem),
            "review_count": data.get("review_count", len(data.get("reviews", []))),
        })
    return out


@app.get("/api/products/{product_id}/reviews")
def get_reviews(product_id: str):
    path = DATA_DIR / f"{product_id}.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="product_not_found")
    return json.loads(path.read_text(encoding="utf-8"))


@app.post("/api/verdict", response_model=MomsVerdict)
async def make_verdict(req: VerdictRequest):
    if not req.reviews:
        raise HTTPException(status_code=400, detail="no_reviews_provided")

    selected = select_reviews(req.reviews, max_count=50)
    review_count = len(req.reviews)

    try:
        extraction = await extract_signals(req.product_name, selected)
        en_verdict = await synthesize_en(req.product_name, review_count, extraction)
        ar_verdict = await generate_arabic(req.product_name, review_count, extraction)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"pipeline_error: {type(e).__name__}: {str(e)[:200]}")

    try:
        verdict = validate_and_assemble(req.product_name, review_count, en_verdict, ar_verdict)
    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"reason": "schema_validation_failed", "errors": e.errors()})

    return verdict


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
