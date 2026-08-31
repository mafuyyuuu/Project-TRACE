# Backend & Database Guide

This document outlines the architecture, database structure, and integration processes for Project TRACE.

## 🏛️ Microservice Architecture

Project TRACE uses a decoupled architecture for maximum flexibility and performance:
1. **Node.js + Express (API Gateway):** Securely handles HTTP requests, manages file uploads via Multer, interacts with the database, and integrates with third-party APIs.
2. **Python Flask + EasyOCR (AI Engine):** A dedicated microservice using PyTorch-based Deep Learning to extract text (Student Numbers, Document Types) from uploaded images.
   - **Tech Stack:** Python, Flask, OpenCV, EasyOCR (PyTorch), Prophet, Random Forest.
   - **Endpoints:**
     - `POST /ocr/extract`: Used for reading uploaded document requests (e.g., Clearance forms).
     - `POST /ocr/verify`: Used during registration to read the uploaded Student ID/Diploma. Returns `{ verified: boolean, reason: string }` if it finds the school name and matching student ID.
     - `GET /forecast`: Uses Facebook Prophet ML to return a 7-day volume forecast based on historical logs.
     - `GET /ai/recommend`: Uses a Random Forest heuristic to generate prescriptive system insights based on current queue metrics.
   - **Data Flow:** The Node.js server acts as an API gateway, proxying AI requests to Flask and returning combined JSON to the frontend.
3. **n8n (Routing Engine):** Handles the conditional logic and workflow automation (e.g., routing documents from Window 1 to the Secretary and back) using webhooks.
4. **MySQL (Database):** The relational, single-source-of-truth database.

---

## 📁 Backend Code Organization (`backend/src/`)

The Express app follows a strict **route → controller → service → model** flow. Entry point is `src/server.js` (starts the listener), wrapping `src/app.js` (builds the app). Full conventions live in `CODING_PREFERENCES.md`.

| Layer | Responsibility | Rule |
| :--- | :--- | :--- |
| `routes/*.routes.js` | Maps URLs to controllers, attaches middleware | No logic |
| `controllers/*.controller.js` | Unpacks `req`, calls a service, maps errors to status codes | No SQL, no business rules |
| `services/*.service.js` | All business logic and transactions | Never touches `req`/`res` |
| `models/*.model.js` | Raw parameterized SQL, one function per query | No business rules |
| `middlewares/` | `auth` (JWT), `upload` (multer), `errorHandler` | — |
| `config/` | `db.js` (MySQL pool), `env.js` (all env vars + defaults) | Never read `process.env` elsewhere |
| `utils/AppError.js` | `badRequest` / `unauthorized` / `forbidden` / `notFound` helpers | Lets services signal HTTP status without importing `res` |
| `utils/pricing.js` | `calculateAmount`, `generateTrackingNumber` | Pure — no DB or service imports, so it is directly testable |

**Key conventions:**
- **Transactions:** every multi-write desk action (payment verification, evaluation, release, cancellation) runs inside `beginTransaction`/`commit`/`rollback` with a `FOR UPDATE` row lock. Model functions accept an optional `executor` argument so their queries can join the transaction.
- **Fail-soft integrations:** `notification.service.js`, `aiEngine.service.js`, and `n8n.service.js` log and swallow their errors. A failed SMS, an offline Flask engine, or a stopped n8n container must never roll back a committed document action.
- **Route ordering:** in `documents.routes.js`, the literal paths `/stats`, `/stats/forecast`, `/stats/insights`, and `/activity-logs` must stay **above** the `/:trackingNumber` wildcard or they'll be swallowed by it.
- **Machine-to-machine auth:** `POST /api/documents/assign` (n8n) has no user session, so it requires the shared `WEBHOOK_SECRET` in an `x-webhook-secret` header (`middlewares/webhookAuth.middleware.js`, constant-time compared). The workflow's HTTP Request nodes read it from the `TRACE_WEBHOOK_SECRET` n8n environment variable. (The legacy `/api/payments/*` gateway webhooks were deleted — they were unreachable from the frontend and superseded by the manual GCash flow.)
- **Only truly public endpoint:** `GET /api/documents/:trackingNumber` (student tracking by tracking number).
- **Uploaded files are not public.** They are served by `GET /api/files/:filename`, which authenticates the caller and checks ownership — staff may read any file, a student only files attached to their own request plus their own ID proof and their own profile picture. Filenames are reduced to a basename and the resolved path is confirmed to sit inside `uploads/`, so traversal attempts fail.
- **Rate limiting:** login is capped at 10 failed attempts per IP per 15 min (successful logins don't count), registration at 20/hour, and the rest of `/api` at 1000/15 min (`middlewares/rateLimit.middleware.js`).

### Multi-document requests
A student can request several document types at once and pay a single combined fee.

- Every item becomes its own `documents` row sharing one `request_group_id`.
- **Payment is per group:** `submitPayment` and `verifyPayment` act on every document in the group, so one GCash receipt settles the whole request.
- **Routing is per document, billing is per request:** the desk actions stay per row, so a Diploma can be waiting at Window 1 while a Transcript is still being evaluated. Only pricing's final step and the two payment writers are group-scoped, because the student pays once.
- **Transitions are guarded:** every desk action calls `assertTransition(from, to)` from `utils/documentStatus.js` before writing. An illegal move is a 400, never a silent UPDATE — `step_logs` is append-only and cannot be corrected afterwards.
- The upload route uses multer `.any()`; per-item attachments arrive as `document_0`, `document_1`, … and the legacy single `document` field still works.
- Historical rows were backfilled with their own tracking number as the group id, so every pre-existing document is simply a group of one.

### Reference data & pricing
`document_types` and `colleges` replace what used to be hardcoded `<option>` lists.
`document_types.base_fee` is admin-editable; `fee_rule` selects the calculation in `utils/pricing.js` (`flat`, or `per_semester_block` for Transcript of Records, whose per-4-semester rule isn't a single number). Fees are **always** recomputed server-side — a client-supplied `amount` is ignored.

### Graduate Application module
The Registrar hasn't finalised the questions, so nothing about the form is hardcoded:
- `grad_form_fields` holds the field definitions (label, type, required, options, order).
- `grad_application_values` stores one row per answer, so adding a field never needs a migration.
- Validation in `gradApplication.service.js` is **generated from the definitions** — making a field required or restricting a select changes what the API accepts, with no code change.

| Endpoint | Purpose |
| :--- | :--- |
| `GET /api/reference/colleges` | College list (public — signup has no token yet) |
| `GET /api/reference/document-types` | Requestable types with fees and attachment rules |
| `GET /api/grad-applications/form-fields` | The admin-defined form definition |
| `POST /api/grad-applications` | Submit an application |
| `GET /api/grad-applications/mine` | A student's own submissions |
| `GET /api/grad-applications` | Staff review queue |
| `POST /api/grad-applications/:id/review` | Staff decision |

### Admin Maintenance, Reporting & Analytics

**Deletion is deactivation.** Documents reference document types by name and users reference colleges by name, so no maintenance endpoint hard-deletes. `PATCH .../active` toggles `is_active`, hiding an entry from new requests while every historical record keeps working — and it can be restored. Two guardrails follow from this:
- A document type already referenced by documents **cannot be renamed** (the error reports how many). Its fee can still change, since fees apply per request at submission time.
- An admin **cannot deactivate their own account**, which would lock them out.

**Staff passwords.** An admin creates an account with a temporary password; the row is flagged `must_change_password`, so that secret is single-use. `updateProfile` clears the flag when the user sets their own. Resetting a password re-arms it. Passwords are hashed with bcrypt and never returned or logged.

| Endpoint | Purpose |
| :--- | :--- |
| `GET/POST /api/maintenance/staff`, `PUT /:id`, `PATCH /:id/active` | Staff CRUD |
| `GET/POST /api/maintenance/document-types`, `PUT /:id`, `PATCH /:id/active` | Document type CRUD |
| `GET/POST /api/maintenance/colleges`, `PUT /:id`, `PATCH /:id/active` | College CRUD |
| `GET /api/reports/documents` | Filtered report + summary + breakdowns |
| `GET /api/reports/analytics` | Efficiency metrics |
| `GET /api/reports/export/students.csv?category=` | active \| alumni \| others \| all |
| `GET /api/reports/export/documents.csv` | The filtered report as CSV |

**Reporting.** `report.model.js` builds every WHERE clause from fixed column names with parameterised values — no user input reaches SQL text, and `groupDocumentsBy` whitelists its column because that one is interpolated. Rows, summary and export share one filter object so they can never disagree. Page size is capped at 1000 and exports at 10,000 rows.

**CSV.** `utils/csv.js` is hand-written: it quotes fields containing commas/quotes/newlines, doubles embedded quotes, and prefixes values starting with `=`, `+`, `-` or `@` to stop spreadsheets executing user-supplied text as a formula. The controller prepends a UTF-8 BOM so Excel renders accented names correctly.

**Analytics.** All figures derive from `step_logs`, so any number can be traced to a recorded desk action. Per-clerk output is volume and actions only — never a computed score — because desks differ in difficulty.

### Payments & payment methods
`payment_methods` is admin-managed reference data (code, name, instructions, reference label, `requires_proof`), so the Registrar can enable Card or Online Banking without a deploy. The chosen method is stored on `documents.payment_method` and named in the step log.

`src/services/payment/` registers providers by name. Every method resolves to **`manual`** today: the student pays out-of-band and uploads proof, and a Finance Clerk verifies it against PLP's own records — deliberate, because payments must reconcile against Finance's books rather than a third party's dashboard. Each provider owns its own `validateSubmission`, so what counts as valid proof is a per-method decision. Adding a hosted gateway means registering a provider and setting `payment_methods.provider`; `documents.service.js` does not change.

### Real-time notifications (Socket.IO)
`src/realtime/` attaches Socket.IO to the same HTTP server, so there is no extra port and it rides the existing Vite proxy (`/socket.io` with `ws: true`).

- **Auth is enforced explicitly** — Socket.IO does not provide it. The handshake token is verified with the same `JWT_SECRET` as the REST API; missing or invalid tokens are refused.
- **Rooms scope delivery.** Each socket joins `user:<id>` plus its desk room, so it can only ever receive notifications belonging to the account that authenticated it.
- **Notifications travel one direction only** — the server never accepts client events.
- **It fails soft.** `emitToUser` returns `false` when realtime is unavailable; the notification is still stored and appears on next fetch. A realtime fault can never affect the desk action that triggered it.

### Notification channels
`notification.service.js` detects at startup whether SMS and email are actually configured and logs the result. An unconfigured channel is **skipped with a stated reason**, never attempted — previously the SMTP settings fell back to `mock_user`/`mock_pass`, so every email failed with an opaque `535 Authentication failed` that read like a code bug. Each send returns `{ok, skipped?, reason?}` so "delivered", "not configured", and "provider rejected it" are distinguishable.

### Authorization rules
A valid JWT proves *who* is calling, never *what they may touch*. Every endpoint taking a resource id verifies ownership or role:
- A student may only submit payment for, cancel, or read files attached to **their own** requests — including every document in a shared request group.
- A student may only read or submit **their own** graduate application; staff review anyone's.
- `uploadDocument` ignores any client-supplied `student_id` for students and files against their own record — otherwise a request could be attributed to another student, or left unowned.
- Fees are always computed server-side in `utils/pricing.js`; a client-sent `amount` is ignored.
- A profile picture is readable only by the account it belongs to (staff keep their blanket read). The avatar check is decided on its own and never falls through to the document/ID-proof rules, so owning an unrelated file by the same name grants nothing.

### Running the tests
```bash
cd backend && npm test        # vitest run — no database required
node audit.js                 # live end-to-end audit against a running server
```
Backend tests are `.cjs` on purpose — see `docs/CODING_PREFERENCES.md` for why.

### Environment Variables
Copy `backend/.env.example` → `backend/.env` and fill it in. Covers `DB_*`, `PORT`, `FRONTEND_URL`, `JWT_SECRET`, `WEBHOOK_SECRET`, `AI_ENGINE_URL`, `N8N_URL`, `UNISMS_*`, `TEST_PHONE_NUMBER`, and `SMTP_*`. Never hardcode a secret as a `||` fallback default in source.

`DB_SSL` turns on TLS for the database connection (`config/db.js` → `sslOptions()`), with
`DB_SSL_CA` for a provider that issues its own certificate — paste the PEM itself, not a path.
Off by default because a local MySQL has no certificate; **a managed provider generally refuses a
plaintext connection**, so this is usually the first thing a deployment must set. Certificate
verification is never disabled. `DB_POOL_LIMIT` caps connections *per instance*, so N replicas open
N× that many — keep it under the provider's cap.

`TRUST_PROXY` is the number of reverse proxies in front of the app. Behind Caddy or a load balancer
every request otherwise carries the proxy's IP, collapsing the IP-keyed limiters in
`rateLimit.middleware.js` into a single shared bucket and making `loginLimiter` far weaker than it
looks. It is a **hop count rather than `true`** on purpose: trusting `X-Forwarded-For` unconditionally
would let a client spoof its own address and walk straight past the login limiter.

`FRONTEND_URL` is the origin of the React app. It does double duty: it is the CORS allowlist for both the REST API and the Socket.IO handshake (`src/config/cors.js`), and it is the base of the password-reset link. Blank means development — origins are reflected, which is what the Vite dev proxy needs. **A deployment must set it**, or any website can open an authenticated socket. Comma-separate to allow more than one origin.

`JWT_SECRET` is **required** — `src/config/env.js` throws on startup if it is unset, and warns loudly if it still equals the old placeholder that is public in git history. Generate a strong one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

---

## 🗄️ Database Management (MySQL)

### Core Tables

#### `users`
- **Users (`users`):** Stores student, clerk, and admin records.
  - `employee_id` / `student_id`: Primary login identifier.
  - `role`: 'student', 'clerk', 'admin'.
  - `user_type`: 'student' or 'alumni'.
  - `id_proof_path`: File path to the uploaded Student ID or Diploma.
  - `profile_picture`: Filename of the uploaded avatar (`avatar-*`), or `NULL` for a generated placeholder. Read back through `/api/files/:filename` like every other upload.
  - `verification_status`: 'pending', 'verified', 'rejected'. New students are 'pending' until verified by an admin.
- **Documents (`documents`):** The core entity. for document tracking.
- `id` (PK)
- `tracking_number` (Unique Hash)
- `student_id` (FK)
- `document_type`
- `current_status` — one of the eight pipeline values in `utils/documentStatus.js`. A `VARCHAR`, not an ENUM: the constants module enforces the vocabulary, and it also covers the Python engine and the React queues, which a database ENUM never could.
- `estimated_ready_date` — what the Secretary promised the student
- `amount`, `page_count`, `pricing_notes`, `priced_by_clerk_id`, `priced_at` — the charge and its justification. `priced_at` (never `amount`) is what gates billing, since `amount` starts as an estimate.
- `stub_issued_at`, `payment_channel` (`digital` | `walk_in`), `or_number`, `or_date`, `logged_by_clerk_id` — the counter-payment trail
- `assigned_desk` (e.g., WINDOW_1, SECRETARY)
- `payment_status` (e.g., UNPAID, PAID) - *Updated for Payment Phase*

#### `password_resets`
Backs the forgot-password flow. Deliberately stores no reusable secret.
- `id` (PK)
- `user_id` (FK → `users`, `ON DELETE CASCADE`)
- `token_hash` `CHAR(64)` — the SHA-256 of the emailed token, **never the token itself**, so a
  database dump yields no usable reset links. Indexed, since it is the only lookup key.
- `expires_at` — compared in SQL rather than in Node, so the app server's clock cannot extend a
  token's life.
- `used_at` — `NULL` until consumed. This is what makes a token single-use rather than merely
  short-lived: a plain JWT would stay replayable until expiry even after the password had changed.
- `created_at`

#### `step_logs`
An audit trail table recording every movement.
- `id` (PK)
- `document_id` (FK)
- `desk_name`
- `action_taken` (e.g., UPLOADED, PAID, APPROVED, REJECTED)
- `timestamp`

---

## 💳 Manual GCash Payment Verification Flow

To comply with PLP Finance policies, Project TRACE collects payment manually against the Finance
Office's own records — no third-party gateway. Payment happens **late**: a document is evaluated,
printed and priced first, because the amount comes from the page count.

### Payment Flow

1. **Billing.** The College Secretary prices each printed document (`POST /:id/price`), writing
   `amount`, `page_count`, `pricing_notes`, `priced_by_clerk_id` and `priced_at`. When the **last**
   document in a `request_group_id` has a price, `markGroupPayable` moves the whole group to
   `PENDING_STUDENT_PAYMENT` and stamps `stub_issued_at`. The student and Finance are both notified.
2. **The student pays**, one of two ways:
   - **Online** — `POST /:id/submit-payment` writes `gcash_reference_no`, `receipt_image_path` and
     `payment_channel = 'digital'` across the group, moving it to `PENDING_FINANCE_VERIFICATION`.
   - **At the counter** — the student brings the printed slip; Finance calls
     `POST /:id/log-walkin-payment`, writing `or_number`, `or_date`, `logged_by_clerk_id` and
     `payment_channel = 'walk_in'`. Same destination: logging is not clearing.
3. **Finance verification.** `POST /:id/verify-payment` reviews whichever proof exists.
   - Approved: sets `payment_status = 'PAID'` and advances the group to `PAID_PENDING_SEC_RELEASE`.
     **This is the only place in the system that writes `PAID`.**
   - Rejected: returns the group to `PENDING_STUDENT_PAYMENT` with the clerk's notes.

> One receipt — digital or an Official Receipt — settles **every** document in the request group,
> which is why both writers are group-scoped while pricing and desk routing are per document.

### Desk action endpoints, in pipeline order

| Endpoint | Desk | Moves |
| :--- | :--- | :--- |
| `POST /api/documents/upload` | student / Window 1 | → `PENDING_W1_INTAKE` |
| `POST /api/documents/:id/intake` | Window 1 | → `PENDING_SEC_EVALUATION` (or returns with notes). Accepts a `document` scan; fires the n8n routing webhook. |
| `POST /api/documents/:id/accept` | Secretary | → `SEC_PROCESSING`, requires `estimated_ready_date` |
| `POST /api/documents/:id/price` | Secretary | sets the amount; bills the group when it is the last one |
| `POST /api/documents/:id/submit-payment` | student | → `PENDING_FINANCE_VERIFICATION` (online) |
| `POST /api/documents/scan-receipt` | Finance | reads an OR image and returns the fields. **Records nothing** — hence no document id |
| `POST /api/documents/:id/log-walkin-payment` | Finance | → `PENDING_FINANCE_VERIFICATION` (counter) |
| `POST /api/documents/:id/verify-payment` | Finance | → `PAID_PENDING_SEC_RELEASE`, sets `PAID` |
| `POST /api/documents/:id/handoff` | Secretary | → `READY_FOR_RELEASE` |
| `POST /api/documents/:id/release` | Window 1 | → `COMPLETED` |
| `DELETE /api/documents/:id` | student | cancels, allowed only through `PENDING_SEC_EVALUATION` |

Every desk action is a **POST**, so none is shadowed by the `GET /:trackingNumber` wildcard. A new
`GET /:id/...` *would* be — which is why the payment slip is rendered client-side rather than fetched.

`GET /api/documents` is role-scoped rather than taking a status: students see only their own, Finance
the two money queues, Secretaries their three working queues filtered by college, and Window 1
everything (it is the public counter — its Tracking Desk has to answer "where is my document?").

### Account & Profile Endpoints
- `PUT /api/auth/profile`: Updates the caller's own phone number, email, and/or password. A new password is hashed; supplying one also clears `must_change_password`.
- `PUT /api/auth/profile/picture`: Multipart upload (field `picture`) replacing the caller's avatar. JPG/PNG/WebP only, 2 MB max — enforced by `profilePictureUpload` in `upload.middleware.js`, which rejects anything else with a 400. Only the filename is stored; the previous avatar is deleted best-effort so uploads do not accumulate on disk.

### Password Recovery Endpoints
Both are deliberately unauthenticated — a user who needs them cannot log in — and both are throttled
by `passwordResetLimiter` (10 per IP per hour), because the first one sends mail to an address the
caller never had to prove they control.

- `POST /api/auth/forgot-password` — body `{ identifier }`, accepting a **student ID or an email**.
  Always returns the same 200 and the same message whether or not the account exists; an account with
  no email on file stops just as quietly. Anything else would turn the endpoint into an oracle for
  which IDs are registered. Issues 32 random bytes, stores **only** `sha256(token)` in
  `password_resets` with a 1-hour expiry, and retires that user's other outstanding tokens so only
  the newest link works. When SMTP is unconfigured the link is written to the server console instead
  of the request failing silently.
- `POST /api/auth/reset-password` — body `{ token, password }` (minimum 8 characters). Looks the
  token up by hash; `findUsableByTokenHash` excludes used and expired rows **in SQL**, so a wrong
  clock on the app server cannot extend a token's life, and all three failure cases return the same
  400. On success it writes a bcrypt hash, clears `must_change_password`, marks the token used, and
  invalidates the user's remaining tokens.

### Health check
- `GET /api/health` — runs `SELECT 1` and returns **503** (`status: "degraded"`) with the driver's
  message when the database is unreachable. The server deliberately boots without a database
  (`server.js` logs and continues), so a check that never touched one reported a completely unusable
  container as healthy. Mounted **above** `apiLimiter` so orchestrator probes never consume the
  rate-limit budget.

### Dashboard & Analytics Endpoints (New)
- `GET /api/documents/stats`: Returns KPI metrics (backlogs, processed today, avg time).
- `GET /api/documents/stats/forecast`: Proxies to Flask AI engine to retrieve the 7-day volume forecast using Prophet.
- `GET /api/documents/stats/insights`: Proxies to Flask AI engine to retrieve Random Forest heuristics and alert recommendations.
