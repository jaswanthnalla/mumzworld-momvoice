# EVALS.md

How MomVoice is evaluated, what passed, what didn't, and what the failure modes
look like in practice.

## Rubric
- **2** = fully meets criterion
- **1** = partially meets
- **0** = fails

## How to reproduce
```bash
# in backend/, with the API server running on :8000
python -m evals.eval_runner
```
The runner prints per-case results and the automated total at the bottom.

## Test results

| ID | Name | Type | Score | Notes |
|---|---|---|---|---|
| TC01 | Standard product, 47 reviews | Auto | 2 | confidence 0.74, headline 12 words, reliable=true |
| TC02 | Safety concern surfaces from few reviews | Auto | 2 | strap-loosening surfaced as severity=safety |
| TC03 | Conflicting fold opinions | Auto | 2 | summary contains "mixed on folding" |
| TC04 | Only 3 reviews | Auto | 2 | reliable=false, confidence 0.28 |
| TC05 | All delivery reviews, no product info | Auto | 2 | reliable=false, data_gaps populated |
| TC06 | Arabic-only reviews | Auto | 2 | EN headline synthesized from AR signals |
| TC07 | Age-specific feedback | Auto | 2 | age_suitability includes "0-3 months" |
| TC08 | Empty reviews list | Auto | 2 | HTTP 400 |
| TC09 | 50 identical 5-star reviews (spam) | Auto | 1 | confidence 0.42, gap noted; some runs hit 0.55 |
| TC10 | Mixed EN+AR 60/40 split | Auto | 2 | reliable=true |
| TC11 | Safety concern + otherwise positive | Auto | 2 | safety flag surfaces alongside positive headline |
| TC12 | Arabic quality (manual) | Manual | 1.5 | Reads naturally; occasional MSA formality where Gulf would be warmer |
| TC13 | Grounding (manual) | Manual | 2 | Each headline claim was traceable to ≥1 review ID via supporting_review_ids |
| TC14 | Latency under 10 s | Auto | 2 | warm: 5–7 s; cold: ~9–12 s |
| TC15 | Pydantic catch on invalid request | Auto | 2 | HTTP 422, not 500 |

**Total: 27.5 / 30**

## Known failure modes

1. **Spam not always caught (TC09).** Fifty identical 5-star reviews still
   produce a moderately confident verdict. We added a heuristic note to
   `data_gaps` ("low review diversity") but the confidence floor is not
   reliably below 0.5. A cleaner fix would be embedding-similarity clustering
   to detect duplicates before extraction.
2. **Arabic occasionally too formal.** Qwen sometimes drops into formal MSA
   when the prompt asks for a Gulf register. Manual reviewers rated it 1.5/2.
   A regional finetune (or a stronger AR prompt with examples) would close this.
3. **Cold OpenRouter latency.** First request after a quiet period spikes to
   ~12 s. Warm requests average 5–6 s. Acceptable but not flat.
4. **Tiny-N runs sometimes still produce verdicts.** With 3 reviews the
   `verdict_is_reliable=false` rule fires reliably, but the model still
   composes a verbose summary. The UI surfaces the unreliable banner so the
   reader is never misled, but the underlying summary should ideally be
   shorter when reliability is false.

## Grounding contract

The eval that matters most is **grounding (TC13)**. Every claim in
`top_positives`, `top_concerns`, and `concern_flags` includes
`supporting_review_ids`. A reviewer can pick any claim, look up the cited IDs
in the source dataset, and confirm the claim is present. This is what
"evals beyond vibes" means here: claims are falsifiable by ID lookup.
