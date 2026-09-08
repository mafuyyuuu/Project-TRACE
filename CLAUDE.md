# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Project TRACE** (Tracking, Routing, and Automated Credential Engine) is a capstone system for the PLP (Pamantasan ng Lungsod ng Pasig) Registrar's Office. It tracks document requests (TOR, Diploma, Honorable Dismissal, Graduation Clearance, Certificate of Good Moral Character) through a fixed desk pipeline, with a manual GCash payment-verification step to comply with school accounting requirements.

Three independently-run services + one orchestrator, no shared package manifest:
- `backend/` — Node.js/Express API gateway (MySQL, auth, file uploads, SMS/email)
- `frontend/` — React (Vite) SPA, single unified `/dashboard` route that renders per-role
- `ai-engine/` — Python Flask microservice (EasyOCR, Prophet, Random Forest)
- `n8n/` — routing-workflow.json imported into a local n8n Docker container for conditional desk routing

## Folder Structure & Architectural Rules (Strict)

These rules are mandatory for all new/modified code. **Do not create folders outside this schema without explicit permission.**

**Frontend (`frontend/src/`)**
```
assets/        # Static files (images, icons, global CSS)
components/    # Reusable UI only (Buttons, Inputs, Modals - NO business logic here)
features/      # Grouped by domain (e.g., /features/auth, /features/bookings)
hooks/         # Global custom React hooks (e.g., useWindowSize, useTheme)
layouts/       # Page wrappers (e.g., AdminLayout, StudentLayout)
pages/         # Top-level route components that stitch features together
services/      # Axios/Fetch calls to the backend API (e.g., api.js, authService.js)
store/         # Global state management (Zustand/Redux)
utils/         # Helper functions (e.g., formatCurrency.js, formatDate.js)
```

**Backend (`backend/src/`)**
```
config/        # Environment variables, Database connection setup
controllers/   # Handles incoming HTTP requests and sends responses
middlewares/   # Express middlewares (e.g., verifyToken, errorHandler)
models/        # Database schemas and queries (PostgreSQL/MySQL)
routes/        # Maps URL endpoints to specific controllers
services/      # Heavy business logic (e.g., Stripe payment processing logic)
utils/         # Backend helper functions
```

**Strict AI coding rules:**
1. **Separation of concerns:** Frontend UI components (`/components`) must NEVER make direct API calls. All API calls belong in `/services` and are passed down via hooks.
2. **Backend logic:** Controllers only handle HTTP req/res. Complex logic (e.g. generating Zoom links, processing Stripe payments) must live in `/services` and be called by the controller.
3. **Environment variables:** Never hardcode API keys. Always reference `.env` variables (e.g., `process.env.STRIPE_SECRET`). If a new env variable is needed, add it to `.env.example`. In the backend, read them through `src/config/env.js` rather than touching `process.env` directly.

Frontend imports use the `@/` alias for `src/` (configured in `vite.config.js` + `jsconfig.json`) — e.g. `import useAuth from '@/hooks/useAuth'`.

`store/` exists but is intentionally empty: no state library is installed. State lives in `useAuth`, `useDashboardCore`, the per-role feature hooks, and backend fetches, per `docs/CODING_PREFERENCES.md` ("keep complex global state minimal"). Don't add Zustand/Redux without a concrete prop-drilling problem to solve.

## Commands

### Install (per-service, no root manifest)
```bash
cd backend && npm install
cd frontend && npm install
cd ai-engine && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

### Run all services (4 terminals)
```bash
cd backend && npm run dev        # nodemon, http://localhost:3300
cd frontend && npm run dev       # vite,    http://localhost:5273
cd ai-engine && source .venv/bin/activate && python app.py   # http://localhost:5005
docker start n8n                 # http://localhost:5678 (must be created once via `docker run`, see README)
```

### Build / Lint
```bash
cd frontend && npm run build     # vite build
cd frontend && npm run lint      # eslint .
```

### Database
```bash
# First-time setup
mysql -u root -p -e "CREATE DATABASE trace_db;"
mysql -u root -p trace_db < backend/database/schema.sql
mysql -u root -p trace_db < backend/database/seed.sql
node backend/database/migration.js     # applies GCash/clerk-account schema upgrades

# Seed historical volume data so Prophet/Random Forest have something to train on
python ai-engine/mock_data_gen.py
```

### Tests
```bash
cd backend && npm test          # vitest run
cd frontend && npm test         # vitest run
node backend/audit.js           # live end-to-end API audit (both servers must be running)
```
**Backend tests must be `.cjs`.** The backend source is CommonJS, and only a CJS test shares Node's require cache with it — which is what makes `vi.spyOn(model, 'fn')` actually intercept the call a service makes. An ESM test silently gets a separate module instance and hits the real MySQL. Tests live in `__tests__/` next to the code; models are spied on, so no database is needed.

`ai-engine/test_ocr.py` remains a manual script (`python test_ocr.py [image_path]`) for sanity-checking OCR/regex changes in `ocr_engine.py`.

### Test accounts
All seeded accounts share the password `trace2024` (see README.md for the full ID table — `ADMIN001`, `FINANCE001`, `WINDOW1001`, `SEC-CCS001`/`SEC-CON001`/etc. per college, `STU2024001`).

## Architecture

### Request lifecycle (the thing every feature hangs off of)

The pipeline is **evaluate first, pay later**: the registrar cannot quote a price until a document
has been printed, because the College Secretary prices it from the page count. Work happens first,
money is collected near the end, and the paper only changes hands once an Official Receipt exists.

```
PENDING_W1_INTAKE → PENDING_SEC_EVALUATION → SEC_PROCESSING
  → PENDING_STUDENT_PAYMENT → PENDING_FINANCE_VERIFICATION
  → PAID_PENDING_SEC_RELEASE → SEC_OR_VERIFIED → READY_FOR_RELEASE → COMPLETED
```

- **PENDING_W1_INTAKE**: request filed — online by the student, or typed in at the counter by Window
  1 for a walk-in. **Both channels produce identical rows**; only `step_logs` records which. Each
  document type becomes its own row under a shared `request_group_id`. The `amount` written here is a
  **provisional estimate** from `document_types` shown so a student isn't quoted nothing; it is not a
  price, and `priced_at` — never `amount` — is what gates billing.
- **PENDING_SEC_EVALUATION**: Window 1 checked the paperwork and n8n routed it to the secretary
  matching the student's college (each `SEC-XXX001` sees only its own college's students).
- **SEC_PROCESSING**: Secretary accepted it and committed to an `estimated_ready_date` the student is
  told. The document is prepared and printed.
- **PENDING_STUDENT_PAYMENT**: printed and priced. **Pricing is per document** (page counts differ)
  but **billing is per request** — the group only becomes payable when the last of its documents has
  a price, or a two-document request would send the student to Finance twice.
- **PENDING_FINANCE_VERIFICATION**: payment claimed, through either channel — the student uploaded
  proof online, or Finance logged a counter payment against the printed slip.
- **PAID_PENDING_SEC_RELEASE**: Finance confirmed, via `verifyPayment`, which also requires an
  `or_number` to approve. **This is the only place `payment_status` becomes `PAID`.** The Secretary
  sets the price; only Finance confirms the money — those authorities are deliberately separate.
- **SEC_OR_VERIFIED**: the Secretary checked the Official Receipt Finance attached — present, and the
  number looks right — via `verifyOfficialReceipt`. A paperwork completeness check, not a second
  payment decision: it never writes `payment_status`, so it does not blur the authority split above.
- **READY_FOR_RELEASE**: the Secretary physically handed the printed document to Window 1 and
  recorded it. A separate step because it marks a real physical event.
- **COMPLETED**: Window 1 released it, for a walk-in against the OR the student presents.

**The vocabulary and the transitions live in `backend/src/utils/documentStatus.js`**, mirrored by
`frontend/src/utils/documentStatus.js` exactly as `utils/pricing.js` is. Never write a bare status
string anywhere — that module also owns `assertTransition`, which every desk action calls before
writing. `step_logs` is append-only, so an illegal move cannot be tidied away afterwards; it has to
be refused up front. `current_status` is a `VARCHAR`, not a database ENUM, on purpose: an ENUM would
not cover the Python engine or the React queues, and `migration.js` deliberately widened it years ago.

Rejection returns a document exactly one step. Two gaps are intentional: `PENDING_W1_INTAKE` has no
backward edge (it is the first desk, so a return logs the reason and leaves the status alone), and
nothing reverses past `PAID_PENDING_SEC_RELEASE` (that would be a refund, an off-system decision).
Students may cancel only through `PENDING_SEC_EVALUATION` — past that, paper has been spent.

Some document types (Honorable Dismissal, Graduation Clearance, Certificate of Good Moral Character)
need supporting paperwork. That is **no longer a submission gate**: a walk-in arrives at the counter
with paper and no upload, so the request form prompts and Window 1 intake enforces it. See
`docs/SYSTEM_WORKFLOWS.md`.

n8n owns the conditional/institutional routing logic — do not hardcode that routing in Node.js; emit
a webhook and let `n8n/routing-workflow.json` decide. **Routing fires from `intakeDocument`, not from
submission**: the first desk is Window 1, and the college secretary is only chosen once a human has
confirmed there is something real to route. The payload carries `college_code`
(`colleges.short_code`: CCS, CON, …), which is what lets the workflow resolve the right
`SEC-<code>001`; without it every document would go to one hardcoded clerk. The workflow calls back
into `POST /api/documents/assign` with the `x-webhook-secret` header and reads its target from the
`TRACE_API_URL` / `TRACE_WEBHOOK_SECRET` n8n environment variables — do not hardcode the port there
again, that is exactly how the workflow silently broke for a month after the backend moved to 3300.

**The n8n container also needs `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`.** n8n hides `$env` from
expressions by default, so without it those two variables are invisible to the workflow no matter how
correctly they are set: the callback goes out with an empty secret and the backend rejects it 401.
The webhook still answers `200 {"message":"Workflow was started"}` and the execution is still
recorded as **success** — the only symptom is that documents are never assigned. See
`docs/ENV_SETUP_GUIDE.md` §6.4.

The assignment is **load-bearing** for the Secretary queue: a document assigned to a secretary shows
in that secretary's queue and not in another's. Two deliberate limits in `documents.service.js` keep
that safe — an **unassigned** document falls back to the college filter (so records predating
routing, and anything filed while n8n is stopped, stay visible), and an assignment to a
**non-Secretary** desk is ignored by that queue.

**Queue scoping** (`listDocuments`): students see only their own; Finance sees the two money queues
(`PENDING_STUDENT_PAYMENT` read-only, `PENDING_FINANCE_VERIFICATION` actionable); Secretaries see
their three working queues plus the tail, filtered by college. **Window 1 is deliberately
unrestricted** even though it only acts on two statuses — it is the public counter, and its Tracking
Desk has to answer "where is my document?" about anything in the system. Its two queues are a
client-side split.

### One dashboard, five renders
There is no per-role routing. `frontend/src/pages/DashboardPage.jsx` resolves the user's `role`/`desk_assignment` and renders one of five command centers from `features/`:

| Role | Component |
| --- | --- |
| Student | `features/student/StudentDashboard.jsx` |
| Finance Clerk | `features/finance/FinanceDashboard.jsx` |
| Window 1 Clerk | `features/window1/Window1Dashboard.jsx` |
| College Secretary | `features/secretary/SecretaryDashboard.jsx` |
| Registrar Admin | `features/admin/AdminDashboard.jsx` |

Each command center owns its data through its own hook — `features/<role>/use<Role>Dashboard.js` — all of which build on `hooks/useDashboardCore.js` (queue, KPI stats, loading/feedback, modal selection, and the shared `runAction` wrapper). `DashboardPage` therefore holds no queue state and passes only `{ user, currentTab, setViewImageUrl }`.

Each feature owns its modals under `features/<role>/components/`; genuinely cross-role UI lives in `components/` (`ImageViewerModal`, `AuthedFilePreview`, `UserAvatar`, `ProfileSettingsModal`, `DashboardAlerts`, `DashboardLoading`, `MiniSparkline`, `ModalShell`, `ConfirmDialog`, `UserCard`, `QueueTabs`). Presentation helpers are in `utils/formatters.js` and `utils/documentStatus.js` — import them, never duplicate them inside a hook.

Every modal — all 11 feature-owned ones plus the admin user modals — builds on `components/ModalShell.jsx` rather than hand-rolling its own `createPortal`/backdrop/panel: it owns the portal, focus trap, Esc/backdrop dismissal, and a scrollable body with a footer pinned to the bottom regardless of content length. Its `bare`/`panelClassName`/`backdropClassName`/etc. props exist for real outliers (a lightbox, a print-only slip, a split-screen layout) — a normal modal only passes `title`, `children`, `footer`. `components/ConfirmDialog.jsx`, built on the same shell, is what `window.confirm()` was replaced with everywhere: any button that changes state or isn't trivially undoable (approve, reject, deactivate, cancel, release, log a payment) stages its target instead of acting immediately, and a `confirm*`/`cancel*` pair does the real work — never add a new one-off browser `confirm()`.

Uploaded files are fetched through `hooks/useAuthedFile.js`, which pulls bytes via authenticated axios and hands back a blob URL, because `<img src>` cannot send an `Authorization` header. It passes a fully-qualified `http(s)` URL through untouched, so `UserAvatar` covers both an uploaded profile picture and its generated fallback with one call.

`layouts/Layout.jsx` renders navigation twice — the icon-only desktop rail and a hamburger drawer for phones, since the rail is `hidden md:flex` and would otherwise leave mobile with no navigation at all. Both render `layouts/SidebarNav.jsx`, whose tab list comes from `utils/navigation.js`; add a tab there, not in the JSX. Account Settings is `components/ProfileSettingsModal.jsx` (presentational) driven by `hooks/useProfileSettings.js` (state + API calls) — the component makes no calls of its own.

Queue tables scroll inside a `max-h-[60vh]` container with a `sticky top-0 bg-white z-10` `<thead>`; the opaque background is required or rows show through the header.

### Backend shape
`backend/src/` follows route → controller → service → model. Entry point is `src/server.js` (listens) wrapping `src/app.js` (builds the Express app).

- `routes/*.routes.js` — URL wiring only. Note `documents.routes.js` order matters: `/stats`, `/stats/forecast`, `/stats/insights`, `/activity-logs` must stay above the `/:trackingNumber` wildcard. Every desk action is a **POST**, so none of them is shadowed by that wildcard — but a new `GET /:id/...` would be, which is why the payment slip is rendered client-side rather than fetched.
- `controllers/*.controller.js` — unpack `req`, call the service, map errors to status codes. No logic.
- `services/` — where the work lives:
  - `auth.service.js` — login/JWT, registration incl. AI 3-point ID verification, admin account governance.
  - `documents.service.js` — the whole pipeline: submission + pricing, payment submit/verify, per-desk actions, stats, forecast/insights with local fallbacks.
  - `notification.service.js` — in-app + UniSMS + Nodemailer dispatch. Every channel fails soft: a notification error must never roll back the document action that triggered it.
  - `aiEngine.service.js`, `n8n.service.js` — HTTP clients for the Flask engine and the orchestrator; both return `null`/log rather than throw, since those services are optional locally.
- `models/*.model.js` — raw SQL only. Each function takes an optional `executor` (pool or in-flight transaction connection) so callers can enlist queries in a transaction.
- `utils/AppError.js` — `badRequest`/`forbidden`/`notFound`/`unauthorized` helpers carrying an HTTP status, so services never touch `res`.
- `config/cors.js` — one allowlist shared by the REST API and the Socket.IO handshake, driven by `FRONTEND_URL`. Blank means development (origins reflected); set it in any deployment. Never give Socket.IO `origin: true` with `credentials: true` again — that lets any website open an authenticated socket.
- `config/db.js` — `sslOptions()` turns on TLS from `DB_SSL` (+ optional `DB_SSL_CA`). Off by default because a local MySQL has no certificate; **a managed provider will refuse a plaintext connection**, so a deployment must set it. `rejectUnauthorized` is always true — accepting any certificate would defeat the point.
- `middlewares/upload.middleware.js` `mkdir`s `UPLOAD_DIR` at module load. In the repo the directory only existed because `.gitkeep` held it open, so a fresh container had no `uploads/` and multer failed the *first* upload with `ENOENT`.
- `app.js` sets `trust proxy` from `TRUST_PROXY` (a **hop count**, not `true`) when it is above 0. Without it, everything behind a proxy shares one rate-limit bucket; with `true`, a client could spoof `X-Forwarded-For` and evade `loginLimiter` entirely.

`GET /api/health` runs a `SELECT 1` and returns **503** when the database is unreachable. The server deliberately boots without a database, so a liveness-only check would report a completely unusable container as healthy. It is mounted **above** `apiLimiter` so probe traffic never consumes the rate-limit budget.

Three endpoints are deliberately without a user session: `GET /api/documents/:trackingNumber` (public tracking, fully open) and `POST /api/auth/forgot-password` / `POST /api/auth/reset-password` (a user who needs them cannot log in — both are throttled by `passwordResetLimiter`). `POST /api/documents/assign` is **not** open: it is machine-to-machine and requires the shared `WEBHOOK_SECRET` in an `x-webhook-secret` header, constant-time compared in `middlewares/webhookAuth.middleware.js`.

File uploads go through Multer to disk (`backend/uploads/`, gitignored) via `middlewares/upload.middleware.js` before being forwarded to the Flask OCR service — don't hold upload buffers in memory.

### AI engine (Flask, port 5005)
Single-file endpoints in `app.py`, OCR logic isolated in `ocr_engine.py`:
- `POST /ocr/extract` — document intake OCR (EasyOCR run twice — preprocessed + original — longer text wins; regex-parses `student_id`/`last_name`/`form_type`; confidence = fields found / 3).
- `POST /ocr/verify` — registration ID verification (3-point: school name, student ID, course all substring-matched in lowercased OCR text).
- `POST /ocr/receipt` — Official Receipt OCR for Finance logging a walk-in payment (field name `receipt`). Regex-parses `or_number`/`amount`/`or_date`; confidence = fields found / 3. It takes the **largest** peso figure rather than the first: a receipt lists line items before its total, and reading a line item as the amount paid would under-record the payment. The clerk re-verifies every field, and `aiEngine.extractReceipt` returns `null` on failure so the counter form still works by hand with the engine down.
- `GET /forecast` — Prophet, daily seasonality only, trained live each call on `step_logs` grouped by date, returns next 7 days.
- `GET /ai/recommend` — RandomForestClassifier(n_estimators=10, random_state=42) trained on a small hardcoded heuristic dataset, feature vector `[PENDING_SEC_EVALUATION, READY_FOR_RELEASE, today_volume]` computed live from MySQL (**this service queries `documents.current_status` in raw SQL, so it has to be kept in step with `utils/documentStatus.js` by hand — there is no shared module across the language split**); insight generation is dual-condition (classifier vote OR raw threshold), so a misclassification still gets caught by the threshold check.

The exact math (CRAFT/CRNN/CTC for OCR, Prophet's additive model, Gini-split Random Forest) with worked examples is documented in `docs/ALGORITHM_COMPUTATION.md` — read that before modifying model behavior rather than re-deriving it.

### Payments & real-time notifications
Four payment methods live in the admin-managed `payment_methods` table; `src/services/payment/` resolves each to a provider. All use **`manual`** today (pay out-of-band, upload proof, Finance verifies) because PLP reconciles against its own books — the abstraction exists so a gateway can be added without touching `documents.service.js`.

`src/realtime/` runs Socket.IO on the same HTTP server. **Socket.IO provides no auth** — the handshake JWT is verified explicitly against `JWT_SECRET`, and each socket joins only `user:<id>` and its desk room. Emissions fail soft: if realtime is down, the notification is still stored and shows on next fetch. Vite proxies `/socket.io` with `ws: true`.

`notification.service.js` reports channel health at startup and **skips unconfigured channels with a reason** rather than attempting them. Don't reintroduce placeholder SMTP credentials — that is what made the old email failures look like a bug.

### Profile pictures
`users.profile_picture` holds a filename only; the bytes live in `backend/uploads/` and are read back through the authenticated `/api/files/:filename` route like every other upload — **never a public static path**. `PUT /api/auth/profile/picture` (multipart field `picture`, JPG/PNG/WebP, 2 MB via `profilePictureUpload`) replaces it and deletes the previous file. In `files.service.js` an avatar is resolved on its own branch: only its owner may read it, and the check never falls through to the document/ID-proof rules. A multer `fileFilter` must reject with `badRequest`, not a bare `Error` — the shared error handler maps an unstatused error to 500.

### Password recovery
`POST /api/auth/forgot-password` (student ID **or** email) always answers with the same generic
message whether or not the account exists — the endpoint must never become an oracle for which IDs
are registered. It stores only `sha256(token)` in `password_resets`, so a database dump yields no
usable links, and issuing a new token retires the account's outstanding ones.

`POST /api/auth/reset-password` consumes the token: `findUsableByTokenHash` filters out used and
expired rows **in SQL**, so a wrong clock on the app server cannot extend a token's life, and a
successful reset marks it used and invalidates the user's others. Email is optional configuration —
when SMTP is unset the link is logged to the server console rather than failing silently, matching
how every other channel reports being unconfigured.

Frontend: `pages/ForgotPasswordPage.jsx` + `pages/ResetPasswordPage.jsx` share the presentational
`components/AuthShell.jsx`; state and API calls live in `hooks/usePasswordReset.js`, never in the
pages.

### Admin maintenance, reporting & analytics
`/api/maintenance/*` (admin-only CRUD for staff, document types, colleges), `/api/reports/documents`, `/api/reports/analytics`, and two CSV export routes.

**Deletion is always deactivation** (`PATCH .../active` toggling `is_active`) — documents and users reference these by name, so a hard delete would orphan history. A document type already in use cannot be renamed; an admin cannot deactivate their own account. Staff are created with a temporary password plus `must_change_password`, which clears when they set their own.

Reporting filters, summary totals and CSV exports all share one filter object. `utils/csv.js` is hand-written and handles quoting plus spreadsheet formula injection. Analytics come from `step_logs` only; per-clerk figures are workload, never a ranking.

### Reference data & configurable forms
Document types, colleges, and the Graduate Application's fields are **database rows, not code**: `document_types` (with admin-editable `base_fee` and a `fee_rule` selecting the calculation), `colleges`, and `grad_form_fields`. The graduate form's validation is generated from its field definitions, so adding a question needs no migration and no code change. Don't reintroduce a hardcoded `<option>` list.

### Database
MySQL, single source of truth, `backend/database/schema.sql` + `seed.sql` + `migration.js` for upgrades. Core tables: `users` (role/verification_status/course/id_proof_path), `documents` (current_status/payment_status/tracking_number/gcash fields), `step_logs` (append-only audit trail — every desk transition writes here and is what both Prophet and the Admin Activity Log read from), `notifications` (in-app bell icon).

**Seeding note:** the seven per-college secretaries (`SEC-CCS001` … `SEC-CBA001`) are created by `migration.js`, not `seed.sql` — run the migration after seeding. A legacy `SEC001` with `course = NULL` may also exist; it bypasses college filtering and sees every queue, so use the `SEC-*` accounts when exercising college-based routing.

## Coding Preferences

Full detail lives in `docs/CODING_PREFERENCES.md`; key points:
- Frontend: React + Tailwind only (no inline styles, no CSS-in-JS); keep fetch logic in hooks, not components.
- Backend: parameterize all SQL (raw queries / mysql2, no string-concatenated SQL); webhook endpoints must ack fast (200 OK) and handle errors gracefully.
- AI engine: always run inside `.venv`; keep `requirements.txt` limited to what's actually used.
- Routing decisions belong in n8n, not hardcoded in Express.
- **The Secretary sets the price; Finance alone sets `PAID`.** `priceDocument` is the only place an amount is written, and it records the clerk, the page count and a reason alongside it. `verifyPayment` remains the only place `payment_status` becomes `'PAID'`. Holding those two authorities apart is what makes the money trail auditable — never let one endpoint do both. `verifyOfficialReceipt` (the Secretary's post-payment OR check) is the one deliberate near-exception: it sits between Finance's approval and handoff, but it stays a paperwork completeness check and never touches `payment_status` — don't let a future change turn it into a second money decision.
- Every desk action calls `assertTransition(from, to)` before writing a status. `step_logs` is append-only, so an illegal move cannot be tidied away afterwards.

## Deployment

Frontend on **Vercel**, everything else as containers on a single VM (the plan targets Oracle Cloud
Always Free — ARM/aarch64, so images must build for `linux/arm64`; this is verified working, torch
ships aarch64 wheels and Prophet's Stan binary compiles). **n8n cannot run on Vercel** — it is a
stateful container — which is why the backend lives beside it rather than as a function.

`docker-compose.yml` runs all four services plus MySQL and is both the local-parity setup and the
deployment unit. `JWT_SECRET`/`WEBHOOK_SECRET` are declared `${VAR:?}` so compose refuses to start
without them. The `frontend` service sits behind a `local-frontend` profile — it is only for a
single-box deployment where nginx also serves the SPA; with Vercel it stays down.

**`VITE_API_URL` is baked in at build time**, not read at runtime — `services/api.js` and
`services/realtimeService.js` are the only two places the frontend builds a URL. Unset (or empty) it
stays relative, which is what the Vite dev proxy needs; set, it points at the API's own origin.
Changing it on Vercel requires a **redeploy**, not a restart.

`vercel.json` rewrites every non-asset path to `index.html`. Without that,
`/reset-password?token=…` — the link the password-reset email sends — returns a **404** on a static
host, and the feature looks broken in production while working locally. `frontend/nginx.conf` does
the same `try_files` for the container path.

The **uploads volume is the only state outside MySQL**. The database stores filenames only, so an
unmounted volume means the rows survive a redeploy and the bytes do not.

`deploy/Caddyfile` + the compose `tls` profile handle HTTPS. It is required, not cosmetic: the
Vercel-hosted frontend is https, and a browser will not let an https page call an http API. Caddy
needs a real hostname — a bare IP cannot be issued a certificate.

Step-by-step deployment instructions live in `docs/DEPLOYMENT_GUIDE.md`.

## Other docs worth reading before large changes
- `docs/ENV_SETUP_GUIDE.md` — **the single source of truth for configuration**: every environment variable across the four config surfaces (root `.env`, `backend/.env`, `frontend/.env`, Vercel), where each credential is obtained, and how to verify it. Other docs link here instead of repeating it — keep it that way.
- `docs/DEPLOYMENT_GUIDE.md` — taking the system live, part by part, with a verification gate after each
- `docs/SYSTEM_WORKFLOWS.md` — the operational manual: account registration/recovery, the pipeline, per-document-type AI requirements, and the per-role workflow. (`APP_GUIDE.md` was merged into it — it duplicated the same roles and pipeline.)
- `docs/BACKEND_GUIDE.md` — endpoint list and DB flow detail
- `docs/PROGRESS.md` — **the single** phase-by-phase record; Phase 18 (Go Live) is the only incomplete phase, and it is blocked on infrastructure rather than code. (`project_trace_roadmap.md` was merged into it — it retold the same history under a second, conflicting phase numbering.)
- `.agents/AGENTS.md` — gitignored, agent-local workspace memory with the same kind of system-state notes; not synced to the repo
