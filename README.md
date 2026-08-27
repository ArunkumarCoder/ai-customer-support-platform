# AI Customer Support Platform

An enterprise-style AI-powered customer support platform combining a **Laravel** backend for business logic and ticketing, a **FastAPI** microservice for AI/RAG operations, and a **React** frontend for both the customer chat widget and the admin dashboard — backed by a shared **PostgreSQL** database (with `pgvector`) and a pluggable LLM layer (**OpenAI**, **Anthropic**, or **Groq**).

Built as a portfolio piece to demonstrate polyglot microservice architecture, applied AI (RAG, sentiment analysis, summarization), clean API design, and enterprise development practices (auth, async queues, testing, deployment).

> 🚧 **Status: Week 2 complete, Week 3 started — Admin dashboard.** Full chat flow is wired end-to-end: the React widget talks to Laravel, which tracks anonymous visitors as tickets and forwards messages to FastAPI's RAG pipeline (pgvector retrieval + the configured LLM provider). Low-confidence answers automatically escalate the ticket for human follow-up. Real agent authentication (`/login`, `/logout`, `/me` via Sanctum tokens) is in place; the dashboard UI itself is still to come. See [Current Progress](#current-progress) below.

## Architecture

```
┌──────────────┐        ┌──────────────────┐        ┌────────────────────┐
│ React (5173) │──────▶ │ Laravel (8000)   │──────▶ │ FastAPI (8001)     │
│ widget + admin│  API   │ auth, tickets,   │ HTTP + │ chat, ingest,      │
│ dashboard     │        │ queues, orchestr.│ shared │ sentiment, summarize│
└──────────────┘        └──────────────────┘  secret └────────────────────┘
                                  │                            │
                                  ▼                            ▼
                          ┌───────────────┐          ┌──────────────────┐
                          │ PostgreSQL    │◀─────────│ pgvector          │
                          │ users, agents,│          │ document_chunks   │
                          │ tickets,      │          └──────────────────┘
                          │ messages      │
                          └───────────────┘
                                  ▲
                                  │
                          ┌───────────────┐
                          │ Redis (queues)│
                          └───────────────┘
```

**Non-negotiable rules:**

1. React talks only to Laravel — never directly to FastAPI.
2. Laravel talks to FastAPI only for AI work (chat, ingest, sentiment, summarize); Laravel owns auth, tickets, and orchestration.
3. Laravel → FastAPI requests are authenticated with a shared-secret header (`X-Internal-Api-Key`), verified in FastAPI's `core/security.py`.
4. One Postgres instance, two schema owners: Laravel's Eloquent migrations own `users` / `agents` / `tickets` / `messages`; FastAPI's SQLAlchemy models own the vector table `document_chunks`.
5. Anything slow or non-interactive (email polling, summarization, sentiment scoring, document ingestion) runs through a Laravel queue job, never inline on a request.

See [CLAUDE.md](CLAUDE.md) for the full architecture rules, data flows, and schema, and [docs/architecture.md](docs/architecture.md) for diagrams.

## Tech Stack

| Layer | Stack |
|---|---|
| Backend (business logic) | Laravel 12, PHP 8.2+, Sanctum, Redis-backed queues |
| AI microservice | FastAPI, Python 3.11+, SQLAlchemy + Alembic, pgvector, psycopg2, sentence-transformers |
| Frontend | React 18 + Vite + TypeScript, axios, react-router |
| Database | PostgreSQL 15+ with the `pgvector` extension |
| Queue / cache | Redis |
| AI provider | Pluggable via `LLM_PROVIDER` — OpenAI, Anthropic, or Groq (strategy pattern in `app/services/llm/`); Groq's free tier is the default for local dev. Embeddings via local `sentence-transformers` (`all-MiniLM-L6-v2`) |

## Repository Structure

```
ai-customer-support-platform/
├── CLAUDE.md                 # architecture rules, data flows, schema, progress tracker
├── docker-compose.yml        # local Postgres (pgvector) + Redis
├── docs/                     # architecture notes, API spec, ER diagram
├── backend-laravel/          # auth, tickets, orchestration, queue jobs
├── ai-service-fastapi/       # chat/RAG, ingest, sentiment, summarize endpoints
├── frontend-react/           # chat widget + admin dashboard
└── scripts/setup.sh          # local environment bootstrap
```

## Prerequisites

- PHP 8.2+, Composer
- Python 3.11+
- Node.js 18+
- Docker (for Postgres + Redis via `docker-compose.yml`)
- An API key for at least one supported LLM provider (OpenAI, Anthropic, or Groq — Groq offers a free tier, easiest for local dev)

## Local Setup

**1. Start Postgres and Redis:**

```bash
docker compose up -d
```

**2. Enable pgvector** (once per database):

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

**3. Laravel backend:**

```bash
cd backend-laravel
composer install
cp .env.example .env   # set DB_*, REDIS_*, AI_SERVICE_URL, AI_SERVICE_SECRET
php artisan key:generate
php artisan migrate
php artisan db:seed --class=AgentSeeder   # creates admin@example.com / password for /login
php artisan serve       # http://localhost:8000
php artisan queue:work  # in a separate terminal
```

**4. FastAPI AI service:**

```bash
cd ai-service-fastapi
python -m venv venv && source venv/bin/activate   # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env   # set LLM_PROVIDER (openai|anthropic|groq) + that provider's API key/model, INTERNAL_API_KEY (must match Laravel's AI_SERVICE_SECRET)
uvicorn app.main:app --reload --port 8001
```

**5. React frontend:**

```bash
cd frontend-react
npm install
cp .env.example .env   # set VITE_API_BASE_URL to the Laravel URL, e.g. http://localhost:8000/api
npm run dev             # http://localhost:5173
```

## Testing

```bash
# Laravel
cd backend-laravel && php artisan test

# FastAPI
cd ai-service-fastapi && pytest
```

## Current Progress

- [x] FastAPI `/chat` endpoint wired to a pluggable LLM provider (OpenAI/Anthropic/Groq)
- [x] End-to-end smoke test across all three services
- [x] `tickets`/`messages` schema, document upload + async ingestion pipeline (pgvector + `sentence-transformers`), RAG retrieval, full chatbot flow
- [x] Confidence-based auto-escalation: low-similarity retrieval, no matching documents, or an unreachable AI service all flag a ticket `escalated`
- [x] React chat widget tracking anonymous visitors, showing a human-handoff notice on escalation
- [x] Real agent authentication (`POST /login`, `POST /logout`, `GET /me` via Sanctum tokens against the `agents` table, seeded via `AgentSeeder`)
- [ ] Admin dashboard (ticket list/detail/filter, agent replies, role-based access) — `TicketController` is still an unimplemented stub
- [ ] Sentiment + email summarization endpoints and queue jobs
- [ ] Testing/hardening pass, rate limiting, latency checks
- [ ] Deployment of all services + demo

Full roadmap and week-by-week breakdown live in [CLAUDE.md](CLAUDE.md#current-progress).

## License

Portfolio project — no license specified yet.
