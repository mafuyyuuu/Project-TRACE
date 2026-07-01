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
- **Payment Gateway:** The student is immediately prompted to pay via GCash or QRPh. The document enters a `pending_payment` state and is hidden from the clerks until paid.

### 3. Window 1 Clerk (Intake & Release)
The front desk dashboard.
- **Intake:** Uploads physical documents. The system uses AI (EasyOCR) to automatically extract the Student Number and Document Type, avoiding manual data entry.
- **Release:** After the workflow is complete, Window 1 handles the final release of the document to the student.

### 3. College Secretary (Approver)
The approver dashboard.
- **Evaluation:** Receives documents dynamically routed to their desk queue.
- **One-Click Actions:** Verifies the AI-extracted data alongside the uploaded document image and clicks "Approve" or "Reject".
- **Zero Hand-offs:** Once approved, the document is automatically routed back to Window 1 by the n8n automation engine.

---

## 🔄 Core Workflow Overview

1. **Initiation & Payment:** Student requests a document and pays online via GCash/QRPh.
2. **AI Intake:** Window 1 uploads any physical paperwork. EasyOCR extracts data automatically.
3. **Automated Routing:** n8n intercepts the submission and dynamically assigns the document to the College Secretary.
4. **Approval:** The Secretary approves the document via their digital dashboard.
5. **Return & Release:** n8n routes the document back to Window 1 and sends the student an SMS that their document is ready for pickup.
