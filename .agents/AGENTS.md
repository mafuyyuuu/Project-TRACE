# Project TRACE Workspace Instructions & Memory

This file serves as the workspace-scoped memory and developer rulebook for any AI agents working on Project TRACE. Read this to immediately sync with the current system state, database schema, credentials, and recent architectural changes.

---

## 💾 System State & Feature Memory

### 1. Technology Stack
* **Frontend:** React (Vite), Tailwind CSS, React Router DOM v7 (compiled using `npm run build` cleanly).
* **Backend:** Node.js (Express), MySQL (v8) with active connection pooling.
* **AI & Machine Learning:** Flask microservice wrapping PyTorch (EasyOCR model) for document processing, Prophet for 7-day volume forecasting, and Scikit-Learn (Random Forest heuristics) for prescriptive administrative recommendations.
* **Orchestrator:** n8n workflow (`n8n/routing-workflow.json`).

### 2. User Roles & Command Center
Project TRACE uses a single unified dashboard route (`/dashboard` mapped to [DashboardPage.jsx](file:///Users/jhervin/project-trace/frontend/src/pages/DashboardPage.jsx)) that dynamically renders one of five command centers depending on the logged-in user's role and desk assignment:
1. **Student:** Live tracking KPIs (requests submitted, active, ready), request history grid with status timeline bars, a manual GCash payment trigger, and a document upload form.
2. **Finance Clerk:** Payment Verification queue table and a receipt verification review modal to approve/reject manual payments.
3. **Window 1 Clerk:** Upload dropzone for physical document scanning (AI Intake) and a Release Desk dispatch table.
4. **College Secretary:** Evaluation Queue table, opening a document reveals the Split-Screen OCR Evaluation Modal (scanned form preview on the left, editable input fields on the right, and a "Approve & Route" action).
5. **Registrar Admin:** Predictive charts (7-day volume forecasts), AI Insights alert dashboard, and the Student Account Manual Verification queue table.

### 3. Database Schema Modifications
Run [migration.js](file:///Users/jhervin/project-trace/backend/database/migration.js) to configure the MySQL database with the following active columns on the `documents` table:
* `receipt_image_path` (VARCHAR(500)) for storing uploaded receipt files.
* `gcash_reference_no` (VARCHAR(255)) for storing manual GCash reference numbers.
* `payment_status` (ENUM('UNPAID', 'PAID')) defaulting to `'UNPAID'`.
* `current_status` (VARCHAR(50)) defaulting to `'pending_payment'`.

---

## 🔐 Credentials Checklist (Password: `trace2024`)

* **Registrar Admin:** ID `ADMIN001` (Desk: `Admin Office`)
* **Finance Clerk:** ID `FINANCE001` (Desk: `Finance`)
* **Window 1 Clerk:** ID `WINDOW1001` (Desk: `Window 1`)
* **College Secretary:** ID `SEC001` (Desk: `Secretary`)
* **Student:** ID `STU2024001` (Student)

---

## 📍 Integration Next Steps
If continuing system development:
1. Ensure the Flask API is running on `http://localhost:5000` to handle live image uploads from the Window 1 Clerk scanner dropzone.
2. Run `ai-engine/mock_data_gen.py` to seed historical log timestamps into the database and retrain the forecasting models.
3. Hook up Twilio/SMS API key parameters in `backend/routes/documents.js` to dispatch SMS text alerts to students upon status changes.
