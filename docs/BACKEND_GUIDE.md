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
| `utils/pricing.js` | `calculateAmount`, `generateTrackingNumber` | Pure — no DB or service imports, so it is directly testable |

**Key conventions:**
- **Transactions:** every multi-write desk action (payment verification, evaluation, release, cancellation) runs inside `beginTransaction`/`commit`/`rollback` with a `FOR UPDATE` row lock. Model functions accept an optional `executor` argument so their queries can join the transaction.
- **Fail-soft integrations:** `notification.service.js`, `aiEngine.service.js`, and `n8n.service.js` log and swallow their errors. A failed SMS, an offline Flask engine, or a stopped n8n container must never roll back a committed document action.
- **Route ordering:** in `documents.routes.js`, the literal paths `/stats`, `/stats/forecast`, `/stats/insights`, and `/activity-logs` must stay **above** the `/:trackingNumber` wildcard or they'll be swallowed by it.
- **Machine-to-machine auth:** `POST /api/documents/assign` (n8n) and `/api/payments/*` have no user session, so they require the shared `WEBHOOK_SECRET` in an `x-webhook-secret` header (`middlewares/webhookAuth.middleware.js`, constant-time compared). The n8n HTTP Request node must be configured to send it.
- **Only truly public endpoint:** `GET /api/documents/:trackingNumber` (student tracking by tracking number).
- **Uploaded files are not public.** They are served by `GET /api/files/:filename`, which authenticates the caller and checks ownership — staff may read any file, a student only files attached to their own request plus their own ID proof. Filenames are reduced to a basename and the resolved path is confirmed to sit inside `uploads/`, so traversal attempts fail.
- **Rate limiting:** login is capped at 10 failed attempts per IP per 15 min (successful logins don't count), registration at 20/hour, and the rest of `/api` at 1000/15 min (`middlewares/rateLimit.middleware.js`).

### Multi-document requests
A student can request several document types at once and pay a single combined fee.

- Every item becomes its own `documents` row sharing one `request_group_id`.
- **Payment is per group:** `submitPayment` and `verifyPayment` act on every document in the group, so one GCash receipt settles the whole request.
- **Routing is per document:** `evaluateDocument` and `releaseDocument` stay per row, so a Diploma can be ready for pickup while a Transcript is still with the Secretary.
- The upload route uses multer `.any()`; per-item attachments arrive as `document_0`, `document_1`, … and the legacy single `document` field still works.
- Historical rows were backfilled with their own tracking number as the group id, so every pre-existing document is simply a group of one.

### Reference data & pricing
`document_types` and `colleges` replace what used to be hardcoded `<option>` lists.
`document_types.base_fee` is admin-editable; `fee_rule` selects the calculation in `utils/pricing.js` (`flat`, or `per_semester_block` for Transcript of Records, whose per-4-semester rule isn't a single number). Fees are **always** recomputed server-side — a client-supplied `amount` is ignored.

### Graduate Application module
The Registrar hasn't finalised the questions, so nothing about the form is hardcoded:
- `grad_form_fields` holds the field definitions (label, type, required, options, order).
- `grad_application_values` stores one row per answer, so adding a field never needs a migration.
- Validation in `gradApplication.service.js` is **generated from the definitions** — making a field required or restricting a select changes what the API accepts, with no code change.

| Endpoint | Purpose |
| :--- | :--- |
| `GET /api/reference/colleges` | College list (public — signup has no token yet) |
| `GET /api/reference/document-types` | Requestable types with fees and attachment rules |
| `GET /api/grad-applications/form-fields` | The admin-defined form definition |
| `POST /api/grad-applications` | Submit an application |
| `GET /api/grad-applications/mine` | A student's own submissions |
| `GET /api/grad-applications` | Staff review queue |
| `POST /api/grad-applications/:id/review` | Staff decision |

### Authorization rules
A valid JWT proves *who* is calling, never *what they may touch*. Every endpoint taking a resource id verifies ownership or role:
- A student may only submit payment for, cancel, or read files attached to **their own** requests — including every document in a shared request group.
- A student may only read or submit **their own** graduate application; staff review anyone's.
- `uploadDocument` ignores any client-supplied `student_id` for students and files against their own record — otherwise a request could be attributed to another student, or left unowned.
- Fees are always computed server-side in `utils/pricing.js`; a client-sent `amount` is ignored.

### Running the tests
```bash
cd backend && npm test        # vitest run — no database required
node audit.js                 # live end-to-end audit against a running server
```
Backend tests are `.cjs` on purpose — see `docs/CODING_PREFERENCES.md` for why.

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
