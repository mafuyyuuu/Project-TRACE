# Project TRACE: Progress & Roadmap

This document serves as the master tracking sheet for Project TRACE. It organizes the system's development into distinct phases across the full technology stack (Frontend, Backend, and Machine Learning) so you can easily track what has been completed and what remains for a true production rollout.

> **On phase numbers:** this roadmap groups work into coarser phases than [`PROGRESS.md`](PROGRESS.md), so the numbers deliberately differ between the two documents. The same production-rollout work is "Phase 9" here and "Phase 12" there. `PROGRESS.md` is the finer-grained checklist; this is the stack-level narrative.

---

## ✅ Phase 1: Foundation & Core Logic (Completed)
*The initial setup of the architecture, database schema, and UI shells.*

* **Frontend (React/Vite):**
  * Built the unified `/dashboard` route handling 5 different command center views based on user roles (Student, Finance, Window 1, Secretary, Admin).
  * Designed the Tailwind CSS UI components (timeline bars, evaluation modals, KPI cards).
* **Backend (Node.js/Express):**
  * Established the MySQL database schema and connection pooling.
  * Created foundational CRUD routes in `documents.js` and `auth.js`.
  * Set up role-based authentication and desk assignments.
* **ML/AI Engine (Flask/Python):**
  * Built the `/ocr/extract` microservice wrapping the **EasyOCR (PyTorch)** model.
  * Built the `/ocr/verify` endpoint for ID matching.
* **Orchestrator:**
  * n8n workflow designed to handle basic routing between statuses.

---

## ✅ Phase 2: Dynamic Data Wiring (Completed)
*Connecting the UI to the database and removing hardcoded placeholders.*

* **Database (MySQL):**
  * Executed `migration.js` to patch schema constraints and add missing columns (`amount`, `copies`, `ocr_confidence_score`, `purpose`, `course`, `gcash_reference_no`).
* **Backend (Node.js/Express):**
  * Built dynamic KPI endpoints (`/stats`, `/stats/forecast`, `/stats/insights`).
  * Updated the tracking endpoints to return all necessary document metadata and step logs.
  * Added the `/student/:studentId` lookup endpoint for manual data entry.
* **Frontend (React/Vite):**
  * Replaced all 61+ hardcoded strings, dates, and numbers in `DashboardPage.jsx`.
  * Wired up the API service methods (`getDashboardStats`, `getForecast`, `getInsights`, `lookupStudent`).
  * Replaced the static forecast chart and AI insights with dynamic data mapping.
  * Wired image previews to pull dynamically from the backend upload directory.

---

## ✅ Phase 3: Hardware & 3rd-Party Integrations (Completed)
*Replacing mockups with real-world integrations and automating the core loops.*

* **Backend (Node.js/Express) & SMS:**
  * ✅ **SMS Alerts:** Integrated the UniSMS API in `documents.js` to dispatch real SMS text messages to students upon evaluation and payment verification.
  * ✅ **Instant Checkout & Dynamic Pricing:** Completely automated the Secretary's fee assessment by implementing dynamic smart forms (e.g., asking for semesters attended) and calculating exactly `Math.ceil(semesters / 4) * 100` before instantly popping the GCash modal.
* **ML/AI Engine (Flask/Python) & Workflow:**
  * ✅ **AI Requirement Verification:** Modified the EasyOCR Flask endpoint to actively cross-reference uploaded requirements against the requested document type, saving an `ai_verified` or `ai_flagged` status.
  * ✅ **In-App Notifications & Settings:** Added Bell Icon tracking and User Profile updates for phone numbers.
  * ✅ **Machine Learning Seeding:** Ran `mock_data_gen.py` to seed thousands of historical step logs, fully activating the **Prophet** forecasting model and **Random Forest** prescriptive engine for the Admin dashboard.
  * ✅ **Hardware Scanner Bridge:** Built a simulated scanner hook in the Window 1 Clerk dashboard to activate PyTorch OCR.
  * ✅ **n8n Workflow Execution:** Deployed and published the `routing-workflow.json` orchestrator to completely automate document forwarding across desks.

---

## ✅ Phase 4: UI/UX Polishing & Code Quality (Completed)
*Refining the frontend architecture and resolving all technical debt.*

* **Frontend Codebase:**
  * ✅ **ESLint Resolution:** Eliminated all 30+ linting errors, including unused variables, purity warnings, and bad state assignments inside `useEffect`.
  * ✅ **Modal Architecture Refactor:** Extracted inline modals (`LiveTrackingModal`, `SecretaryEvaluationModal`, `FinanceVerificationModal`) into standalone components to prevent file bloat and prop-drilling errors.
  * ✅ **Dynamic JSON Rendering:** Fixed the display of the `purpose` field so it neatly maps non-empty JSON key-value pairs in the Secretary Dashboard.
  * ✅ **UI Realignment:** Ensured all UI elements precisely match the design mockups, optimizing spacing and responsivenes.

---

---

## ✅ Phase 5: Multi-Channel Communication & Global Auditing (Completed)
*Expanding system communication to email and implementing global administrator audits.*

* **Email Integration:**
  * ✅ **Nodemailer:** Deployed `nodemailer` alongside `unisms` to dispatch concurrent Email and SMS notifications during Secretary document evaluation.
* **Global Administrator Audit:**
  * ✅ **Activity Logs:** Engineered a global `Activity Logs` dashboard tab for the Admin to view real-time system actions (`step_logs` mapping).
  * ✅ **Registered Users:** Engineered a `Registered Users` search table for the Admin to govern all verified/pending accounts across the system.
* **Authentication Hardening:**
  * ✅ **Re-Registration:** Engineered SQL logic to auto-delete rejected accounts so students can safely re-register using the same email/ID.
  * ✅ **UI Protections:** Enforced explicit `STUDENT ID / STAFF ID` labeling on the login screen to prevent accidental email submissions. Added `Confirm Password` & `Phone Number` validation to the signup flow. Expanded the `SettingsModal` to dynamically update `email`.

---

## ✅ Phase 6: Architecture Restructure & Hardening (Completed)
*Migrating the organically-grown codebase into a strict layered folder schema. No functional changes — the full desk pipeline was re-verified end to end afterward.*

* **Backend (Node.js/Express):**
  * ✅ **Layered Decomposition:** Split `routes/auth.js`, `documents.js`, and `payments.js` into `backend/src/` following route → controller → service → model. Controllers handle only `req`/`res`; all SQL now lives in `models/*.model.js`, each function accepting an optional transaction executor.
  * ✅ **Integration Services:** Extracted `notification.service.js` (UniSMS + Nodemailer + in-app), `aiEngine.service.js`, and `n8n.service.js`. Every channel fails soft, so an offline AI engine or a failed SMS can never roll back a committed document action.
  * ✅ **Secrets & Config:** Removed the hardcoded UniSMS key that had been serving as a `||` fallback, centralized configuration in `src/config/env.js`, and documented every variable in `backend/.env.example`.
* **Frontend (React/Vite):**
  * ✅ **Feature Split:** Broke the ~2,000-line `DashboardPage.jsx` into five per-role components under `src/features/` (student, finance, window1, secretary, admin), each owning its own modals. The page is now a thin role dispatcher.
  * ✅ **Service Layer:** Split `services/api.js` into a shared axios instance plus `authService.js` and `documentsService.js`, and removed the raw `fetch()` calls that had been embedded in `DashboardPage.jsx`.
  * ✅ **Structure & Tooling:** Added `layouts/`, `utils/`, and the `@/` → `src/` path alias. Deleted the unreachable `QueuePage.jsx`, `UploadPage.jsx`, and their hooks.
  * ✅ **Bug Fixed in Passing:** Repaired a latent `setScanFile is not defined` ReferenceError in the Window 1 scanner UI.

---

## ✅ Phase 7: Security Hardening & Automated Testing (Completed)
*Probing the running system surfaced five real vulnerabilities; each is fixed and pinned by a regression test.*

* **Security (Backend):**
  * ✅ **Authorization, not just authentication:** fixed an IDOR letting any student attach a receipt to another student's request, and stopped `uploadDocument` trusting a client-supplied `student_id`.
  * ✅ **Closed the open machine endpoints:** `/documents/assign` and the payment webhooks now require a shared `WEBHOOK_SECRET` header.
  * ✅ **Protected uploaded files:** student ID photos and receipts were world-readable; they are now served through an authenticated, ownership-checked, traversal-safe `/api/files` route.
  * ✅ **Rate limiting** on login and registration, and rotation of a `JWT_SECRET` that had been public in git history since the first commit.
* **Testing:**
  * ✅ **Vitest in both packages — 190 tests.** Backend service/authorization coverage plus frontend utils, the file hook, and a render smoke test for all five dashboards.
* **Frontend Architecture:**
  * ✅ **Role hook split:** the 542-line `useDashboard.js` became a shared core plus five per-role hooks, cutting each command center from 13–32 props to 3–4 and leaving `DashboardPage` a thin dispatcher. Zero ESLint errors.
* **Developer Experience:**
  * ✅ **Ports moved** off the contested 5173/3000 to 5273/3300, and the AI engine's documented port corrected to 5005.

---

## ✅ Phase 8: Panel Feedback — Category 1 (Completed)
*First of four categories from the capstone panel's defense feedback.*

* **Database:**
  * ✅ **Student statuses:** `enrollment_status` + `study_load` as two orthogonal axes, so "Irregular" and "Dropout" are modelled correctly rather than crammed into one column.
  * ✅ **Reference data:** `document_types` and `colleges` tables replace hardcoded frontend lists, making fees and document availability admin-editable.
  * ✅ **Graduate application:** `grad_form_fields` / `grad_applications` / `grad_application_values` support a form whose questions the Registrar defines — adding a field needs no migration.
* **Core Features:**
  * ✅ **Multi-document requests:** one selection, one payment, one combined total — but each document routes through the desks independently via a shared `request_group_id`.
  * ✅ **Graduate Application module:** dynamic form rendering plus a staff review queue, with validation derived from the field definitions.
* **Hardening:**
  * ✅ Fees are computed server-side from the database; a client-sent amount is ignored. `uploadDocument` no longer trusts a client-supplied `student_id`.
* **Testing:** 284 tests (184 backend, 100 frontend); zero lint errors.

---

## 🚀 Phase 9: Production Deployment (Pending)
*Taking the system live on external servers.*

* **Rotate the leaked secrets:** `JWT_SECRET` (the `.env` value matches the placeholder that has been in git history since the first commit — it signs every auth token, so it is a full authentication bypass) and the UniSMS API key. Both must be rotated before any deployment.
* **Seed Per-College Secretaries:** `seed.sql` creates only `SEC001` (course `NULL`); the seven documented `SEC-CCS001` … `SEC-CBA001` accounts must be seeded before college-based routing can be demonstrated.
* **Forgot Password Flow:** Implement the full JWT reset token email flow in `src/services/auth.service.js` and build the `/reset-password` frontend route.
* **Frontend:** Build the Vite project (`npm run build`) and serve via Nginx or deploy to Vercel/Netlify.
* **Backend:** Deploy the Node.js API to a VPS (e.g., DigitalOcean, AWS EC2) or a PaaS (e.g., Render, Railway) using PM2 for process management.
* **ML/AI Engine:** Deploy the Flask application. *(Note: Because PyTorch/EasyOCR is heavy, this microservice may require a server with adequate RAM or a small GPU for fast inference).*
* **Database:** Migrate the local MySQL database to a managed cloud database (e.g., AWS RDS, PlanetScale).
* **Dockerization:** Wrap the entire system into orchestrated Docker containers for easy scaling.
