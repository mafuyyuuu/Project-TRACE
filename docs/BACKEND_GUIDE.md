# Backend & Database Guide

This document outlines the architecture, database structure, and integration processes for Project TRACE.

## 🏛️ Microservice Architecture

Project TRACE uses a decoupled architecture for maximum flexibility and performance:
1. **Node.js + Express (API Gateway):** Securely handles HTTP requests, manages file uploads via Multer, interacts with the database, and integrates with third-party APIs.
2. **Python Flask + EasyOCR (AI Engine):** A dedicated microservice using PyTorch-based Deep Learning to extract text (Student Numbers, Document Types) from uploaded images.
   - **Tech Stack:** Python, Flask, OpenCV, EasyOCR (PyTorch), Prophet, Random Forest.
   - **Endpoints:**
     - `POST /ocr/extract`: Used for reading uploaded document requests (e.g., Clearance forms).
     - `POST /ocr/verify`: Used during registration to read the uploaded Student ID/Diploma. Returns `{ verified: boolean, reason: string }` if it finds the school name and matching student ID.
     - `GET /forecast`: Uses Facebook Prophet ML to return a 7-day volume forecast based on historical logs.
     - `GET /ai/recommend`: Uses a Random Forest heuristic to generate prescriptive system insights based on current queue metrics.
   - **Data Flow:** The Node.js server acts as an API gateway, proxying AI requests to Flask and returning combined JSON to the frontend.
3. **n8n (Routing Engine):** Handles the conditional logic and workflow automation (e.g., routing documents from Window 1 to the Secretary and back) using webhooks.
4. **MySQL (Database):** The relational, single-source-of-truth database.

---

## 📁 Backend Code Organization (`backend/src/`)

The Express app follows a strict **route → controller → service → model** flow. Entry point is `src/server.js` (starts the listener), wrapping `src/app.js` (builds the app). Full conventions live in `CODING_PREFERENCES.md`.

| Layer | Responsibility | Rule |
| :--- | :--- | :--- |
| `routes/*.routes.js` | Maps URLs to controllers, attaches middleware | No logic |
| `controllers/*.controller.js` | Unpacks `req`, calls a service, maps errors to status codes | No SQL, no business rules |
| `services/*.service.js` | All business logic and transactions | Never touches `req`/`res` |
| `models/*.model.js` | Raw parameterized SQL, one function per query | No business rules |
| `middlewares/` | `auth` (JWT), `upload` (multer), `errorHandler` | — |
| `config/` | `db.js` (MySQL pool), `env.js` (all env vars + defaults) | Never read `process.env` elsewhere |
| `utils/AppError.js` | `badRequest` / `unauthorized` / `forbidden` / `notFound` helpers | Lets services signal HTTP status without importing `res` |

**Key conventions:**
- **Transactions:** every multi-write desk action (payment verification, evaluation, release, cancellation) runs inside `beginTransaction`/`commit`/`rollback` with a `FOR UPDATE` row lock. Model functions accept an optional `executor` argument so their queries can join the transaction.
- **Fail-soft integrations:** `notification.service.js`, `aiEngine.service.js`, and `n8n.service.js` log and swallow their errors. A failed SMS, an offline Flask engine, or a stopped n8n container must never roll back a committed document action.
- **Route ordering:** in `documents.routes.js`, the literal paths `/stats`, `/stats/forecast`, `/stats/insights`, and `/activity-logs` must stay **above** the `/:trackingNumber` wildcard or they'll be swallowed by it.
- **Unauthenticated by design:** `GET /api/documents/:trackingNumber` (public student tracking) and `POST /api/documents/assign` (called by n8n) intentionally have no `authenticate` middleware.

### Environment Variables
Copy `backend/.env.example` → `backend/.env` and fill it in. Covers `DB_*`, `PORT`, `JWT_SECRET`, `AI_ENGINE_URL`, `N8N_URL`, `UNISMS_*`, `TEST_PHONE_NUMBER`, and `SMTP_*`. Never hardcode a secret as a `||` fallback default in source.

`JWT_SECRET` is **required** — `src/config/env.js` throws on startup if it is unset, and warns loudly if it still equals the old placeholder that is public in git history. Generate a strong one with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

---

## 🗄️ Database Management (MySQL)

### Core Tables

#### `users`
- **Users (`users`):** Stores student, clerk, and admin records.
  - `employee_id` / `student_id`: Primary login identifier.
  - `role`: 'student', 'clerk', 'admin'.
  - `user_type`: 'student' or 'alumni'.
  - `id_proof_path`: File path to the uploaded Student ID or Diploma.
  - `verification_status`: 'pending', 'verified', 'rejected'. New students are 'pending' until verified by an admin.
- **Documents (`documents`):** The core entity. for document tracking.
- `id` (PK)
- `tracking_number` (Unique Hash)
- `student_id` (FK)
- `document_type`
- `current_status` (e.g., PENDING_PAYMENT, PROCESSING, APPROVED, READY)
- `assigned_desk` (e.g., WINDOW_1, SECRETARY)
- `payment_status` (e.g., UNPAID, PAID) - *Updated for Payment Phase*

#### `step_logs`
An audit trail table recording every movement.
- `id` (PK)
- `document_id` (FK)
- `desk_name`
- `action_taken` (e.g., UPLOADED, PAID, APPROVED, REJECTED)
- `timestamp`

---

## 💳 Manual GCash Payment Verification Flow

To comply with PLP Finance policies, Project TRACE implements a manual payment verification pipeline where student GCash receipt screenshots are reviewed by a Finance Clerk.

### Payment Flow
1. **Request Creation:** The student initiates a document request, creating a document record in the MySQL database with `current_status = 'pending_payment'` and `payment_status = 'UNPAID'`.
2. **GCash QR Scanning:** The student is shown the official PLP Finance static GCash QR code. They scan the code, pay via their GCash app, and take a screenshot of the receipt.
3. **Proof Submission:** The student uploads the receipt image and enters the transaction's Reference Number into the portal. The backend updates `gcash_reference_no`, `receipt_image_path`, and changes `current_status = 'pending_payment_verification'`.
4. **Finance Verification:** The Finance Clerk reviews the receipt and Reference Number on their dashboard.
   - If approved: updates `payment_status = 'PAID'` and advances status to `'pending_secretary'`.
   - If rejected: resets status to `'pending_payment'` with comments so the student can re-upload.

### Backend Endpoints
- `POST /api/documents/:id/submit-payment`: Student uploads GCash receipt image and submits transaction Reference Number.
- `POST /api/documents/:id/verify-payment`: Finance Clerk approves or rejects the uploaded payment receipt.
- `GET /api/documents?status=pending_payment_verification`: Lists all document requests waiting for manual payment review.

### Dashboard & Analytics Endpoints (New)
- `GET /api/documents/stats`: Returns KPI metrics (backlogs, processed today, avg time).
- `GET /api/documents/stats/forecast`: Proxies to Flask AI engine to retrieve the 7-day volume forecast using Prophet.
- `GET /api/documents/stats/insights`: Proxies to Flask AI engine to retrieve Random Forest heuristics and alert recommendations.
