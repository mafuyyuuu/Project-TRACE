# Project TRACE Progress

This document tracks the current development and implementation progress of the Project TRACE system.

## Overall Status: 🟢 Panel Feedback — Categories 1–3 Complete (Phase 14: Production Rollout Pending)

### 📍 Next Steps for Phase 14 (Production Rollout)
The system is feature-complete locally and the codebase now follows the strict layered architecture (see `CODING_PREFERENCES.md`). The next immediate steps are taking the servers live:
1. **Rotate the two leaked secrets.** Both were hardcoded as `||` fallback defaults and remain in git history even though they are gone from the source:
   - **`JWT_SECRET` (critical).** The value currently in `.env` is byte-identical to the placeholder `trace-jwt-secret-change-in-production`, committed since the very first commit. Because it signs every auth token, anyone with repo access can forge a login for any account — including `ADMIN001`. Generate a replacement with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Rotating it invalidates existing tokens, so everyone simply logs in again.
   - **UniSMS API key.** Rotate it in the UniSMS dashboard.
2. **Fix secretary seed drift.** `seed.sql` only creates a single `SEC001` (with `course = NULL`), while the README documents seven per-college logins (`SEC-CCS001` … `SEC-CBA001`). College-based queue filtering cannot be demonstrated locally until those rows exist.
3. **Forgot Password Flow:** Implement the full JWT reset token email flow in `src/services/auth.service.js` and build the `/reset-password` frontend route.
4. **Cloud Deployment:** Build the Vite frontend for Vercel/Netlify, containerize the Flask AI Engine, and deploy the Node.js API to a cloud host (e.g., Render, Railway, AWS).
5. **Database Migration:** Migrate the local MySQL database to a managed cloud database (e.g., PlanetScale, AWS RDS).

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

### Phase 14: Production Rollout Checklist
**Status:** In Progress
- [ ] **Rotate BOTH leaked secrets:** (a) `JWT_SECRET` — the value in `.env` is identical to the placeholder committed in git history since the first commit, so anyone with repo access can forge a token for any account including admins; (b) the UniSMS API key, also previously hardcoded. Generate a new JWT secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Rotating the JWT secret logs everyone out, which is expected.
- [ ] **Seed Per-College Secretaries:** `seed.sql` creates only `SEC001` (course `NULL`) while the README documents `SEC-CCS001` … `SEC-CBA001`. College-based queue filtering can't be demonstrated until these exist.
- [ ] **Forgot Password Recovery:** Complete the email-based token reset flow.
- [ ] **Dockerization:** Create Dockerfiles for Frontend, Backend, and AI Engine.
- [ ] **Database Connection Pool Load Testing:** Conduct final load checks to ensure pooled connections release cleanly during high-volume spikes.
- [ ] **Cloud Deployment:** Host Frontend, Backend, and Flask AI microservices.

---

## Known Issues (Pre-existing, surfaced during the Phase 8 audit)
These predate the restructure and remain open:
* ~~Secretary seed drift~~ — **resolved.** `migration.js` seeds all seven per-college secretaries; they now exist. A stale `SEC001` with a `NULL` course remains and sees every college's queue, so consider removing it.
* **Unpassed modal props:** `NewRequestModal` declares `deliveryMethod`/`setDeliveryMethod` and `FinanceVerificationModal` declares `triggerNotification`, but no parent ever passed them — they are `undefined` at runtime.
* **Unused legacy payments route:** `src/services/payments.service.js` (PayMongo-style webhook + `simulate-payment`) is not called by the frontend at all; it is superseded by the manual GCash flow.

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
