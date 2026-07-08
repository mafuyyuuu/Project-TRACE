# Project TRACE Progress

This document tracks the current development and implementation progress of the Project TRACE system.

## Overall Status: 🟢 82% Completed (Frontend, Backend, and UI Mockup Alignment fully complete; Phase 5 Integrations Pending)

### 📍 Next Steps for Production Rollout
Although core frontend dashboards, backend controllers, and state loops are fully developed and compiled successfully, the following items remain for a live deployment:
1. **EasyOCR Microservice Connection:** Connect the Express upload controller to the live Python Flask OCR microservice (`ai-engine/app.py`) for actual computer-vision text extraction from uploaded images.
2. **Prophet & Random Forest ML Training:** Run the historical data generator (`ai-engine/mock_data_gen.py`) to populate the `step_logs` MySQL database, allowing the Python service to train the real Prophet forecasting model and Random Forest heuristic recommender.
3. **n8n Workflow Execution:** Configure the n8n runner locally or on a cloud instance and load `n8n/routing-workflow.json` to handle asynchronous clerk assignments.
4. **Real SMS Gateway Integration:** Replace mock text console outputs in `documents.js` with active Twilio/SMS API triggers to notify students upon document status updates (e.g. ready for pickup).

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

### Phase 5: Production Integration & Rollout Checklist
**Status:** Pending (Next Development Cycle)
- [ ] **AI EasyOCR Microservice Live Connection:** Link the Express backend file-upload endpoint to the active Flask OCR engine to enable real-time transcription from uploads instead of fallback mock data.
- [ ] **Seeding Historical Data:** Execute `ai-engine/mock_data_gen.py` to seed log records in the MySQL database to populate the Prophet forecasting model.
- [ ] **n8n Workflow Integration:** Import and execute [routing-workflow.json](file:///Users/jhervin/project-trace/n8n/routing-workflow.json) on the n8n orchestrator to handle automated document routing across clerks and secretaries.
- [ ] **SMS Gateway Activation:** Replace placeholder console log events in backend controllers with active Twilio API credentials to notify students on status updates.
- [ ] **Database Connection Pool Load Testing:** Conduct final load checks to ensure pooled connections release cleanly during high-volume spikes.

---

## Recent Major Changes
* **UI Realignment Completed:** Fully reconciled every dashboard route and user modal with the design mockup specifications from the `UI/` folder.
* **Manual Payments Integrated:** Replaced references to external payment gateways with a manual GCash receipt validation loop.
* **Unified Dashboard Page:** Rebuilt `DashboardPage.jsx` and `Layout.jsx` with responsive layouts and multi-tab sidebars corresponding to the active role.
* **Refreshed Documentation:** Updated `docs/project_trace_dev_spec.html`, `docs/project_trace_ops_guide.html`, and `docs/BACKEND_GUIDE.md` to reflect all current system flows.
