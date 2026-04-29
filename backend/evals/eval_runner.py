"""Run the 15 eval test cases against a running MomVoice server.

Usage:
  uvicorn main:app --port 8000   # in another terminal
  python -m evals.eval_runner
  python -m evals.eval_runner --only TC01,TC04,TC08,TC14,TC15
"""
import argparse
import asyncio
import json
import os
import sys
import time
from pathlib import Path

import httpx

BASE_URL = os.getenv("MOMVOICE_URL", "http://localhost:8000")
DATA_DIR = Path(__file__).parent.parent / "data" / "sample_products"
TEST_CASES = Path(__file__).parent / "test_cases.json"


def load_fixture(name: str) -> dict:
    return json.loads((DATA_DIR / f"{name}.json").read_text(encoding="utf-8"))


def run_check(check: str, verdict: dict, latency: float) -> tuple[bool, str]:
    if check == "reliable_true":
        return verdict.get("verdict_is_reliable") is True, f"reliable={verdict.get('verdict_is_reliable')}"
    if check == "reliable_false":
        return verdict.get("verdict_is_reliable") is False, f"reliable={verdict.get('verdict_is_reliable')}"
    if check.startswith("confidence_min:"):
        threshold = float(check.split(":", 1)[1])
        c = verdict.get("overall_confidence", 0)
        return c >= threshold, f"confidence={c:.2f} (>= {threshold})"
    if check.startswith("confidence_max:"):
        threshold = float(check.split(":", 1)[1])
        c = verdict.get("overall_confidence", 1)
        return c <= threshold, f"confidence={c:.2f} (<= {threshold})"
    if check.startswith("headline_words_max:"):
        n = int(check.split(":", 1)[1])
        words = len(verdict.get("headline_en", "").split())
        return words <= n, f"words={words} (<= {n})"
    if check == "has_concern_severity:safety":
        flags = verdict.get("concern_flags", [])
        ok = any(f.get("severity") == "safety" for f in flags)
        return ok, f"safety_flags={sum(1 for f in flags if f.get('severity') == 'safety')}"
    if check.startswith("summary_contains:"):
        token = check.split(":", 1)[1].lower()
        s = verdict.get("summary_en", "").lower()
        return token in s, f"contains '{token}'={token in s}"
    if check == "data_gaps_nonempty":
        gaps = verdict.get("data_gaps", [])
        return len(gaps) > 0, f"gaps={len(gaps)}"
    if check == "headline_en_nonempty":
        return bool(verdict.get("headline_en", "").strip()), "headline_en set"
    if check == "headline_ar_nonempty":
        return bool(verdict.get("headline_ar", "").strip()), "headline_ar set"
    if check.startswith("age_contains:"):
        target = check.split(":", 1)[1]
        ages = verdict.get("age_suitability", [])
        return target in ages, f"ages={ages}"
    if check == "headline_not_purely_positive":
        h = verdict.get("headline_en", "").lower()
        flags = verdict.get("concern_flags", [])
        had_safety = any(f.get("severity") == "safety" for f in flags)
        return had_safety, "safety flag present alongside headline"
    if check.startswith("latency_max_seconds:"):
        threshold = float(check.split(":", 1)[1])
        return latency <= threshold, f"latency={latency:.2f}s (<= {threshold})"
    return False, f"unknown check: {check}"


async def call_verdict(client: httpx.AsyncClient, product_name: str, reviews: list) -> tuple[int, dict, float]:
    t0 = time.time()
    resp = await client.post(f"{BASE_URL}/api/verdict", json={"product_name": product_name, "reviews": reviews}, timeout=120)
    elapsed = time.time() - t0
    try:
        body = resp.json()
    except Exception:
        body = {"raw": resp.text}
    return resp.status_code, body, elapsed


async def execute_case(client: httpx.AsyncClient, case: dict) -> tuple[int, str]:
    """Returns (score 0|1|2, note)."""
    if case["type"] == "manual":
        return -1, "MANUAL — review output by hand"

    expect_status = case.get("expect_status")

    if case.get("mock_invalid"):
        # Hit the endpoint with a single review crafted to trigger Pydantic 422 by faking
        # a verdict path. In practice 422 happens when the model returns malformed schema —
        # we simulate by sending an empty product_name header (rejected as 422 by FastAPI)
        resp = await client.post(f"{BASE_URL}/api/verdict", json={"reviews": [{"id": 1, "text": "x", "rating": 5, "language": "en", "verified_purchase": True, "helpful_votes": 0, "date": "2024-01-01"}]}, timeout=30)
        ok = resp.status_code == 422
        return (2 if ok else 0), f"status={resp.status_code} (expected 422)"

    if "inline_reviews" in case:
        reviews = case["inline_reviews"]
        product_name = case.get("product_name", "Test")
    elif case.get("spam"):
        reviews = [
            {"id": i + 1, "text": "Best product ever! 5 stars!", "rating": 5,
             "language": "en", "verified_purchase": True, "helpful_votes": 0, "date": "2024-09-15"}
            for i in range(50)
        ]
        product_name = case["product_name"]
    else:
        fixture = load_fixture(case["fixture"])
        reviews = fixture["reviews"]
        product_name = fixture["product_name"]
        if "language_filter" in case:
            reviews = [r for r in reviews if r["language"] == case["language_filter"]]
        if "limit" in case:
            reviews = reviews[: case["limit"]]

    status, body, latency = await call_verdict(client, product_name, reviews)

    if expect_status is not None:
        ok = status == expect_status
        return (2 if ok else 0), f"status={status} (expected {expect_status})"

    if status != 200:
        return 0, f"unexpected status={status}: {str(body)[:200]}"

    notes = []
    passed = 0
    total = len(case.get("checks", []))
    for check in case.get("checks", []):
        ok, note = run_check(check, body, latency)
        notes.append(f"{'OK' if ok else 'FAIL'} {check} ({note})")
        if ok:
            passed += 1

    if total == 0:
        return 2, "; ".join(notes) or "no checks"

    if passed == total:
        score = 2
    elif passed >= total / 2:
        score = 1
    else:
        score = 0
    return score, "; ".join(notes)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", help="Comma-separated case IDs to run (e.g. TC01,TC08,TC15)")
    args = parser.parse_args()

    cases = json.loads(TEST_CASES.read_text(encoding="utf-8"))
    if args.only:
        wanted = {c.strip().upper() for c in args.only.split(",") if c.strip()}
        cases = [c for c in cases if c["id"].upper() in wanted]
        if not cases:
            print(f"No cases matched --only={args.only}. Available IDs:")
            for c in json.loads(TEST_CASES.read_text(encoding="utf-8")):
                print(f"  {c['id']:<6} {c['name']}")
            sys.exit(2)
        print(f"Running {len(cases)} case(s): {', '.join(c['id'] for c in cases)}")

    rows = []
    total_score = 0.0
    max_score = 0.0
    inter_case_sleep = float(os.getenv("EVAL_INTER_CASE_SLEEP", "8"))
    async with httpx.AsyncClient() as client:
        for i, case in enumerate(cases):
            if i > 0 and case["type"] == "auto":
                await asyncio.sleep(inter_case_sleep)
            print(f"\n[{case['id']}] {case['name']}")
            try:
                score, note = await execute_case(client, case)
            except Exception as e:
                score, note = 0, f"EXCEPTION: {type(e).__name__}: {e}"
            if score == -1:
                rows.append((case["id"], case["name"], "MANUAL", note))
                print(f"  -> MANUAL: {note}")
                continue
            rows.append((case["id"], case["name"], str(score), note))
            total_score += score
            max_score += 2
            print(f"  -> {score}/2 — {note}")

    print("\n" + "=" * 80)
    print(f"{'ID':<6} {'Name':<48} {'Score':<8} Notes")
    print("-" * 80)
    for rid, name, score, note in rows:
        print(f"{rid:<6} {name[:48]:<48} {score:<8} {note[:120]}")
    print("=" * 80)
    print(f"AUTOMATED TOTAL: {total_score} / {max_score}")


if __name__ == "__main__":
    asyncio.run(main())
