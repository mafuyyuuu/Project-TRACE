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
* `amount` (DECIMAL(10,2)) and `copies` (INT) defaulting to 150.00 and 1.
* `ocr_confidence_score` (DECIMAL(5,2)) for AI extraction accuracy metrics.
* `purpose` (VARCHAR(255))
* `payment_status` (ENUM('UNPAID', 'PAID')) defaulting to `'UNPAID'`.
* `current_status` (VARCHAR(50)) defaulting to `'pending_payment'`.

Additionally, the `users` table now contains a `course` (VARCHAR(100)) column for students.

---

## 🚀 Recent Progress (Phase 2 Completed)
* Successfully executed full frontend-to-backend data wiring for the `/dashboard`.
* Replaced all 61+ hardcoded dummy data points across the 5 command centers with dynamic state variables bound to API endpoints.
* Implemented new backend API routes: `/stats`, `/stats/forecast`, `/stats/insights`, and `/auth/student/:studentId`.
* Fully integrated dynamic visual elements (KPI cards, wait times, image previews, AI forecast, and insight alerts).

---

## 🔐 Credentials Checklist (Password: `trace2024`)

* **Registrar Admin:** ID `ADMIN001` (Desk: `Admin Office`)
* **Finance Clerk:** ID `FINANCE001` (Desk: `Finance`)
* **Window 1 Clerk:** ID `WINDOW1001` (Desk: `Window 1`)
* **College Secretary:** ID `SEC001` (Desk: `Secretary`)
* **Student:** ID `STU2024001` (Student)

---

## 📍 Integration Next Steps (Phase 3 & 4)
If continuing system development:
1. **Machine Learning Prep**: Run `ai-engine/mock_data_gen.py` to seed historical log timestamps into the database to immediately train the Prophet forecasting models and Random Forest insights engine.
2. **Finance QR Code**: Replace the Mock GCash QR SVG in `DashboardPage.jsx` with the actual Finance Department's merchant QR code image, or integrate PayMongo/Xendit.
3. **Window 1 Scanner Bridge**: Implement WebTWAIN (or a similar web-scanning library) to allow the "Scan" button in `DashboardPage.jsx` to trigger physical hardware scanners.
4. **SMS Notifications**: Hook up Twilio/SMS API key parameters in `backend/routes/documents.js` to dispatch SMS text alerts to students upon status changes.
5. **Deployment Prep**: Prepare for staging deployment by compiling the Vite frontend (`npm run build`), containerizing the Flask API, and migrating to a managed MySQL instance.
