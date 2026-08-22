# Project TRACE Progress

This document tracks the current development and implementation progress of the Project TRACE system.

## Overall Status: 🟢 Core System Complete + Architecture Restructured (Phase 9: Production Rollout Pending)

### 📍 Next Steps for Phase 9 (Production Rollout)
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

### Phase 9: Production Rollout Checklist
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
* **Secretary seed drift:** documented `SEC-CCS001` … `SEC-CBA001` accounts don't exist in `seed.sql`; only `SEC001` with a `NULL` course does.
* **`useDashboard.js` lint:** 2 `react-hooks/set-state-in-effect` errors remain (verified present before the restructure).
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
