# Demo Script

A ~3–5 minute walkthrough of the live deployed app (not localhost), recorded in one take against:

- **App:** https://ai-customer-support-platform-mu.vercel.app/
- Backing services (not shown directly — this project's own rule is React talks only to Laravel): Laravel on Render, FastAPI on Render, Postgres on Neon.

**Before recording:** both backend services are on Render's free tier and spin down when idle. Load the homepage and send one throwaway warm-up message 1–2 minutes before recording, so the real take doesn't sit on a 15–30 second cold-start pause. Have the admin credentials open in a password manager, ready to paste — don't type them from memory on camera.

Timings below are targets for a smooth single take, not hard cuts.

---

### 1. Homepage & value prop — 0:00–0:20

- Load `https://ai-customer-support-platform-mu.vercel.app/`.
- Let the hero render: **"AI-powered support that resolves tickets instantly"**.
- One sentence, in your own words: *"This is a full support platform — Laravel backend, a FastAPI microservice for the AI/RAG side, React frontend, Postgres with pgvector for the knowledge base."*
- Scroll to the **"Try it yourself"** section — the embedded widget here is the exact same component customers use in production, not a mockup.

### 2. Grounded answer — 0:20–1:00

- Click into the chat input (placeholder `Type a message...`).
- Type exactly: **`How do I track my order?`**
- Click **Send**.
- Wait for the reply (should be a few seconds once warm). Narrate while it loads: *"This goes through Laravel, which forwards it to the FastAPI service — that embeds the question, runs a pgvector similarity search against ingested support documents, and only then calls the LLM with the retrieved context."*
- Point out the reply is specific (tracking email, Orders page, delivery windows) — **not** the model improvising, it's grounded in a real ingested document.

### 3. Escalation — 1:00–1:40

- Same widget, type exactly: **`This is really frustrating — I still can't figure out how to reset my password, and nobody has replied to my last email.`**
- Click **Send**, wait for the reply.
- Narrate: *"Password reset isn't in the knowledge base, so instead of guessing, it hands off to a human — and this message's tone is also going to matter in a second."*
- Point out the human-handoff notice under the reply.

### 4. Agent login — 1:40–2:00

- Click **Agent login** (top nav or hero button).
- Enter the seeded admin email and password (from your password manager — don't say the password out loud).
- Land on the dashboard ticket list.

### 5. Find the escalated ticket — 2:00–2:40

- Point out the stat boxes (Total / Open / Escalated / Resolved) — click the **Escalated** stat box to filter the list down to it.
- The ticket from step 3 should be at (or near) the top — click into it.
- On the detail page, point out:
  - The **sentiment badge** in the header/message tags — the frustrated tone from step 3 should show as a **negative** sentiment label, scored automatically, no manual tagging.
  - The message thread showing the customer message and the bot's handoff reply.

### 6. Reply as an agent — 2:40–3:20

- Type a short reply in the reply box (placeholder `Type a reply...`), e.g.: **`Hi, this is Alex from support — I can help you reset your password directly. I'll email you a reset link right now.`**
- Click **Send reply**.
- Point out the ticket's status flips from **Escalated** to **In Progress** and gets auto-assigned to you — no manual "claim" step.
- Optionally click **Mark resolved** to show that flow too, noting it hides the reply form once resolved.

### 7. Multi-provider LLM config — 3:20–3:50

- No UI for this (there's no admin settings page) — cut to the `.env.example` for the AI service or `app/services/llm/factory.py`, and narrate: *"The chat and sentiment/summarization calls all go through one provider abstraction — switching from Groq to OpenAI or Anthropic is a single environment variable, `LLM_PROVIDER`, no code changes. Groq's free tier is what's actually running behind this demo."*
- If recording only the browser (no code editor), skip the cut and just narrate this over the dashboard.

### 8. Close — 3:50–4:00

- One closing line: *"That's the full loop — RAG-grounded answers, confidence-based escalation, sentiment-aware triage, and an agent workflow, all running on live infrastructure."*

---

## Notes for whoever records this

- Every line of typed text above is copied exactly as scripted so retries land the same result — the RAG answers are deterministic enough (same retrieved chunks) that re-recording a take won't require re-writing narration.
- The escalation example doubles as the sentiment example on purpose, to fit both into one ticket instead of needing two separate demo tickets.
- If a take needs a fresh escalated ticket (e.g. the first one already got replied to and resolved), just repeat step 3 with a new tab/visitor — it always creates a new ticket since it's a new `visitor_id`.
- Clean up any tickets created purely for a rehearsal take afterward — don't leave rehearsal debris in the live production database.
