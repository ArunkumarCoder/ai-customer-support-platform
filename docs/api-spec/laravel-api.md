# Laravel API Reference

Base URL: `{APP_URL}/api` (local dev: `http://localhost:8000/api`)

Generated directly from `routes/api.php`, the FormRequest validation classes, and the controllers as they exist today — not from a spec written ahead of the code. Anything marked **not implemented** is a real, routed endpoint that currently returns an empty response; it's listed so the route table stays complete, not because it does anything yet.

## Auth

Agent-facing endpoints use [Laravel Sanctum](https://laravel.com/docs/sanctum) personal access tokens. `POST /login` returns a `token`; send it back as:

```
Authorization: Bearer <token>
Accept: application/json
```

There is no user-facing auth on the public widget endpoint (`POST /chat`) — visitors are identified only by a client-generated `visitor_id`.

## Rate limiting

| Scope | Limit |
|---|---|
| `POST /chat` | 10 requests / minute (per client, Laravel's default `throttle` keying) |
| Every route under `auth:sanctum` (logout, me, tickets, messages) | 60 requests / minute |
| Every route under `auth:sanctum` + `admin` (documents) | 60 requests / minute |
| `POST /login` | **not rate-limited** — no `throttle` middleware is currently applied to this route |

Exceeding a limit returns `429 Too Many Requests` with a `Retry-After` header and body `{"message": "Too Many Attempts."}`.

## Errors

Standard Laravel shapes throughout:

| Status | When | Body |
|---|---|---|
| 401 | Missing/invalid Sanctum token | `{"message": "Unauthenticated."}` |
| 403 | Authenticated but not an admin, on an admin-only route | `{"message": "Forbidden — admin access required."}` |
| 404 | Route-model-bound resource doesn't exist (e.g. `GET /tickets/999`) | `{"message": "..."}` |
| 422 | Validation failure | `{"message": "...", "errors": {"field": ["reason"]}}` |
| 429 | Rate limit exceeded | see above |

---

## Auth

### `POST /login`

Public. Validated by `LoginRequest`.

| Field | Rules |
|---|---|
| `email` | required, valid email, max 255 |
| `password` | required, string, max 255 |

**Request**
```json
{ "email": "admin@example.com", "password": "password" }
```

**Response `200`**
```json
{
  "token": "1|abcdef1234567890...",
  "agent": { "id": 1, "name": "Admin", "email": "admin@example.com", "role": "admin" }
}
```

Wrong credentials → `422` with `errors.email` set (not `401` — a login failure is modeled as a validation error, matching `AuthController::login()`'s use of `ValidationException`).

### `POST /logout`
`auth:sanctum`. Revokes the calling token (`$request->user()->currentAccessToken()->delete()`).

**Response `200`**: `{"message": "Logged out successfully."}`

### `GET /me`
`auth:sanctum`. Returns the authenticated agent record (`id`, `name`, `email`, `role`, timestamps — `password` is always hidden).

### `GET /user`
`auth:sanctum`. Same idea as `/me`, registered separately (Laravel's default scaffold route) — not used by the React app, which calls `/me`.

---

## Tickets

All routes below require `auth:sanctum`. Registered via `Route::apiResource('tickets', ...)`, which is why `store`/`destroy` exist as routes even though they're unimplemented.

### `GET /tickets`
Lists tickets, `latest()` first (newest `created_at` first).

**Visibility:** admins see every ticket; non-admin agents only see tickets that are unassigned (`assigned_agent_id IS NULL`) or assigned to them.

**Query params** (all optional, exact-match filters):

| Param | Values |
|---|---|
| `status` | `open` \| `in_progress` \| `escalated` \| `resolved` \| `closed` |
| `priority` | `low` \| `normal` \| `high` \| `urgent` |
| `sentiment` | `positive` \| `neutral` \| `negative` |

**Response `200`** — plain array:
```json
[
  {
    "id": 42,
    "user_id": null,
    "visitor_id": "8cf256b0-c903-47b8-852e-87aeee06b420",
    "status": "escalated",
    "priority": "normal",
    "sentiment_summary": "negative",
    "assigned_agent_id": null,
    "summary": null,
    "created_at": "2026-09-15T09:29:10.000000Z",
    "updated_at": "2026-09-15T09:44:25.000000Z"
  }
]
```

### `POST /tickets`
**Not implemented.** Routed (part of `apiResource`) but the controller method is an empty stub — returns `200` with an empty body. Tickets are only ever created by the chat flow (`POST /chat`) or the `email:poll` command, never directly via this endpoint.

### `GET /tickets/{ticket}`
Ticket with its `messages` eager-loaded, ordered oldest → newest.

**Response `200`**
```json
{
  "id": 42,
  "status": "escalated",
  "priority": "normal",
  "sentiment_summary": "negative",
  "assigned_agent_id": null,
  "summary": null,
  "messages": [
    { "id": 101, "ticket_id": 42, "sender": "customer", "body": "How do I reset my password?", "sentiment_label": "neutral", "sentiment_score": 0.5, "created_at": "..." },
    { "id": 102, "ticket_id": 42, "sender": "bot", "body": "I'm sorry, but I don't have information on that...", "sentiment_label": null, "sentiment_score": null, "created_at": "..." }
  ]
}
```

`404` if the ID doesn't exist.

### `PUT /tickets/{ticket}` / `PATCH /tickets/{ticket}`
Validated by `UpdateTicketRequest` — the **only** field this endpoint accepts is `status`.

| Field | Rules |
|---|---|
| `status` | required, one of `open`, `in_progress`, `escalated`, `resolved`, `closed` |

**Request**
```json
{ "status": "resolved" }
```

**Response `200`**: the updated ticket.

### `DELETE /tickets/{ticket}`
**Not implemented.** Routed, empty-stub controller method, returns `200` with an empty body.

---

## Messages

### `POST /tickets/{ticket}/messages`
`auth:sanctum`. Creates an **agent** reply on the ticket (the `sender` is always `'agent'` — there's no way to post a customer/bot message through this endpoint).

| Field | Rules |
|---|---|
| `body` | required, string, max 2000 |

**Side effects:** if the ticket is unassigned, it's auto-assigned to the replying agent; if its status was `escalated`, it flips to `in_progress`.

**Request**
```json
{ "body": "Thanks for reaching out — I've refunded your order, you should see it in 5-7 business days." }
```

**Response `201`**
```json
{ "id": 205, "ticket_id": 42, "sender": "agent", "body": "Thanks for reaching out...", "sentiment_label": null, "sentiment_score": null, "created_at": "..." }
```

---

## Documents

All routes below require `auth:sanctum` **and** the `admin` middleware (`EnsureIsAdmin` — non-admin agents get `403`).

### `GET /documents`
Lists every uploaded document, newest first, with its `uploader` eager-loaded. `content` (the full text) is deliberately **not** included here — see `Document::$hidden` — so a table of many documents doesn't ship every one's full text on a page that only needs metadata.

**Response `200`**
```json
[
  {
    "id": 5,
    "title": "Customer Support Knowledge Base",
    "source_file": "documents/VhMmQK1B36VJhhRBzZmWp9sFwenXJljTOycI6h5N.txt",
    "uploaded_by": 1,
    "created_at": "2026-09-15T11:59:33.000000Z",
    "updated_at": "2026-09-15T11:59:33.000000Z",
    "uploader": { "id": 1, "name": "Admin", "email": "admin@example.com", "role": "admin" }
  }
]
```

### `GET /documents/{document}`
Same shape as above, plus the actual content:

- `content` (string \| null) — the document's full text, read from the `content` DB column (durable) first, falling back to the on-disk file only for rows uploaded before that column existed.
- `content_available` (bool) — `false` when neither the column nor the disk file has it (e.g. the file was lost to an ephemeral host's disk being wiped on redeploy, before the durable column existed).

`404` if the ID doesn't exist.

### `POST /documents`
Multipart form upload. Validated by `StoreDocumentRequest`.

| Field | Rules |
|---|---|
| `title` | required, string, max 255 |
| `file` | required, file, mime type `txt` or `md` only, max 5120 KB (5MB) |

**Kill-switch:** if `DOCUMENT_UPLOADS_ENABLED=false` (checked via `config('services.documents.uploads_enabled')`), this returns `403` with `{"message": "Document uploads are temporarily disabled."}` before touching the file at all — a temporary, reversible restriction, independent of the frontend's own disabled upload button.

**Side effect:** dispatches `IngestDocumentJob`, which calls the FastAPI `/ingest` endpoint to chunk and embed the text. Whether this runs immediately (blocking the response) or later on a queue worker depends entirely on `QUEUE_CONNECTION` — it's `sync` in production for this project (no worker deployed), `redis` for local dev.

**Response `201`**
```json
{ "id": 6, "title": "Refund Policy", "source_file": "documents/xyz.txt", "uploaded_by": 1, "created_at": "...", "updated_at": "..." }
```
(no `uploader` key here — unlike `index`/`show`, `store()` doesn't eager-load the relation before responding.)

### `GET /documents/{id}` (update) / `DELETE /documents/{id}`
The controller has `update()`/`destroy()` methods, but **no route is registered for either** — they're unreachable dead code, not just unimplemented stubs.

---

## Chat (public, unauthenticated)

### `POST /chat`
No auth — this is the endpoint the anonymous widget calls. Rate-limited to 10/minute. Validated by `ChatMessageRequest`.

| Field | Rules |
|---|---|
| `message` | required, string, max 2000 |
| `visitor_id` | required, string, max 255 |

**Behavior:** finds the visitor's most recent non-resolved/closed ticket, or creates a new one; logs the customer message; dispatches `AnalyzeSentimentJob` (queued, doesn't block the response); calls the FastAPI `/chat` endpoint; stores the bot's reply as a message; if `escalate` came back `true` (or the AI service call itself failed/timed out — a fail-safe), flips the ticket's status to `escalated`.

**Request**
```json
{ "visitor_id": "8cf256b0-c903-47b8-852e-87aeee06b420", "message": "How do I track my order?" }
```

**Response `200`**
```json
{
  "reply": "Once your order ships, you'll receive an email with a tracking number...",
  "ticket_id": 42,
  "escalated": false
}
```

If the AI service is unreachable, `reply` becomes a generic apology (`AiServiceClient::chat()`'s fallback) and `escalated` is forced `true` — the customer always gets a response, never a raw error.
