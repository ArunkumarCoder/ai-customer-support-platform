# FastAPI AI Service Reference

Base URL: local dev `http://localhost:8001` (never called by React directly — only Laravel talks to this service).

Generated from `app/main.py`'s router registration and each router's actual Pydantic schemas — every field, constraint, and status code below is copied from the real code, not guessed.

## Auth

Every route except `/health` requires:

```
X-Internal-Api-Key: <shared secret>
```

Verified in `app/core/security.py` via `secrets.compare_digest()` (constant-time, not `==`) against the `INTERNAL_API_KEY` env var — this must match Laravel's `AI_SERVICE_SECRET` exactly. This is service-to-service auth only, proving the caller is Laravel; it has nothing to do with the agent/customer's own identity.

**Two distinct failure modes**, both worth knowing since they look similar but aren't:

| Status | Cause |
|---|---|
| `422` | The `X-Internal-Api-Key` header is **missing entirely** — FastAPI's own request validation rejects it before `verify_internal_api_key` ever runs (the header has no default) |
| `401` | The header is **present but wrong** |

## Rate limiting

`slowapi`, keyed by remote IP address (`get_remote_address`), backed by a single shared in-memory `Limiter` (`app/core/rate_limit.py`).

| Route | Limit |
|---|---|
| `POST /chat` | 100 / minute |
| `POST /ingest` | 100 / minute |
| `POST /sentiment` | none |
| `POST /summarize` | none |
| `GET /health` | none |

Exceeding the limit returns `429` (slowapi's default `RateLimitExceeded` handler).

---

## `GET /health`

No auth. Liveness probe.

**Response `200`**
```json
{ "status": "ok" }
```

---

## `POST /chat`

The RAG endpoint. Called by Laravel's `AiServiceClient::chat()` for every widget message.

**Request body**

| Field | Type | Constraints |
|---|---|---|
| `message` | string | required, 1–2000 chars |
| `ticket_id` | int \| null | optional, must be > 0 if present — **accepted but currently unused**: Laravel's `AiServiceClient::chat()` never actually sends this field |

```json
{ "message": "How do I get a refund?" }
```

**What it does, in order:**
1. Embeds `message` via `sentence-transformers` (`all-MiniLM-L6-v2`, warmed once at process startup in `main.py`'s `lifespan` hook, not on first request).
2. Runs a pgvector cosine-distance search over `document_chunks` (`retrieve_relevant_chunks`).
3. Computes `escalate`: `true` if **no** chunks were retrieved, or the **minimum** distance among retrieved chunks exceeds `CONFIDENCE_DISTANCE_THRESHOLD` (`0.65` in `.env.example`; the code's own fallback default is `0.4`, which earlier testing found escalated most real paraphrased questions — treat `0.65` as the actual intended value, not the code default).
4. Builds a RAG prompt from the retrieved chunk text (`build_rag_messages`) and calls whichever provider `LLM_PROVIDER` selects.

**Response `200`**
```json
{ "reply": "To receive a refund, log into your account, go to the Orders page...", "escalate": false }
```

No body-shape difference on a low-confidence answer — `escalate: true` still comes with a real `reply` (the LLM's best attempt, or a handoff-flavored answer if the prompt has no grounding chunks at all), it's just flagged for human follow-up on the Laravel/React side.

---

## `POST /ingest`

Called by Laravel's `IngestDocumentJob` after a document upload.

**Request body**

| Field | Type | Constraints |
|---|---|---|
| `document_id` | int | required, > 0 — the Laravel `documents.id` these chunks belong to (no foreign key across services; just a plain matching integer) |
| `text` | string | required, 1–200,000 chars |

```json
{ "document_id": 5, "text": "Order Tracking\nOnce your order ships, you will receive an email..." }
```

**What it does:** chunks `text` (`chunk_text`), embeds each chunk, writes one `document_chunks` row per chunk. If chunking produces zero chunks (e.g. effectively empty input), returns `chunks_created: 0` without touching the database.

**Response `200`**
```json
{ "chunks_created": 5 }
```

A non-2xx response (or an unreachable service) makes Laravel's `IngestDocumentJob` throw, landing the job in `failed_jobs` (or surfacing as a `500` to the caller directly, if `QUEUE_CONNECTION=sync`) — ingestion failure is never silent.

---

## `POST /sentiment`

Called by Laravel's `AnalyzeSentimentJob` after every **customer** message (never bot/agent messages).

**Request body**

| Field | Type | Constraints |
|---|---|---|
| `text` | string | required, 1–5,000 chars |

```json
{ "text": "This is the third time I've had to contact support about the same issue!" }
```

**What it does:** sends `text` to the configured LLM provider with a strict-JSON-only system prompt, parses the response (stripping markdown code fences some providers add anyway). **Never raises** on a parse failure or provider error — falls back to `{"label": "neutral", "score": 0.5}` instead, since sentiment is a nice-to-have signal that shouldn't be able to break message creation.

**Response `200`**
```json
{ "label": "negative", "score": 0.85 }
```

`label` is one of `positive` / `neutral` / `negative` in practice (not an enum-enforced field in the schema — just what the prompt asks the LLM for).

---

## `POST /summarize`

Called by Laravel's `SummarizeEmailJob` for email-originated tickets.

**Request body**

| Field | Type | Constraints |
|---|---|---|
| `text` | string | required, 1–20,000 chars |

```json
{ "text": "Hi, I ordered a blue jacket two weeks ago and it still hasn't arrived. My order number is 48213. Can you tell me when it will ship? Thanks, Sam" }
```

**What it does:** inputs under ~40 words are returned unchanged (skips a wasted LLM call for anything already short). Otherwise calls the configured LLM provider for a plain-text 2–3 sentence summary. Unlike `/sentiment`, this endpoint does **not** catch provider exceptions — a provider failure surfaces as a `500`, and Laravel's `AiServiceClient::summarize()` is what falls back (to a truncated snippet of the original text) on that side.

**Response `200`**
```json
{ "summary": "Sam is asking about the shipping status of order #48213, a blue jacket ordered two weeks ago that hasn't arrived yet." }
```
