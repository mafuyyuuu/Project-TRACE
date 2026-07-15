# Project TRACE Progress

This document tracks the current development and implementation progress of the Project TRACE system.

## Overall Status: 🟢 100% Core System Completed (AI, ML, Integrations, UI, Linting fully finalized)

### 📍 Next Steps for Phase 8 (Production Rollout)
The system is fully complete locally. All features, AI integrations, ML models, orchestrators, UI bug fixes, Multi-channel notifications (SMS & Email), and ESLint warnings are finalized. The next immediate step is taking the servers live:
1. **Forgot Password Flow:** Implement the full JWT reset token email flow in `auth.js` and build the `/reset-password` frontend route.
2. **Cloud Deployment:** Build the Vite frontend for Vercel/Netlify, containerize the Flask AI Engine, and deploy the Node.js API to a cloud host (e.g., Render, Railway, AWS).
3. **Database Migration:** Migrate the local MySQL database to a managed cloud database (e.g., PlanetScale, AWS RDS).

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

### Phase 8: Production Rollout Checklist
**Status:** In Progress
- [ ] **Forgot Password Recovery:** Complete the email-based token reset flow.
- [ ] **Dockerization:** Create Dockerfiles for Frontend, Backend, and AI Engine.
- [ ] **Database Connection Pool Load Testing:** Conduct final load checks to ensure pooled connections release cleanly during high-volume spikes.
- [ ] **Cloud Deployment:** Host Frontend, Backend, and Flask AI microservices.

---

## Recent Major Changes
* **E2E Linting & Bug Fixes:** Eliminated all 30+ ESLint errors (removed unused imports, safely handled state updates).
* **UI/UX Polishing:** Extracted all large inline modals into standalone components (`LiveTrackingModal`, `SecretaryEvaluationModal`). Fixed dynamic JSON rendering for document evaluation forms.
* **Multi-Channel Delivery:** Upgraded standard SMS text alerts into concurrent Email + SMS drop alerts via Nodemailer + UniSMS integrations.
* **Authentication Hardening:** Solidified user registration endpoints, updated SQL schemas to accept dynamic `email` and `phone_number` updates via the `SettingsModal`, and prevented email-login ambiguity in the UI.
* **Global Audit Dashboards:** Equipped the Admin Registrar with real-time `Activity Logs` and `Registered Users` search tools for system-wide user governance.
* **UI Realignment Completed:** Fully reconciled every dashboard route and user modal with the design mockup specifications from the `UI/` folder.
* **Manual Payments Integrated:** Replaced references to external payment gateways with a manual GCash receipt validation loop.
* **Unified Dashboard Page:** Rebuilt `DashboardPage.jsx` and `Layout.jsx` with responsive layouts and multi-tab sidebars corresponding to the active role.
