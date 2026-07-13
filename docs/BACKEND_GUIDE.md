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
