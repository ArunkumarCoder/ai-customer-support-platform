# AI Customer Support Platform — Project Context

This file gives Claude Code persistent context on this project. Read it fully before making changes. Update the "Current Progress" section at the end of each work session so future sessions pick up where you left off.

## Elevator Pitch

An enterprise-style AI-powered customer support platform combining a Laravel backend for business logic and ticketing, a FastAPI microservice for AI/RAG operations, a React frontend for both the customer chat widget and the admin dashboard, backed by a shared PostgreSQL database (with pgvector) and OpenAI. Built as a portfolio piece to demonstrate polyglot microservice architecture, applied AI (RAG, sentiment, summarization), clean API design, and enterprise development practices (auth, async queues, testing, deployment).

## Tech Stack

- **Backend (business logic):** Laravel 12, PHP 8.2+, Sanctum for auth, Redis-backed queues
- **AI microservice:** FastAPI, Python 3.11+, SQLAlchemy, pgvector, OpenAI API
- **Frontend:** React 18 + Vite + TypeScript, axios, react-router
- **Database:** PostgreSQL 15+ with the `pgvector` extension enabled
- **Queue/cache:** Redis
- **AI provider:** OpenAI (text-embedding-3-small for embeddings; a chat-completion model for chat, sentiment, and summarization — pick the current cost-effective model, e.g. gpt-4o-mini class)

## Architecture Rules (non-negotiable)

1. **React talks only to Laravel.** The frontend never calls FastAPI directly. This keeps one clean public API surface.
2. **Laravel talks only to FastAPI for AI work.** Laravel owns tickets, users, auth, and orchestration; it forwards AI-specific requests (chat, ingest, sentiment, summarize) to FastAPI over HTTP.
3. **Service-to-service auth:** Laravel → FastAPI calls are authenticated with a shared secret header (e.g. `X-Internal-Api-Key`), verified in FastAPI's `core/security.py`. This is not user-facing auth — it just proves the request came from Laravel.
4. **One Postgres instance, two owners.** Laravel's Eloquent migrations own the business tables (`users`, `agents`, `tickets`, `messages`). FastAPI's SQLAlchemy models own the vector table (`document_chunks`). Neither service should write migrations for the other's tables.
5. **Anything slow or non-interactive goes through a Laravel queue job** (email polling, summarization, sentiment scoring, document ingestion) — never block an HTTP request on an OpenAI call longer than a simple chat turn.

## Data Flows

**Chat / RAG flow:** customer sends a message in the widget → Laravel authenticates, logs the message, finds/creates a ticket → Laravel calls FastAPI `/chat` with the message + ticket context → FastAPI embeds the query, runs a pgvector similarity search over `document_chunks`, builds a RAG prompt, calls OpenAI → response returns through Laravel, is stored as a message, and is sent back to React. Low-confidence or human-requested cases get flagged for agent escalation instead of an auto-reply.

**Document ingestion flow:** admin uploads a document in the dashboard → Laravel stores the file and queues a job → the job calls FastAPI `/ingest` → FastAPI chunks the text, generates embeddings via OpenAI, and writes rows into `document_chunks`.

**Email summarization flow:** a scheduled Laravel job polls the support inbox (Gmail API or IMAP) → new emails become tickets → a queued job sends the body to FastAPI `/summarize` → the summary is stored on the ticket.

**Sentiment flow:** every inbound customer message triggers an async job → FastAPI `/sentiment` returns a label/score → stored on the message, rolled up onto the ticket, used to prioritize the dashboard queue.

**Agent flow:** agent logs in via Sanctum → dashboard lists tickets filterable by status/sentiment/priority → agent opens a ticket, sees the full transcript, replies or resolves.

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
│   │   ├── services/     # openai_client.py, embeddings.py, retriever.py, chunking.py
│   │   ├── db/           # session.py, models.py
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
- `tickets` — id, user_id, status, priority, sentiment_summary, assigned_agent_id, timestamps
- `messages` — id, ticket_id, sender (customer/bot/agent), body, sentiment_label, sentiment_score, timestamps
- `documents` — id, title, source_file, uploaded_by, timestamps
- `document_chunks` — id, document_id, chunk_text, embedding (vector), timestamps

## Environment & Service Communication

- Laravel `.env`: standard Postgres connection vars, Redis connection vars, `AI_SERVICE_URL` (FastAPI base URL), `AI_SERVICE_SECRET` (shared secret sent to FastAPI)
- FastAPI `.env`: `DATABASE_URL` (same Postgres instance), `OPENAI_API_KEY`, `INTERNAL_API_KEY` (must match Laravel's `AI_SERVICE_SECRET`)
- React `.env`: `VITE_API_BASE_URL` pointing at Laravel only
- Default local ports: Laravel `8000`, FastAPI `8001`, React `5173`, Postgres `5432`, Redis `6379`

## Development Commands

**Laravel:** `php artisan serve` to run, `php artisan test` for PHPUnit, `php artisan migrate` for schema changes, `php artisan queue:work` to process jobs locally.

**FastAPI:** `uvicorn app.main:app --reload --port 8001` to run, `pytest` for tests.

**React:** `npm run dev` to run, `npm run build` for production build.

**Postgres:** enable the extension once per database with `CREATE EXTENSION IF NOT EXISTS vector;`

## Coding Conventions

- Laravel: PSR-12, use Form Requests for validation, keep controllers thin (business logic in Services)
- FastAPI: full type hints, Pydantic schemas for all request/response bodies, one router per resource under `app/api/`
- React: TypeScript strict mode, functional components with hooks, keep `widget/` and `dashboard/` visually and logically separate even though they share the `api/` client layer

## Current Progress

Roadmap: 6 weeks, ~20 hrs/week (4 hrs/day, 5 days/week), full feature scope.

- [ ] **Week 1 — Foundations:** Laravel auth + ticket CRUD; FastAPI skeleton + bare `/chat`; React scaffold + basic widget; end-to-end smoke test
- [ ] **Week 2 — RAG core:** pgvector setup, document ingestion pipeline, retrieval + RAG prompt construction, full chatbot flow, auto-escalation to tickets
- [ ] **Week 3 — Admin dashboard:** ticket list/detail/filter UI, agent reply flow, role-based access
- [ ] **Week 4 — Sentiment + email summarization:** `/sentiment` and `/summarize` endpoints, queue jobs, dashboard surfacing
- [ ] **Week 5 — Testing & hardening:** PHPUnit + pytest coverage, input validation, rate limiting, security pass, latency/caching check
- [ ] **Week 6 — Deploy & package:** deploy all three services + Postgres, write README + architecture diagram, record demo video

**Last updated:** Not yet started — Day 1 of Week 1 is next.

When resuming a session, check the boxes above, look at git log / recent commits for what's actually been built, and continue from there rather than assuming this checklist is perfectly in sync with the code.
