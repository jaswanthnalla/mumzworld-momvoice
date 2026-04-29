# TRADEOFFS.md

Honest notes on what was chosen, what was rejected, and what I'd build next.

## Problem selection

Chose review synthesis because:
- **Grounding is provable.** Every claim in the verdict carries
  `supporting_review_ids`. A reviewer can pick a claim and verify it against
  the source data. This makes evals binary, not vibes-based.
- **Bilingual is genuine.** A Gulf mom reading the AR card will spot
  translated copy immediately. Generating natively (different model, AR
  prompt, signals as input) is meaningfully different from
  English-then-translate.
- **The problem is real.** Mumzworld lists 350,000+ products and a typical
  comparison shopper reads 100+ reviews. A 30-second trustworthy summary is
  high-impact.

I rejected:
- **Gift finder** — high hallucination risk, no ground truth to eval against.
- **Symptom triage** — medical liability, out of scope for a 5-hour build.
- **PDP generator** — no input to validate output against; "is this PDP
  good?" is a vibes question.

## Model choices

- **Llama 3.3 70B (extraction + EN synthesis)** — strong instruction
  following, free on OpenRouter, reliably returns valid JSON.
- **Qwen 2.5 72B (Arabic)** — tested both; Qwen produces clearly more
  natural Gulf-style Arabic than Llama. Llama AR reads like translated EN.
- **Mistral 7B Arabic** — tried first because it was the smallest free
  option; output was poor for nuance, switched to Qwen.
- **`sentence-transformers/all-MiniLM-L6-v2` for retrieval** — local, free,
  loads in ~2 s. For 50-review datasets this is overkill, but it scales
  cleanly to product pages with hundreds of reviews.

## Context window strategy

The extractor caps at 50 reviews per call. Below that, all reviews go through.
Above that, FAISS picks a diverse subset around the embedding centroid.
Two reasons this matters:

1. Token budget — Llama 3.3 free tier has a generous but finite context.
2. Signal-to-noise — beyond ~50 reviews, the model starts to bias toward
   whichever opinion is repeated most frequently, which is fine for sentiment
   but bad for surfacing safety concerns mentioned by 1–2 outliers.

## Uncertainty: two layers

- **Pydantic** catches structural failures. If the model returns a
  `headline_en` over 20 words, or sets `verdict_is_reliable=false` without an
  `unreliable_reason`, validation throws and the API returns 422.
  The pipeline cannot silently produce a malformed verdict.
- **Prompts** catch semantic failures. The synthesizer is told to set
  `verdict_is_reliable=false` when reviews are <10, off-topic, or spammy.
  This is fuzzy by nature — the eval suite is what holds it accountable.

## What I cut

- Voice input for reviews
- Historical verdict tracking (needs persistence)
- Per-variant clustering (small/medium/large stroller variants)
- Competitive comparison across multiple products
- A confidence breakdown chart on the frontend

## What I'd build next

1. **Inline grounding UI.** Click a claim in the verdict, see the supporting
   review highlighted in a side panel. Closes the trust loop visually.
2. **Verdict freshness.** When new reviews arrive, recompute and show a diff
   from the previous verdict. "Concerns about strap loosening dropped from
   3 reviews to 1 since November."
3. **Seller-side alerts.** Auto-flag a product when safety concerns appear
   in its reviews. Operationally useful for the merchandising team.
4. **Better spam detection.** Embedding-based duplicate clustering to detect
   coordinated 5-star pushes. TC09 currently passes only partially.

## On Arabic quality

Native generation (not translation) is the right call. Two design choices
make the difference:

1. The AR system prompt is itself written in Arabic. The model never sees
   "translate this English."
2. The AR step reads the same structured signals as the EN step — not the
   English verdict. The two outputs are siblings, not parent and child.

The remaining gap is regional voice — Qwen leans formal MSA when Gulf would
feel warmer. A finetuned Khaleeji model would close this; for a 5-hour
prototype, native-via-Qwen is materially better than translated-via-Google.
