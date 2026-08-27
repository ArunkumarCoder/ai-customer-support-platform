# AI Customer Support Platform — Project Context

This file gives Claude Code persistent context on this project. Read it fully before making changes. Update the "Current Progress" section at the end of each work session so future sessions pick up where you left off.

## Elevator Pitch

An enterprise-style AI-powered customer support platform combining a Laravel backend for business logic and ticketing, a FastAPI microservice for AI/RAG operations, a React frontend for both the customer chat widget and the admin dashboard, backed by a shared PostgreSQL database (with pgvector) and a pluggable LLM layer (OpenAI, Anthropic, or Groq). Built as a portfolio piece to demonstrate polyglot microservice architecture, applied AI (RAG, sentiment, summarization), clean API design, and enterprise development practices (auth, async queues, testing, deployment).

## Tech Stack

- **Backend (business logic):** Laravel 12, PHP 8.2+, Sanctum for auth, Redis-backed queues
- **AI microservice:** FastAPI, Python 3.11+, SQLAlchemy + Alembic (migrations), pgvector, psycopg2, sentence-transformers
- **Frontend:** React 18 + Vite + TypeScript, axios, react-router
- **Database:** PostgreSQL 15+ with the `pgvector` extension enabled
- **Queue/cache:** Redis
- **AI provider:** chat is pluggable via a strategy pattern in `app/services/llm/` (`base.py` + one module per provider + `factory.py`), selected at runtime by the `LLM_PROVIDER` env var — currently supports `openai`, `anthropic`, and `groq` (Groq's free tier is the default for local dev, since OpenAI/Anthropic both require paid credits). Embeddings use a local `sentence-transformers` model (`all-MiniLM-L6-v2`, 384-dim) via `app/services/embeddings.py` — no per-request API cost, same model for ingestion and query-time retrieval.

## Architecture Rules (non-negotiable)

1. **React talks only to Laravel.** The frontend never calls FastAPI directly. This keeps one clean public API surface.
2. **Laravel talks only to FastAPI for AI work.** Laravel owns tickets, users, auth, and orchestration; it forwards AI-specific requests (chat, ingest, sentiment, summarize) to FastAPI over HTTP.
3. **Service-to-service auth:** Laravel → FastAPI calls are authenticated with a shared secret header (e.g. `X-Internal-Api-Key`), verified in FastAPI's `core/security.py`. This is not user-facing auth — it just proves the request came from Laravel.
4. **One Postgres instance, two owners.** Laravel's Eloquent migrations own the business tables (`users`, `agents`, `tickets`, `messages`). FastAPI's SQLAlchemy models own the vector table (`document_chunks`). Neither service should write migrations for the other's tables.
5. **Anything slow or non-interactive goes through a Laravel queue job** (email polling, summarization, sentiment scoring, document ingestion) — never block an HTTP request on an LLM call longer than a simple chat turn.

## Data Flows

**Chat / RAG flow:** customer sends a message in the widget (identified by a client-generated `visitor_id` from `localStorage`, no auth — the widget is anonymous) → Laravel finds the visitor's open ticket or creates one, logs the message, calls FastAPI `/chat` with the message → FastAPI embeds the query, runs a pgvector similarity search over `document_chunks`, computes the minimum cosine distance across retrieved chunks, builds a RAG prompt, calls the configured LLM provider (`app/services/llm/factory.py`) → returns `{reply, escalate}`, where `escalate` is `true` when no chunks were retrieved or the minimum distance exceeds `CONFIDENCE_DISTANCE_THRESHOLD`. Laravel stores the bot reply as a message, marks the ticket `escalated` if flagged (a failed/unreachable FastAPI call also forces `escalate: true` as a fail-safe), and returns `{reply, ticket_id, escalated}` to React, which shows a human-handoff notice when escalated.

**Document ingestion flow:** an agent uploads a document → Laravel stores the file and queues `IngestDocumentJob` → the job calls FastAPI `/ingest` (throws on failure, so it lands in `failed_jobs` instead of silently succeeding) → FastAPI chunks the text, generates embeddings via `sentence-transformers` (`all-MiniLM-L6-v2`), and writes rows into `document_chunks`.

**Email summarization flow:** a scheduled Laravel job polls the support inbox (Gmail API or IMAP) → new emails become tickets → a queued job sends the body to FastAPI `/summarize` → the summary is stored on the ticket.

**Sentiment flow:** every inbound customer message triggers an async job → FastAPI `/sentiment` returns a label/score → stored on the message, rolled up onto the ticket, used to prioritize the dashboard queue.

**Agent flow:** agent logs in via `POST /login` (email/password checked against the `agents` table, returns a Sanctum `plainTextToken` + agent info) → subsequent requests authenticate with `Authorization: Bearer <token>` against `auth:sanctum` (`GET /me`, `POST /logout` to revoke the token) → dashboard lists tickets filterable by status/sentiment/priority → agent opens a ticket, sees the full transcript, replies or resolves.

## Repository Structure

```
ai-customer-support-platform/
├── README.md
├── CLAUDE.md                        # this file
├── docker-compose.yml               # local Postgres + Redis
├── docs/
│   ├── architecture.md
│   ├── api-spec/
│   └── er-diagram.png
├── backend-laravel/
│   ├── app/
│   │   ├── Http/Controllers/Api/
│   │   ├── Http/Middleware/
│   │   ├── Models/
│   │   ├── Services/AiServiceClient.php
│   │   └── Jobs/
│   ├── database/migrations/
│   ├── routes/api.php
│   ├── tests/
│   └── .env.example
├── ai-service-fastapi/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/          # chat.py, ingest.py, sentiment.py, summarize.py
│   │   ├── core/         # config.py, security.py
│   │   ├── services/
│   │   │   ├── llm/      # base.py, factory.py, openai_provider.py, anthropic_provider.py, groq_provider.py
│   │   │   └── embeddings.py, retriever.py, chunking.py, prompt_builder.py
│   │   ├── db/           # session.py, models.py (DocumentChunk)
│   │   └── schemas/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
├── frontend-react/
│   ├── src/
│   │   ├── widget/
│   │   ├── dashboard/
│   │   ├── api/
│   │   ├── auth/
│   │   └── App.tsx
│   ├── public/
│   ├── package.json
│   └── .env.example
└── scripts/
    └── setup.sh
```

## Database Schema (high level)

- `users` — customer/end-user accounts
- `agents` — support agents/admins, role field (agent/admin)
- `tickets` — id, user_id (nullable), visitor_id (nullable, indexed — anonymous widget visitors), status, priority, sentiment_summary, assigned_agent_id, timestamps
- `messages` — id, ticket_id, sender (customer/bot/agent), body, sentiment_label, sentiment_score, timestamps
- `documents` — id, title, source_file, uploaded_by, timestamps
- `document_chunks` — id, document_id, chunk_text, embedding (vector), timestamps

## Environment & Service Communication

- Laravel `.env`: standard Postgres connection vars, Redis connection vars, `AI_SERVICE_URL` (FastAPI base URL), `AI_SERVICE_SECRET` (shared secret sent to FastAPI)
- FastAPI `.env`: `LLM_PROVIDER` (`openai` | `anthropic` | `groq`), the matching `<PROVIDER>_API_KEY` / `<PROVIDER>_MODEL` pair (all three pairs may be present; only the selected provider's is required), `INTERNAL_API_KEY` (must match Laravel's `AI_SERVICE_SECRET`), `DATABASE_URL` (same Postgres instance), `CONFIDENCE_DISTANCE_THRESHOLD` (min pgvector cosine distance across retrieved chunks above which `/chat` sets `escalate: true`; calibrated to `0.65` for the `all-MiniLM-L6-v2` model — `0.4` was too strict and escalated most real paraphrased questions, not just poorly-covered ones)
- React `.env`: `VITE_API_BASE_URL` pointing at Laravel only
- Default local ports: Laravel `8000`, FastAPI `8001`, React `5173`, Postgres `5432`, Redis `6379`

## Development Commands

**Laravel:** `php artisan serve` to run, `php artisan test` for PHPUnit, `php artisan migrate` for schema changes, `php artisan queue:work` to process jobs locally.

**FastAPI:** `uvicorn app.main:app --reload --port 8001` to run, `pytest` for tests.

**React:** `npm run dev` to run, `npm run build` for production build.

**Postgres:** enable the extension once per database with `CREATE EXTENSION IF NOT EXISTS vector;`

## Coding Conventions

- Laravel: PSR-12, use Form Requests for validation, keep controllers thin (business logic in Services)
- FastAPI: full type hints, Pydantic schemas for all request/response bodies, one router per resource under `app/api/`; LLM calls always go through the `LLMProvider` strategy in `app/services/llm/` — never call a provider SDK directly from a route. Add a new provider by implementing `LLMProvider` and registering it in `factory.py`.
- React: TypeScript strict mode, functional components with hooks, keep `widget/` and `dashboard/` visually and logically separate even though they share the `api/` client layer

## Current Progress

Roadmap: 6 weeks, ~20 hrs/week (4 hrs/day, 5 days/week), full feature scope.

- [x] **Week 1 — Foundations:** Laravel auth scaffolding (Sanctum, agents/users); FastAPI `/chat` wired to a pluggable LLM provider (OpenAI/Anthropic/Groq via `app/services/llm/`) with shared-secret auth; end-to-end Laravel → FastAPI → LLM smoke test passing. (Note: `tickets`/`messages` tables and the React widget were still empty stubs until Week 2 below — this box was previously checked prematurely.)
- [x] **Week 2 — RAG core:** `tickets`/`messages` tables + models built from scratch (previously undocumented gap); pgvector document ingestion pipeline (`Document` upload → `IngestDocumentJob` → FastAPI `/ingest` → chunk + embed via `sentence-transformers` → `document_chunks`); retrieval + RAG prompt construction (`retriever.py`, `prompt_builder.py`); full chatbot flow with visitor-tracked tickets (anonymous `visitor_id`, no auth on `/chat`); confidence-based auto-escalation (`CONFIDENCE_DISTANCE_THRESHOLD`, calibrated to `0.65`) that flags a ticket `escalated` on low-confidence retrieval, no chunks, or an unreachable AI service; React chat widget (`ChatWidget.tsx`) built and wired end-to-end with human-handoff messaging
- [ ] **Week 3 — Admin dashboard:** real agent auth done (`POST /login`, `POST /logout`, `GET /me` via Sanctum tokens against the `agents` table, seeded via `AgentSeeder`); still needed: ticket list/detail/filter UI, agent reply flow, role-based access (`TicketController` is still an unimplemented stub)
- [ ] **Week 4 — Sentiment + email summarization:** `/sentiment` and `/summarize` endpoints, queue jobs, dashboard surfacing
- [ ] **Week 5 — Testing & hardening:** PHPUnit + pytest coverage, input validation, rate limiting, security pass, latency/caching check
- [ ] **Week 6 — Deploy & package:** deploy all three services + Postgres, write README + architecture diagram, record demo video

**Last updated:** 2026-08-27 — real agent authentication added (`AuthController` with `login`/`logout`/`me`, Sanctum tokens issued against the `agents` table via `HasApiTokens`, `AgentSeeder` for a default admin), replacing the earlier tinker-minted-token workaround used to test `/documents`. Confidence-based ticket escalation implemented end-to-end (FastAPI computes escalate from RAG retrieval distance, Laravel creates/reuses tickets by visitor_id and marks them escalated, React widget shows a handoff notice); this also surfaced and filled in that `tickets`/`messages` schema and the chat widget were never actually built despite earlier checklist claims.

When resuming a session, check the boxes above, look at git log / recent commits for what's actually been built, and continue from there rather than assuming this checklist is perfectly in sync with the code.
