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
Every document, regardless of type, moves through a fixed `current_status` state machine:
```
pending_payment → pending_payment_verification → pending_secretary → ready_window_1 → completed/released
```
- **pending_payment**: student submits a request covering **one or more** document types. Each becomes its own row under a shared `request_group_id`; the price is computed **server-side** from `document_types` (a client-sent `amount` is ignored). TOR = `Math.ceil(semesters / 4) * base_fee`.
- **pending_payment_verification**: student uploaded GCash receipt + reference number. **Payment is per request group** — one receipt settles every document in it — while routing from the Secretary onward is per document. A document is *never* allowed to reach the Secretary until Finance flips `payment_status` to `PAID`.
- **pending_secretary**: routed to the College Secretary matching the student's `course` (college-based queue segregation — each `SEC-XXX001` account only sees its own college's students).
- **ready_window_1**: Secretary approved; document is printed and waits for physical pickup at Window 1.
- **completed/released**: Window 1 clerk scans/releases; `step_logs` gets the final audit entry.

Some document types (Honorable Dismissal, Graduation Clearance, Certificate of Good Moral Character) additionally *require* an upload at submission time that EasyOCR must validate before the request proceeds — see `docs/SYSTEM_WORKFLOWS.md` for the per-document AI requirements.

n8n owns the conditional/institutional routing logic (which desk gets which document type) — do not hardcode that routing in Node.js; emit an event/webhook and let `n8n/routing-workflow.json` decide.

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

Each feature owns its modals under `features/<role>/components/`; genuinely cross-role UI lives in `components/` (`ImageViewerModal`, `AuthedFilePreview`, `DashboardAlerts`, `DashboardLoading`, `MiniSparkline`). Presentation helpers are in `utils/formatters.js` and `utils/documentStatus.js` — import them, never duplicate them inside a hook.

Uploaded files are fetched through `hooks/useAuthedFile.js`, which pulls bytes via authenticated axios and hands back a blob URL, because `<img src>` cannot send an `Authorization` header.

### Backend shape
`backend/src/` follows route → controller → service → model. Entry point is `src/server.js` (listens) wrapping `src/app.js` (builds the Express app).

- `routes/*.routes.js` — URL wiring only. Note `documents.routes.js` order matters: `/stats`, `/stats/forecast`, `/stats/insights`, `/activity-logs` must stay above the `/:trackingNumber` wildcard.
- `controllers/*.controller.js` — unpack `req`, call the service, map errors to status codes. No logic.
- `services/` — where the work lives:
  - `auth.service.js` — login/JWT, registration incl. AI 3-point ID verification, admin account governance.
  - `documents.service.js` — the whole pipeline: submission + pricing, payment submit/verify, per-desk actions, stats, forecast/insights with local fallbacks.
  - `notification.service.js` — in-app + UniSMS + Nodemailer dispatch. Every channel fails soft: a notification error must never roll back the document action that triggered it.
  - `aiEngine.service.js`, `n8n.service.js` — HTTP clients for the Flask engine and the orchestrator; both return `null`/log rather than throw, since those services are optional locally.
- `models/*.model.js` — raw SQL only. Each function takes an optional `executor` (pool or in-flight transaction connection) so callers can enlist queries in a transaction.
- `utils/AppError.js` — `badRequest`/`forbidden`/`notFound`/`unauthorized` helpers carrying an HTTP status, so services never touch `res`.

Two endpoints are deliberately unauthenticated: `GET /api/documents/:trackingNumber` (public tracking) and `POST /api/documents/assign` (called by n8n).

File uploads go through Multer to disk (`backend/uploads/`, gitignored) via `middlewares/upload.middleware.js` before being forwarded to the Flask OCR service — don't hold upload buffers in memory.

### AI engine (Flask, port 5005)
Single-file endpoints in `app.py`, OCR logic isolated in `ocr_engine.py`:
- `POST /ocr/extract` — document intake OCR (EasyOCR run twice — preprocessed + original — longer text wins; regex-parses `student_id`/`last_name`/`form_type`; confidence = fields found / 3).
- `POST /ocr/verify` — registration ID verification (3-point: school name, student ID, course all substring-matched in lowercased OCR text).
- `GET /forecast` — Prophet, daily seasonality only, trained live each call on `step_logs` grouped by date, returns next 7 days.
- `GET /ai/recommend` — RandomForestClassifier(n_estimators=10, random_state=42) trained on a small hardcoded heuristic dataset, feature vector `[pending_secretary, pending_release, today_volume]` computed live from MySQL; insight generation is dual-condition (classifier vote OR raw threshold), so a misclassification still gets caught by the threshold check.

The exact math (CRAFT/CRNN/CTC for OCR, Prophet's additive model, Gini-split Random Forest) with worked examples is documented in `docs/ALGORITHM_COMPUTATION.md` — read that before modifying model behavior rather than re-deriving it.

### Payments & real-time notifications
Four payment methods live in the admin-managed `payment_methods` table; `src/services/payment/` resolves each to a provider. All use **`manual`** today (pay out-of-band, upload proof, Finance verifies) because PLP reconciles against its own books — the abstraction exists so a gateway can be added without touching `documents.service.js`.

`src/realtime/` runs Socket.IO on the same HTTP server. **Socket.IO provides no auth** — the handshake JWT is verified explicitly against `JWT_SECRET`, and each socket joins only `user:<id>` and its desk room. Emissions fail soft: if realtime is down, the notification is still stored and shows on next fetch. Vite proxies `/socket.io` with `ws: true`.

`notification.service.js` reports channel health at startup and **skips unconfigured channels with a reason** rather than attempting them. Don't reintroduce placeholder SMTP credentials — that is what made the old email failures look like a bug.

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
- Payment state changes are one-directional through Finance only — nothing should ever set `payment_status = 'PAID'` outside the Finance verify endpoint.

## Other docs worth reading before large changes
- `docs/APP_GUIDE.md` — role/portal walkthrough
- `docs/SYSTEM_WORKFLOWS.md` — per-document-type AI requirements and per-role operational workflow
- `docs/BACKEND_GUIDE.md` — endpoint list and DB flow detail
- `docs/PROGRESS.md` — phase-by-phase status; Phase 8 (production rollout: Dockerization, cloud deploy, forgot-password flow) is the only incomplete phase
- `.agents/AGENTS.md` — gitignored, agent-local workspace memory with the same kind of system-state notes; not synced to the repo
