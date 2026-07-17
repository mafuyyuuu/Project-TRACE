# Project TRACE: System Workflows & Operational Pipeline

This document serves as the official operational manual for Project TRACE, detailing the lifecycle of every document and the exact role each administrative desk plays in the system.

---

## 1. Universal Document Pipeline
Regardless of the document type, the core routing logic in Project TRACE follows this strictly automated path:

1. **Submission (`pending_payment`)**: Student submits a request. The AI Engine instantly verifies any required attachments. If valid, the document enters the system.
2. **Payment (`pending_payment_verification`)**: Student uploads a GCash receipt.
3. **Finance Desk (`pending_secretary`)**: Finance verifies the payment. Once cleared, it routes to the College Secretary.
4. **Secretary Desk (`ready_window_1`)**: The College Secretary evaluates the request, cross-references records, and prints the document.
5. **Window 1 (`completed/released`)**: The printed document waits at Window 1. The student arrives, the clerk scans/releases it, and the request is closed.

---

## 2. Document-Specific Workflows & AI Verification

While the pipeline is universal, different documents have unique AI requirements at Step 1 (Submission):

### A. Transcript of Records (TOR) & Diploma
* **Requirements:** None (Optional attachments only).
* **Workflow:** Standard pipeline. System automatically calculates the price based on Semesters Attended (for TOR). 

### B. Honorable Dismissal
* **AI Requirement:** STRICT. Student *must* upload a "Validated Clearance".
* **AI Workflow:** The Python EasyOCR engine scans the uploaded clearance. If it detects missing signatures or invalid names, it flags the document before it even reaches the Secretary.

### C. Graduation Clearance
* **AI Requirement:** STRICT. Student *must* upload a "Signed Departmental Routing Form".
* **AI Workflow:** OCR verifies the presence of required departmental signatures (Library, Accounting, Dean). 

### D. Certificate of Good Moral Character
* **AI Requirement:** STRICT. Student *must* upload a Valid Student ID photo.
* **AI Workflow:** OCR reads the student ID to confirm identity matches the logged-in student's records.

---

## 3. Command Center Workflows (By Role)

### 🧑‍🎓 Student Dashboard
* **Role:** The initiator.
* **Workflow:**
  1. Submits dynamic forms (auto-calculates prices).
  2. Uploads GCash receipts.
  3. Uses the **Live Tracker Map** to monitor the document's journey across the university desks.
  4. Receives dual **SMS & Email notifications** when the document reaches Window 1 or if it gets rejected by the Secretary.

### 💰 Finance Clerk (`FINANCE001`)
* **Role:** Revenue guardian.
* **Workflow:** 
  1. Monitors the Active Verification Queue.
  2. Opens the Split-Screen Modal to compare the student's uploaded GCash receipt against the system's GCash Merchant logs.
  3. **Action:** Clicks "Verify" to instantly route the document to the College Secretary.

### 📜 College Secretary (`SEC001`)
* **Role:** Academic evaluator.
* **Workflow:**
  1. Receives documents *only* after Finance has cleared them.
  2. Evaluates the student's academic standing, checks semesters attended, and prepares the physical document.
  3. **Action:** Clicks "Evaluate & Approve" to route the document to Window 1 for releasing.

### 🏢 Window 1 Clerk (`WINDOW1001`)
* **Role:** Dispatcher.
* **Workflow:**
  1. Has physical possession of the printed, signed documents.
  2. When the student arrives at the window, the clerk clicks "Scan" to simulate hardware barcode scanning.
  3. **Action:** Clicks "Release" to finalize the transaction, moving the document to the permanent archives.

### 👑 Registrar Admin (`ADMIN001`)
* **Role:** Overseer and Optimizer.
* **Workflow:**
  1. Does not handle individual documents.
  2. Monitors the **AI Insights Panel** (Random Forest) for queue bottlenecks (e.g., "Warning: Secretary queue is backing up").
  3. Uses **Predictive Analytics** (Prophet ML) to forecast 7-day document volume, allowing the admin to schedule more clerks on predicted busy days.
  4. Manages the global **Registered Users** table, manually verifying/rejecting flagged accounts.
  5. Monitors the global **Activity Logs** (`step_logs` audit trail) to maintain total system accountability across all desks.
