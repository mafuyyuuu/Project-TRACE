# Backend & Database Guide

This document outlines the architecture, database structure, and integration processes for Project TRACE.

## 🏛️ Microservice Architecture

Project TRACE uses a decoupled architecture for maximum flexibility and performance:
1. **Node.js + Express (API Gateway):** Securely handles HTTP requests, manages file uploads via Multer, interacts with the database, and integrates with third-party APIs.
2. **Python Flask + EasyOCR (AI Engine):** A dedicated microservice using PyTorch-based Deep Learning to extract text (Student Numbers, Document Types) from uploaded images.
   - **Tech Stack:** Python, Flask, OpenCV, EasyOCR (PyTorch).
   - **Endpoints:**
     - `POST /ocr/extract`: Used for reading uploaded document requests (e.g., Clearance forms).
     - `POST /ocr/verify`: Used during registration to read the uploaded Student ID/Diploma. Returns `{ verified: boolean, reason: string }` if it finds the school name and matching student ID.
   - **Data Flow:** The Node.js server sends a multipart request to Flask with the image. Flask processes the image and returns JSON. Node.js then updates the database.
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

## 💳 Automated Payment Integration (PayMongo)

To eliminate manual payment verification, the system uses an automated payment gateway (e.g., PayMongo) supporting **GCash** and **QRPh**.

### Payment Flow
1. **Request Creation:** When a student requests a document, a `document` record is created with `payment_status = UNPAID` and `assigned_desk = NONE` (or kept hidden from Window 1).
2. **Checkout Session:** The Node.js backend calls the payment gateway API to generate a secure checkout URL (supporting GCash/QRPh) and returns it to the React frontend.
3. **Payment Completion:** The student pays via the URL.
4. **Webhook Verification:** The payment gateway fires an asynchronous webhook back to a dedicated Node.js endpoint (e.g., `/api/webhooks/payment`).
5. **Queue Activation:** Upon verifying the webhook signature, the backend updates `payment_status = PAID`. Only then does the document officially enter the **Window 1** queue for processing.

### Security Best Practices
- **Webhook Signatures:** Always verify the cryptographic signature sent by the payment provider to prevent spoofed webhook calls.
- **Idempotency:** Ensure the webhook handler checks if the document is already marked as `PAID` before processing to avoid duplicate logs.
