# Project TRACE – Application Guide

**Project TRACE (Tracking, Routing, and Automated Credential Engine)** is an end-to-end digital system designed for the Pamantasan ng Lungsod ng Pasig (PLP) Registrar's Office. It tracks and auto-routes document flows to eliminate manual encoding errors and speed up processing.

---

## 👥 User Roles & Portals

The application supports three main categories of users:

### 1. Student Account Verification (New)
Before a student can request documents, they must create an account.
- Students sign up with their Student ID, Name, Password, and **must select if they are a Current Student or Alumni**.
- **Proof of Identity:** They must upload a valid Student ID or Diploma during registration.
- **AI Auto-Verification:** The Python AI Engine (EasyOCR) scans the uploaded ID. If it finds the school name and matching Student ID, it automatically verifies the account.
- If the AI fails to read the ID, the account is placed in a **pending verification** state for manual Administrator review.

### 2. Document Submission (Student Portal)
- Verified students log in and are presented with the **Upload Interface**.
- They select the document type (e.g., TOR, Diploma) and upload a file.
- The system automatically generates a unique `tracking_number`.
- **Payment Submission:** The student is immediately prompted to pay via GCash. They must submit the GCash Reference Number and a screenshot of the receipt. The document enters a `pending_payment_verification` state.
- **Notifications:** Students receive dual **SMS** (via UniSMS) and **Email** (via Nodemailer) alerts whenever their document progresses or is rejected.

### 3. Finance Clerk
The finance dashboard.
- **Payment Verification:** Reviews manually uploaded GCash payment receipts and reference numbers.
- **Approval:** Approves valid payments to move documents into the processing pipeline (`pending_secretary`).

### 4. Window 1 Clerk (Intake & Release)
The front desk dashboard.
- **Intake:** Uploads physical documents. The system uses AI (EasyOCR) to automatically extract the Student Number and Document Type.
- **Release:** After the workflow is complete, Window 1 handles the final release of the document to the student.

### 5. College Secretary (Approver)
The approver dashboard.
- **Evaluation:** Receives documents dynamically routed to their desk queue.
- **One-Click Actions:** Verifies the AI-extracted data alongside the uploaded document image and clicks "Approve" or "Reject".
- **Zero Hand-offs:** Once approved, the document is automatically routed back to Window 1.

### 6. Registrar Admin
The central monitoring and operations hub.
- **AI Insights & Forecasting:** Views 7-day predictive volume forecasts and real-time AI alerts for queue bottlenecks.
- **Registered Users:** Manages a global database table of all system accounts. Verifies or rejects student accounts that failed automatic AI verification.
- **Activity Logs:** Monitors a global audit trail of every single interaction across the system to maintain strict accountability.

---

## 🔄 Core Workflow Overview

1. **Initiation:** Student requests a document.
2. **Payment & Verification:** Student pays via GCash and uploads the receipt. The Finance Clerk verifies the payment.
3. **AI Intake:** Window 1 uploads any physical paperwork. EasyOCR extracts data automatically.
4. **Automated Routing:** n8n intercepts the submission and dynamically assigns the document to the College Secretary.
5. **Approval:** The Secretary approves the document via their digital split-screen dashboard.
6. **Return & Release:** n8n routes the document back to Window 1 and sends the student an SMS that their document is ready for pickup.
