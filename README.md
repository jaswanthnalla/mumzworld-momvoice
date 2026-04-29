# MomVoice — Bilingual Review Intelligence for Mumzworld

Synthesizes customer reviews into structured, bilingual (EN + native AR) product
verdicts for Mumzworld's 350,000+ product catalog. Every claim must trace back
to a review ID — the system refuses to invent.

**Track:** A — AI Engineering Intern
**Submitted by:** Jaswanth Nalla
**Loom (3 min):** _add link before submission_

---

## Quick Start (under 5 minutes from clone)

### Prerequisites
- Python 3.11+
- Node 18+
- Free OpenRouter API key — get one at [openrouter.ai](https://openrouter.ai) (no credit card needed)

### Backend
```bash
git clone https://github.com/jaswanthnalla/mumzworld-momvoice
cd mumzworld-momvoice/backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env and paste your OPENROUTER_API_KEY

python data/generate_reviews.py     # writes 3 product datasets
uvicorn main:app --reload --port 8000
```

### Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 → choose a product → **Generate Verdict** → ~6–10 seconds.

### Run evals
```bash
# with the API server running:
cd backend
python -m evals.eval_runner
```

---

## Architecture

A 4-step pipeline. Every step is independently testable.

```
reviews ─▶ [1] extractor (Llama 3.3, T=0.1)
              │
              ▼  structured signals JSON
          [2] EN synthesizer (Llama 3.3, T=0.3)
              │
              ▼  EN verdict JSON
          [3] AR generator (Qwen 2.5, T=0.4) ◀── reads same signals, NOT the EN text
              │
              ▼  AR verdict JSON
          [4] Pydantic validator → MomsVerdict (or 422)
```

**Why two models:** Qwen 2.5 produces noticeably more natural Gulf-style Arabic than
Llama 3.3. Both are free on OpenRouter.

**Why generate AR from signals, not from the EN text:** The Arabic system prompt is
itself written in Arabic. Reading the same structured signals (instead of an English
verdict) means the model never has to translate — it composes natively. Gulf moms
spot translated copy instantly.

---

## Tooling

| Component | Tool | Role |
|---|---|---|
| Architecture, prompts, schema | Claude (Sonnet on Claude.ai) | Design + iteration |
| Extraction + EN synthesis | OpenRouter `meta-llama/llama-3.3-70b-instruct:free` | Strong instruction follower |
| Arabic generation | OpenRouter `qwen/qwen-2.5-72b-instruct:free` | Better AR than Llama |
| Embeddings (review retrieval) | `sentence-transformers/all-MiniLM-L6-v2` | Local, free |
| Vector index (when >50 reviews) | `faiss-cpu` | Local, no server |
| Backend | FastAPI + Pydantic v2 | Explicit schema failures |
| Frontend | React + Vite + Tailwind | RTL-aware bilingual UI |

No paid keys are used. Free OpenRouter tier covers all LLM calls.

---

## AI usage note

Claude (Sonnet) was used for prompt iteration, schema design, and the README/EVALS
narratives. All in-app LLM calls go through OpenRouter free models. The Arabic
output is generated natively by Qwen reading the structured signals — it is not a
translation of the English verdict.

---

## Time log (honest)

| Phase | Hours |
|---|---|
| Problem selection + architecture | 0:45 |
| Pydantic schema + data model | 0:30 |
| Synthetic data generation | 0:30 |
| 4-step pipeline + retriever | 2:00 |
| FastAPI endpoints | 0:30 |
| React frontend (Tailwind, RTL) | 0:45 |
| Evals + 15 test cases | 0:45 |
| README + EVALS.md + TRADEOFFS.md | 0:30 |
| **Total** | **~6.25 hrs** |

Slightly over the 5-hour target, mostly because the Arabic prompt went through
three rewrites before the output stopped reading like translated English.

---

## Project layout

```
mumzworld-momvoice/
├── backend/
│   ├── main.py                       FastAPI app (4 endpoints)
│   ├── pipeline/
│   │   ├── openrouter_client.py      Thin OpenRouter JSON-mode client
│   │   ├── extractor.py              Step 1
│   │   ├── synthesizer.py            Step 2 (EN)
│   │   ├── arabic_generator.py       Step 3 (native AR)
│   │   ├── validator.py              Step 4 (Pydantic)
│   │   └── retriever.py              FAISS subset selector for >50 reviews
│   ├── models/
│   │   ├── review.py                 Input schema
│   │   └── verdict.py                MomsVerdict schema
│   ├── data/
│   │   ├── generate_reviews.py       Synthetic data — DO NOT scrape Mumzworld
│   │   └── sample_products/*.json    3 datasets, ~50 reviews each
│   ├── evals/
│   │   ├── eval_runner.py            Runs all 15 test cases
│   │   └── test_cases.json
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/App.jsx
│   └── src/components/{VerdictCard,ArabicCard,ConfidenceBar,ConcernFlags}.jsx
├── EVALS.md
├── TRADEOFFS.md
└── README.md
```

---

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/api/products` | list sample products |
| GET | `/api/products/{id}/reviews` | full review dataset |
| POST | `/api/verdict` | run the pipeline → MomsVerdict |

`POST /api/verdict` returns:
- **400** if no reviews are supplied
- **422** if the assembled verdict fails Pydantic validation (never silent)
- **500** only on actual pipeline failures (network, rate limit)
