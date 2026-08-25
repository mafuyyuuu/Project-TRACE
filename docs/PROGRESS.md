# Project TRACE Progress

This document tracks the current development and implementation progress of the Project TRACE system.

## Overall Status: 🟢 Deployment-Ready (Phase 17) — awaiting a provisioned host

### 📍 Next Steps for Phase 15 (Production Rollout)
Phase 16 closed the application-level gaps that a deployment would otherwise have baked in. What
remains is infrastructure, plus one credential the maintainer must rotate personally:

1. **Rotate the UniSMS API key.** It was hardcoded as a `||` fallback default and remains in git
   history even though it is gone from the source. (`JWT_SECRET` — the more serious of the two, since
   it signs every auth token — **has been rotated**.)
2. **Configure SMTP.** `backend/.env` has commented `SMTP_*` placeholders; email stays disabled until
   they are filled in (a Gmail App Password, not an account password). Password-reset links are
   logged to the server console until then, so the flow is testable without it.
3. **Production API URL for the frontend.** `services/api.js` uses `baseURL: '/api'` and
   `realtimeService.js` calls `io()` with no URL — both work only through the Vite dev proxy, which
   does not exist in a `vite build`. Either serve the built frontend same-origin behind a reverse
   proxy, or introduce a `VITE_API_URL` (baked in at build time).
4. **Persistent uploads.** `backend/uploads/` is container-local disk and the directory is never
   created at boot, so a fresh container fails its first upload with `ENOENT`. Needs a mounted volume
   or object storage.
5. **Managed-database TLS.** `config/db.js` passes no `ssl` option; most managed MySQL will refuse
   the connection outright.
6. **Harden the AI engine for serving.** `ai-engine/app.py` runs the Werkzeug dev server and defaults
   to `debug=True` when `FLASK_ENV` is unset; EasyOCR also downloads ~100 MB of models at import, so
   the models should be baked into the image rather than fetched on first boot.
7. **Dockerization & cloud deployment**, then migrating MySQL to a managed instance.

---

### Phase 1: The Foundation & Tech Stack Handshake
**Status:** Complete
- [x] Setup React (Vite) and Tailwind CSS for Frontend
- [x] Setup Node.js + Express backend with MySQL schemas
- [x] Implement Python Flask + EasyOCR baseline microservice
- [x] Establish initial database connection and seed data

### Phase 1.5: Manual Payments & Account Verification Integration
**Status:** Complete
- [x] Implement File Upload for Account Proof (Student ID / Diploma).
- [x] Create backend routes for manual student registration verification (`GET /pending-students` & `POST /verify-student/:id`).
- [x] Update frontend UI to enforce payment upon document request.
- [x] Create manual GCash Payment Verification flow (Student QR scan ➔ screenshot and reference submission).
- [x] Add Finance Clerk Dashboard and Verification modal to cross-reference reference IDs.
- [x] Restrict document queues so they only enter Window 1 or Secretary desks after `payment_status` is `PAID`.

### Phase 2: Intelligent Intake & Clerk Workspaces
**Status:** Complete
- [x] Build Clerk Queue Dashboard table in React
- [x] Design split-screen evaluation modal for Secretary view matching UI mockups
- [x] Implement Intake Scanner dropzone in Window 1 workspace
- [x] Add Registrar Admin manual verification queue listing

### Phase 3: Dynamic Hand-off & The Core Loop
**Status:** Complete
- [x] Implement Approve/Reject action buttons on Clerk and Secretary dashboards
- [x] Wire database status updates to automatically forward documents through the desk workflow
- [x] Complete end-to-end testing of core loop: Intake -> Payment Submit -> Finance Verify -> Secretary OCR Approve -> Window 1 Release -> Completed

### Phase 4: Visual Alignment & Mockups Reconciliation
**Status:** Complete (100% Visual and Behavioral Matching)
- [x] Realign Login Page into vertical grey-and-green split-screen layout
- [x] Refactor Window 1 Clerk dashboard to include Workspace Dashboard, Release Queue, Manual Input tabs, scan scanning dropzone and scanner modals
- [x] Refactor Student Portal dashboard to include Dashboard, Request History, Payment History tabs, success payment screens, and live status tracking timeline modal
- [x] Refactor Finance Clerk dashboard to include active queue tables, action triggers, and receipt review detail modal
- [x] Refactor College Secretary dashboard to include dashboard queues, completed evaluation logs tabs, and data verification split-screen modals
- [x] Align Admin Registrar dashboard with smooth SVG forecast splines and real-time backlog alert feeds

### Phase 5: Hardware & AI Automation
**Status:** Complete
- [x] **AI EasyOCR Microservice Live Connection:** Linked the Express backend file-upload endpoint to the active Flask OCR engine.
- [x] **AI Requirement Verification:** Implemented conditional requirement logic to cross-reference extracted OCR text and log `ai_verified`.
- [x] **Dynamic Checkout Forms:** Bypassed manual Secretary pricing by automatically calculating fees using `Math.ceil(semesters / 4) * 100`.
- [x] **SMS Gateway Activation:** Activated UniSMS API directly in the backend to notify students via text message upon evaluations.
- [x] **In-App Notifications:** Built real-time notification drops and settings modal for phone numbers.
- [x] **Hardware Scanner Bridge:** Implemented Window 1 scanner simulator to dynamically activate PyTorch extraction without an enterprise SDK.

### Phase 6: Machine Learning & Workflow Orchestration
**Status:** Complete
- [x] **Seeding Historical Data:** Executed `ai-engine/mock_data_gen.py` to seed thousands of log records in the MySQL database to populate the Prophet forecasting model.
- [x] **n8n Workflow Integration:** Imported and executed `routing-workflow.json` on the n8n orchestrator to automate document forwarding.

### Phase 7: Multi-Channel Communication & Global Auditing
**Status:** Complete
- [x] **Email & SMS Dual Dispatches:** Integrated `nodemailer` to dispatch email alerts concurrently with `unisms` text messages upon secretary document evaluation.
- [x] **Admin Users & Activity Logs:** Built a massive "Registered Users" global search table and a real-time system "Activity Logs" audit trail.
- [x] **Re-Registration Logic:** Auto-deletion of rejected student accounts to allow them to retry registration.
- [x] **UI Validation Polish:** Enforced explicit `STUDENT ID / STAFF ID` on the login page, and added `Confirm Password` & `Phone Number` validation to the signup flow.

### Phase 8: Architecture Restructure & Hardening
**Status:** Complete
*Migrated the organically-grown codebase into the strict layered folder schema documented in `CODING_PREFERENCES.md`. No functional changes — the full pipeline was re-verified end to end afterward.*
- [x] **Backend Layering:** Decomposed `routes/auth.js`, `documents.js`, and `payments.js` into `backend/src/` following route → controller → service → model. Controllers now only handle `req`/`res`; all SQL lives in `models/*.model.js` with an optional transaction executor.
- [x] **Integration Services:** Extracted `notification.service.js` (UniSMS + Nodemailer + in-app), `aiEngine.service.js`, and `n8n.service.js`. All fail soft, so an offline AI engine or SMS outage can never roll back a document action.
- [x] **Frontend Feature Split:** Broke the ~2,000-line `DashboardPage.jsx` into five per-role components under `frontend/src/features/` (student, finance, window1, secretary, admin), each owning its own modals. The page is now a thin role dispatcher.
- [x] **Service Layer Split:** Divided `services/api.js` into a shared axios instance plus `authService.js` and `documentsService.js`. Removed the raw `fetch()` calls that were living inside `DashboardPage.jsx`.
- [x] **Secrets Cleanup:** Removed the hardcoded UniSMS key that was serving as a `||` fallback default; centralized all configuration in `src/config/env.js` and documented every variable in `backend/.env.example`.
- [x] **Tooling:** Added the `@/` → `src/` path alias (`vite.config.js` + `jsconfig.json`).
- [x] **Dead Code Removal:** Deleted the unreachable `QueuePage.jsx`, `UploadPage.jsx`, and their `useDocuments`/`useDocumentUpload` hooks.
- [x] **Bug Fixed in Passing:** Repaired a latent `setScanFile is not defined` ReferenceError in the Window 1 scanner UI (it was referenced but never destructured in the old `DashboardPage.jsx`).

### Phase 9: Security Hardening
**Status:** Complete
*Five vulnerabilities found by probing the running system, each fixed and covered by a regression test.*
- [x] **IDOR on payment submission:** any logged-in student could attach a receipt to another student's request. `submitPayment` now verifies ownership and that the request is still awaiting payment.
- [x] **Forged document ownership:** `uploadDocument` trusted a client-supplied `student_id`, so a student could file a request in someone else's name (and an omitted field created an unowned document nobody could pay for). A student's requests are now always filed against their own record; staff keep the supplied values.
- [x] **Unauthenticated machine endpoints:** `POST /documents/assign` and the payment webhooks were completely open. They now require the shared `WEBHOOK_SECRET` via an `x-webhook-secret` header, compared in constant time.
- [x] **World-readable uploads:** student ID photos and GCash receipts were served by `express.static` with no auth. Replaced by `GET /api/files/:filename`, which authenticates the caller, checks ownership, and blocks path traversal.
- [x] **No login throttling:** added rate limits (10 failed logins / 15 min per IP, 20 registrations / hour, 1000 API requests / 15 min).
- [x] **Secret rotation:** `JWT_SECRET` was identical to a placeholder public in git history since the first commit — a full authentication bypass. Rotated, and the server now refuses to start without it.

### Phase 10: Technical Debt Paydown & Automated Testing
**Status:** Complete
- [x] **Role hook split:** replaced the 542-line `useDashboard.js` (47 return values) with `hooks/useDashboardCore.js` plus one hook per role under `features/<role>/`. Each command center now takes **3–4 props instead of 13–32**, and `DashboardPage.jsx` is a thin dispatcher holding no queue state.
- [x] **Vitest in both packages:** `cd backend && npm test`, `cd frontend && npm test`. **190 tests** covering the security fixes, pricing rules, desk pipeline transitions, role scoping, AI fallbacks, and a render smoke test per dashboard.
- [x] **De-duplication:** 7 UI helpers existed both in `useDashboard.js` and `utils/`; the copies are gone and features import from `utils/documentStatus.js` and `utils/formatters.js`.
- [x] **Pure helpers extracted:** `calculateAmount` and `generateTrackingNumber` moved to `backend/src/utils/pricing.js`.
- [x] **Cruft removed:** deleted 5 one-off debug scripts (one silently reset a real teammate's password); kept `audit.js` as the live E2E audit.
- [x] **Zero ESLint errors** across the frontend for the first time.
- [x] **Ports moved:** frontend 5173→**5273**, backend 3000→**3300** to stop clashing with other local projects. Corrected the AI engine's documented port (5000→**5005**; 5000 is taken by macOS Control Center).

### Phase 11: Panel Feedback — Category 1 (Database & Core Features)
**Status:** Complete
*Panel defense feedback, category 1 of 4. Categories 2–4 follow in order.*
- [x] **Student status expansion:** added `users.enrollment_status` (active/graduated/dropout/transferred) and `users.study_load` (regular/irregular) as **two orthogonal axes** — a student can be Irregular *and* Active, whereas graduated/dropout are mutually exclusive outcomes. Existing alumni backfilled automatically.
- [x] **Multi-document requests:** a student can select several document types and **pay once for the combined total**. Documents share a `request_group_id` but keep their own status and desk routing, so a fast Diploma isn't held up by a slow Transcript. All 10,015 existing documents were backfilled as single-item groups, leaving every prior query correct.
- [x] **Graduate Application module:** admin-configurable form. Field definitions live in `grad_form_fields` and answers are one row each in `grad_application_values`, so the Registrar can add a question **without a migration or a code change**. Validation is generated from the definitions.
- [x] **Reference data:** document types and colleges moved out of hardcoded frontend `<option>` lists into `document_types` and `colleges` tables. Fees are now admin-editable (`base_fee`); TOR's per-4-semester rule stays in `utils/pricing.js` because it isn't a single number.
- [x] **Server-side pricing:** a client-supplied `amount` is ignored — totals are always recomputed from the database.
- [x] **Ownership hardening:** `uploadDocument` no longer trusts a client-supplied `student_id`. A student's request is always filed against their own record, which also fixed unowned documents nobody could pay for.
- [x] **Tests:** 284 total (184 backend + 100 frontend), up from 190. Zero ESLint errors and warnings.

### Phase 12: Panel Feedback — Category 2 (Admin Maintenance & Analytics)
**Status:** Complete
- [x] **Maintenance CRUD:** admin management of Staff, Document Types and Colleges. **"Delete" is always a deactivation** (`is_active = false`) — documents reference document types by name and users reference colleges by name, so removing a row would orphan historical records. Entries can be restored.
- [x] **Guardrails:** a document type already used by requests cannot be renamed (the error names how many documents reference it), though its fee can still change. An admin cannot deactivate their own account.
- [x] **Staff passwords:** an admin sets a temporary password and the account is flagged `must_change_password`, so the admin-chosen secret is single-use. The flag clears once the user sets their own. Passwords are never returned or logged.
- [x] **Report generation:** filter by date range, status, document type and payment status. The rows, the summary totals and the CSV export all use the same filter set, so they cannot disagree. Malformed dates are rejected instead of silently returning everything.
- [x] **CSV export:** by student category (Active / Graduates-Alumni / Others / All) and of the filtered document report. Written by hand rather than via a dependency — it escapes commas, quotes and newlines, neutralises spreadsheet formula injection (`=`, `+`, `-`, `@`), and emits a UTF-8 BOM so accented names open correctly in Excel.
- [x] **Efficiency analytics:** turnaround per desk, end-to-end completion time, throughput trend, and workload per staff member — all derived from the `step_logs` audit trail. On current data this identifies **Secretary Evaluation as the bottleneck**. Per-clerk figures are deliberately presented as workload distribution, not a performance ranking.
- [x] **Indexes** added on `step_logs.timestamp_started`, `step_logs.action_taken`, `documents.current_status` and `documents.created_at` to keep reporting responsive.
- [x] **Tests:** 407 total (286 backend + 121 frontend), up from 284. Zero lint errors and warnings.

### Phase 13: Panel Feedback — Category 3 (Payments & Notifications)
**Status:** Complete
- [x] **Payment methods expanded:** GCash, Credit/Debit Card, Online Banking/Bank Transfer, and Over-the-Counter. Each is a row in the admin-managed `payment_methods` table with its own instructions and reference label, so the Registrar can enable one without a deploy. The chosen method is recorded on the document and named in the audit trail.
- [x] **Gateway-ready abstraction:** `src/services/payment/` registers providers by name. Every method resolves to the `manual` provider today — the student pays out-of-band and Finance verifies against the institution's own records, which is what PLP requires. A hosted gateway can be added by registering a provider and setting `payment_methods.provider`, without touching `documents.service.js`.
- [x] **Real-time in-app notifications:** Socket.IO shares the HTTP server, so no extra port and it rides the existing Vite proxy. **Measured 55 ms** from a student submitting payment to the Finance clerk's dashboard receiving the push.
- [x] **Socket authentication:** the handshake is verified with the same `JWT_SECRET` as the REST API — connections with no token or an invalid token are refused (both verified live). Each socket joins only `user:<id>` and its own desk room, so it can never receive another account's notifications.
- [x] **Fails soft:** a missing or broken realtime layer degrades to the existing fetch-on-load behaviour and can never affect a stored notification or the desk action that triggered it.
- [x] **Push notification fix:** the SMS/email failures were **configuration, not code**. SMTP settings fell back to placeholder credentials (`mock_user`/`mock_pass`), so every email died at send time with an opaque `535 Authentication failed`. Placeholders are gone, channel health is now reported at startup, and unconfigured channels are skipped with a stated reason instead of attempted.
- [x] **Tests:** 438 total (309 backend + 129 frontend). Zero lint errors and warnings.

### Phase 14: Panel Feedback — Category 4 (UI/UX Overhaul)
**Status:** Complete
*The last of the four panel-feedback categories. With this the panel's list is closed.*
- [x] **Mobile navigation:** the sidebar rail is `hidden md:flex`, so below 768 px there was previously **no navigation at all** — a student on a phone could not reach Request History, Payment History, or the Graduate Application. A hamburger now opens a labelled drawer. Both the rail and the drawer render from one definition (`layouts/SidebarNav.jsx` + `utils/navigation.js`), so a tab can never appear on one and be missing from the other.
- [x] **Bounded tables:** every queue table now scrolls inside a `max-h-[60vh]` container with a `sticky` header, instead of the Admin tracker rendering all 10,015 documents down the page and pushing the header out of view. The header rows needed an explicit `bg-white` — they were transparent, so rows would otherwise show through as they scrolled underneath.
- [x] **Responsive pass:** page titles, card padding, fixed-height KPI cards and two-column form grids all adapt below `sm`. Fixed `h-44` KPI cards became `min-h-44`, since they clipped their own text once it wrapped.
- [x] **Profile Card:** Account Settings was a bare three-input form inlined in `Layout.jsx`. It is now a profile card — avatar, identity, then the editable fields — extracted to `components/ProfileSettingsModal.jsx` (presentational) driven by `hooks/useProfileSettings.js` (state + API), per the components-never-call-APIs rule.
- [x] **Profile picture upload:** new `users.profile_picture` column and `PUT /api/auth/profile/picture` (JPG/PNG/WebP, 2 MB). Only the filename is stored; the previous avatar is deleted on replace so uploads do not accumulate. **Served through the authenticated `/api/files` route, never a public static path** — verified live: owner 200, staff 200, another student **403**, unauthenticated **401**.
- [x] **A wrong file type answered 500**, because the multer `fileFilter` raised a plain `Error` with no status for the shared error handler to map. It now raises `badRequest`, so the student sees the real reason with a 400.
- [x] **Feedback moved out of `alert()`:** saves and upload failures render as inline banners.
- [x] **Tests:** 483 total (318 backend + 165 frontend), up from 438. Zero ESLint errors and warnings.

### Phase 15: Production Rollout Checklist
**Status:** In Progress
- [x] **Rotate `JWT_SECRET`** — done. The old value was identical to a placeholder public in git history since the first commit, which made every auth token forgeable.
- [x] ~~**Seed Per-College Secretaries**~~ — resolved. `seed.sql` now creates all seven (`SEC-CCS001` … `SEC-CBA001`) and the `course = NULL` legacy `SEC001` is gone from the seeds.
- [x] **Forgot Password Recovery** — delivered in Phase 16 below.
- [ ] **Rotate the UniSMS API key** in the UniSMS dashboard; it is still in git history.
- [ ] **Configure SMTP** so reset links and student alerts actually send.
- [ ] **Production API URL for the frontend** — the built SPA has no way to reach the backend without the Vite dev proxy.
- [ ] **Persistent uploads** — container-local disk today; the directory is not even created at boot.
- [ ] **Managed-database TLS** — `config/db.js` passes no `ssl` option.
- [ ] **Dockerization:** Create Dockerfiles for Frontend, Backend, and AI Engine (none exist yet), and serve Flask under a WSGI server instead of the Werkzeug dev server.
- [ ] **Database Connection Pool Load Testing:** Conduct final load checks to ensure pooled connections release cleanly during high-volume spikes. `connectionLimit` is a hardcoded 10 with an unbounded queue.
- [ ] **Cloud Deployment:** Host Frontend, Backend, and Flask AI microservices.

### Phase 16: Pre-Deployment Refinement
**Status:** Complete
*Closing the application-level gaps before infrastructure work begins — a promised feature that did
not exist, an orchestration feature that had been silently dead for a month, a live crash, and
documentation that contradicted both the code and itself.*
- [x] **Forgot-password recovery.** `LoginPage` had a `<Link to="#">` and nothing behind it. Now a
  full flow: `POST /api/auth/forgot-password` accepts a student ID **or** an email and **always
  answers identically** whether or not the account exists, so it cannot be used to enumerate
  registered accounts (verified live — the two responses are byte-identical). Tokens are 32 random
  bytes stored **only as a SHA-256 hash**, so a database dump yields no usable links.
- [x] **Single-use, not just short-lived.** A JWT reset token — which the earlier plan called for —
  can be replayed until it expires, even after the password has already changed. `password_resets`
  records `used_at`, and `findUsableByTokenHash` filters used *and* expired rows **in SQL**, so a
  wrong clock on the app server cannot extend a token's life. Verified end to end: reset succeeds,
  the same token is refused on reuse (400), the old password stops working (401), the new one works.
- [x] **Testable without SMTP.** Email is optional configuration, so an unconfigured channel logs the
  reset link to the server console rather than failing silently — the same "skip with a stated
  reason" pattern the other notification channels use.
- [x] **n8n routing repaired.** `routing-workflow.json` was last touched 2026-07-11 and had **three**
  independent breakages: it posted to port **3000** after the backend moved to 3300, it sent no
  `x-webhook-secret` (added later, so every call was 401), and it hardcoded a clerk `SEC001` that no
  longer exists. Nothing surfaced because the client swallows errors and the queues filtered on
  `current_status` alone. The URL and secret now come from n8n environment variables so a port change
  cannot silently re-break it.
- [x] **Routing made load-bearing.** The webhook payload now carries `college_code`, so the workflow
  can resolve the correct `SEC-<code>001` secretary instead of one hardcoded clerk, and
  `assigned_clerk_id` genuinely affects the Secretary queue — verified live: after routing, the
  target secretary sees the document and another college's secretary does not. Two deliberate limits
  keep it safe: an **unassigned** document still falls back to the college filter (old vs new SQL
  return identical counts on the live 10,015-row dataset), and an assignment to a **non-Secretary**
  desk is ignored there, since the workflow also routes TOR/Diploma to Window 1 at intake.
- [x] **Finance modal crash fixed.** `FinanceVerificationModal` called `triggerNotification` when a
  clerk picked a receipt over 5 MB, but `FinanceDashboard` never passed it — a `TypeError`, not a
  cosmetic gap. The regression test was confirmed to reproduce the original error before the fix.
- [x] **Health check tells the truth.** The server deliberately boots without a database, but
  `/api/health` never touched one, so it answered **200 with a dead database** — an orchestrator would
  call a broken container healthy. It now runs `SELECT 1` and returns **503** with the reason
  (verified against an unreachable database), and sits above the rate limiter so probes are never
  throttled.
- [x] **CORS tightened.** `app.js` used a bare `cors()` and Socket.IO reflected **any** origin *with
  credentials*, which would let any website open an authenticated socket. Both now share one
  `FRONTEND_URL`-driven allowlist that stays permissive in development.
- [x] **Legacy code deleted.** `payments.service.js` (PayMongo-style webhook + `simulate-payment`),
  its controller and its routes — unreachable from the frontend and superseded by the manual GCash
  flow. It also self-called `http://localhost:${PORT}`, which breaks behind any load balancer.
- [x] **Documentation reconciled.** `CLAUDE.md` claimed `POST /api/documents/assign` was
  "deliberately unauthenticated" while `BACKEND_GUIDE.md` correctly documented its webhook secret;
  the dev spec cited 438 tests in one section and 483 in another; the README still said Category 4
  was outstanding. All corrected.
- [x] **Tests:** 514 total (339 backend + 175 frontend), up from 483. Zero ESLint errors.

### Phase 17: Deployment Readiness
**Status:** Complete (code) — awaiting a provisioned host
*Target: frontend on Vercel (free), everything else as containers on one VM. **n8n cannot run on
Vercel** — it is a stateful container with its own database — so a container host is required
regardless, and the backend lives beside it rather than as a function. That also avoids rewriting
uploads onto object storage and adding a Redis adapter for Socket.IO.*
- [x] **ARM viability proven first.** The target VM (Oracle Cloud Ampere) is aarch64, which was the
  one risk that could have invalidated the whole hosting choice, so it was retired before anything
  else. Built and ran the AI engine at `linux/arm64`: `torch 2.8.0+cpu` resolves an aarch64 wheel,
  **Prophet fits** (the cmdstanpy Stan binary compiles), and `/ocr/extract` returned correct text and
  form type from a test image. 2.46 GB image.
- [x] **Frontend can reach a remote API.** `services/api.js` was `baseURL: '/api'` and
  `realtimeService.js` a bare `io()` — both worked **only** through the Vite dev proxy, which
  `vite build` does not produce, so a deployed SPA had no route to the backend at all. Both now read
  `VITE_API_URL`; unset keeps today's relative behaviour. These are the only two URL-construction
  points, and `useAuthedFile` inherits the shared axios instance.
- [x] **SPA deep links.** Added `vercel.json` (and `nginx.conf` for the container path) rewriting
  non-asset paths to `index.html`. Without it `/reset-password?token=…` — the link the reset email
  sends — returns **404** on a static host, so the feature would have looked broken in production
  while working locally.
- [x] **Database TLS.** `config/db.js` passed no `ssl` option; most managed MySQL refuses a plaintext
  connection, which would have been the first deploy failure. Added `DB_SSL`/`DB_SSL_CA` with
  verification always on, plus a bounded queue and an env-driven pool limit.
- [x] **The uploads `ENOENT` bug.** `UPLOAD_DIR` was computed but never created — the directory only
  existed in the repo because `.gitkeep` held it open, so a fresh container failed its **first**
  upload. Now created at boot; verified live in a fresh container with an empty volume: upload → 200,
  read back through the authenticated route → 200, unauthenticated → 401, survives a restart.
- [x] **Proxy-aware rate limiting.** No `trust proxy` meant every request behind a load balancer
  carried the proxy's IP, collapsing the IP-keyed limiters into one shared bucket. Now set from
  `TRUST_PROXY` as a **hop count**, never `true` — trusting `X-Forwarded-For` outright would let a
  client spoof its address and evade `loginLimiter`.
- [x] **AI engine made servable.** `app.py` defaulted to `debug=True` whenever `FLASK_ENV` was unset,
  serving the Werkzeug interactive debugger — now strictly opt-in via `FLASK_DEBUG`. Added gunicorn.
  EasyOCR's ~100 MB of models are **baked into the image** instead of downloaded at import, which
  previously blocked the port opening. The per-request MySQL connection is now a context manager, so
  an error no longer leaks a connection against the provider's cap.
- [x] **Containers.** Dockerfiles for all three services plus `docker-compose.yml` covering all four
  and MySQL, with `schema.sql`/`seed.sql` auto-applied to a fresh volume. `JWT_SECRET` and
  `WEBHOOK_SECRET` are `${VAR:?}` so compose refuses to start rather than defaulting.
- [x] **Split-origin verified end to end.** Built with `VITE_API_URL`, served from a different port:
  CORS allowed the configured origin and **refused a hostile one**, cross-origin login and an
  authenticated file read both succeeded, the Socket.IO handshake authenticated over the **websocket**
  transport, and **three live notifications arrived over the cross-origin socket** while the pipeline
  ran. Deep links resolved 200.
- [x] **HTTPS layer.** Added `deploy/Caddyfile` and a compose `tls` profile for automatic Let's
  Encrypt. Required rather than optional: the Vercel-hosted frontend is served over https, and a
  browser blocks an https page from calling an http API, so without a certificate the deployed app
  cannot reach its own backend. `API_DOMAIN` uses a soft default because compose interpolates the
  whole file regardless of which profiles are active — a hard `${VAR:?}` guard there broke plain
  local `docker compose up`.
- [x] **Deployment guide.** `docs/DEPLOYMENT_GUIDE.md` — eight parts, each ending in a verification
  check to pass before continuing, plus troubleshooting for the failure modes actually hit while
  building this (CORS mismatch, `VITE_API_URL` set after the build, port 5678 already held by a
  standalone n8n container, certificate blocked by the VM's own iptables).
- [x] **Tests:** 523 total (345 backend + 178 frontend), up from 514. Zero ESLint errors.

---

## Known Issues (Pre-existing, surfaced during the Phase 8 audit)
These predate the restructure and remain open:
* ~~Secretary seed drift~~ — **resolved.** `migration.js` seeds all seven per-college secretaries; they now exist. A stale `SEC001` with a `NULL` course remains and sees every college's queue, so consider removing it.
* ~~**Unpassed modal props**~~ — **resolved.** `deliveryMethod`/`setDeliveryMethod` no longer exist on `NewRequestModal`, and `FinanceVerificationModal`'s `triggerNotification` is now passed by `FinanceDashboard` (Phase 16). The latter was a live crash, not just an unused prop.
* ~~**Unused legacy payments route**~~ — **resolved.** `payments.service.js`, its controller and its routes were deleted in Phase 16.

---

## Recent Major Changes
* **Architecture Restructure:** Migrated backend to `src/` route → controller → service → model layering and split the monolithic `DashboardPage.jsx` into five role-scoped feature components. See Phase 8 above.
* **E2E Linting & Bug Fixes:** Eliminated all 30+ ESLint errors (removed unused imports, safely handled state updates).
* **UI/UX Polishing:** Extracted all large inline modals into standalone components (`LiveTrackingModal`, `SecretaryEvaluationModal`). Fixed dynamic JSON rendering for document evaluation forms.
* **Multi-Channel Delivery:** Upgraded standard SMS text alerts into concurrent Email + SMS drop alerts via Nodemailer + UniSMS integrations.
* **Authentication Hardening:** Solidified user registration endpoints, updated SQL schemas to accept dynamic `email` and `phone_number` updates via the `SettingsModal`, and prevented email-login ambiguity in the UI.
* **Global Audit Dashboards:** Equipped the Admin Registrar with real-time `Activity Logs` and `Registered Users` search tools for system-wide user governance.
* **UI Realignment Completed:** Fully reconciled every dashboard route and user modal with the design mockup specifications from the `UI/` folder.
* **Manual Payments Integrated:** Replaced references to external payment gateways with a manual GCash receipt validation loop.
* **College-Based Routing:** Enforced queue segregation allowing College Secretaries to exclusively evaluate documents belonging to students from their respective colleges.
* **AI 3-Point Registration Verification:** Augmented `ocr_engine.py` to cross-validate School Name, Student ID, and College on uploaded IDs.
* **Finance Rejection Pipeline:** Integrated 'Reject Payment' action and mandatory Clerk Notes for invalid manual GCash payments.
* **Notification System Fixed:** Patched Axios wrapper bugs in `api.js` to ensure the real-time bell dropdown accurately populates, and added notification triggers to the Window 1 release endpoint.
* **Defense Script Generated:** Built a highly detailed, stage-directed Capstone defense transcript for a 3-person team.
* **Unified Dashboard Page:** Rebuilt `DashboardPage.jsx` and `Layout.jsx` with responsive layouts and multi-tab sidebars corresponding to the active role.
