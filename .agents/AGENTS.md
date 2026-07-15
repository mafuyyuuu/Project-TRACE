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
Run [migration.js](file:///Users/jhervin/project-trace/backend/database/migration.js) to configure the MySQL database with the following active columns:
* `documents` table:
  - `receipt_image_path` (VARCHAR(500)) for storing uploaded receipt files.
  - `gcash_reference_no` (VARCHAR(255)) for storing manual GCash reference numbers.
  - `amount` (DECIMAL(10,2)) and `copies` (INT) defaulting to 150.00 and 1.
  - `ocr_confidence_score` (DECIMAL(5,2)) for AI extraction accuracy metrics.
  - `purpose` (VARCHAR(255)) storing dynamic form JSON (reason, year graduated).
  - `payment_status` (ENUM('UNPAID', 'PAID')) defaulting to `'UNPAID'`.
  - `current_status` (VARCHAR(50)) defaulting to `'pending_payment'`.
* `users` table: Added `course` (VARCHAR(100)), `phone_number` (VARCHAR(20)) for UniSMS routing, and `email` for Nodemailer.
* `notifications` table: New table linking to `user_id` for the in-app Bell icon alerts.

---

## 🚀 Recent Progress (Phase 3 Completed)
* **Frontend-to-Backend Wiring:** Fully wired `/dashboard` replacing 61+ hardcoded dummy data points with dynamic state variables bound to API endpoints.
* **In-App Notifications & Settings:** Implemented the Bell Icon dropdown (with unread badge) and the Settings Modal to update `phone_number`. Wired endpoints: `PUT /profile`, `GET /notifications`, `PUT /notifications/read`.
* **SMS Integration:** Fully implemented UniSMS API directly in `documents.js`. Sends real SMS alerts on document evaluation and payment verification statuses.
* **Instant Checkout & Dynamic Forms (Capstone Feature):** Overhauled the student "New Request" modal. 
  - Form now auto-fills Name and ID visually.
  - Dynamically renders fields based on `document_type` (e.g., asks for "Semesters attended" for TOR).
  - Auto-calculates prices (e.g., `Math.ceil(semesters / 4) * 100`).
  - Request routes instantly to `pending_payment` (bypassing Secretary evaluation for fast checkout).
* **AI Requirement Verification:** The Python EasyOCR engine dynamically cross-references uploaded physical files (like a Validated Clearance) against the requested document type and logs an `ai_verified` or `ai_flagged` state into the `step_logs`. The upload dropzone is dynamically `required` only for specific documents (e.g., Honorable Dismissal).

---

* **Multi-Channel Notifications (Phase 4):** Fully integrated Nodemailer alongside UniSMS to dispatch concurrent SMS and Email alerts based on real DB student profiles when documents are evaluated.
* **Admin Global Audit & Users:** Created a massive `Registered Users` table mapping all accounts and an `Activity Logs` table rendering global `step_logs` in the Admin Dashboard.
* **Re-Registration & Verification Logic:** Rejected students can freely re-register (auto-deleting old rejected records). Staff accounts correctly bypass pending states in the DB.
* **UI/UX Revisions:** The login page placeholder now explicitly enforces `STUDENT ID / STAFF ID` to prevent user email errors. Settings modal expanded to support Email Address edits. Signup Page expanded to include Phone Number and Confirm Password validation.

---

## 🔐 Credentials Checklist (Password: `trace2024`)

* **Registrar Admin:** ID `ADMIN001` (Desk: `Admin Office`)
* **Finance Clerk:** ID `FINANCE001` (Desk: `Finance`)
* **Window 1 Clerk:** ID `WINDOW1001` (Desk: `Window 1`)
* **College Secretary:** ID `SEC001` (Desk: `Secretary`)
* **Student:** ID `STU2024001` (Student)

---

## 📍 Integration Next Steps (Phase 5)
If continuing system development:
1. **Machine Learning Prep**: Run `ai-engine/mock_data_gen.py` to seed historical log timestamps into the database to immediately train the Prophet forecasting models and Random Forest insights engine.
2. **Forgot Password Flow**: Implement the full JWT reset token email flow in `auth.js` and build the `/reset-password` frontend route.
3. **Finance QR Code**: Replace the Mock GCash QR SVG in `DashboardPage.jsx` with the actual Finance Department's merchant QR code image, or integrate PayMongo/Xendit.
4. **Window 1 Scanner Bridge**: Implement WebTWAIN (or a similar web-scanning library) to allow the "Scan" button in `DashboardPage.jsx` to trigger physical hardware scanners.
5. **Deployment Prep**: Prepare for staging deployment by compiling the Vite frontend (`npm run build`), containerizing the Flask API, and migrating to a managed MySQL instance.
