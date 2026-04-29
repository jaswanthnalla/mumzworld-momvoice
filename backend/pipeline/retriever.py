"""Optional FAISS retrieval — caps reviews fed to the extractor at 50.

For datasets <= 50 reviews we just pass them through. Beyond that we use
sentence-transformers + FAISS to pick the most diverse / relevant subset.
"""
from typing import Iterable

_MODEL = None
_FAISS_OK = True


def _load_model():
    global _MODEL, _FAISS_OK
    if _MODEL is not None:
        return _MODEL
    try:
        from sentence_transformers import SentenceTransformer
        _MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    except Exception:
        _FAISS_OK = False
        _MODEL = None
    return _MODEL


def select_reviews(reviews: list[dict], max_count: int = 50) -> list[dict]:
    if len(reviews) <= max_count:
        return reviews

    model = _load_model()
    if model is None or not _FAISS_OK:
        return reviews[:max_count]

    try:
        import faiss
        import numpy as np
        texts = [r["text"] for r in reviews]
        embs = model.encode(texts, normalize_embeddings=True)
        d = embs.shape[1]
        index = faiss.IndexFlatIP(d)
        index.add(embs.astype("float32"))
        # diversity-ish: take centroid neighbours, then random fill
        centroid = embs.mean(axis=0, keepdims=True).astype("float32")
        _, ids = index.search(centroid, max_count)
        keep_ids = list(ids[0])
        return [reviews[i] for i in keep_ids]
    except Exception:
        return reviews[:max_count]
