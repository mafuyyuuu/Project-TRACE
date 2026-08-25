# Project TRACE: System Workflows & Operational Pipeline

The official operational manual for Project TRACE: how someone gets an account, the lifecycle of
every document, and the exact role each administrative desk plays. (The former `APP_GUIDE.md`
described the same roles and the same pipeline a second time; it was merged into this file.)

**Project TRACE** — Tracking, Routing, and Automated Credential Engine — is an end-to-end digital
system for the Pamantasan ng Lungsod ng Pasig (PLP) Registrar's Office. It tracks and auto-routes
document flows to eliminate manual encoding errors and speed up processing.

---

## 0. Getting an Account

Everything in section 1 onward assumes the person is already signed in. This is how they get there.

### 0a. Student Registration & AI Identity Verification
- Students sign up with their Student ID, name and password, and **must declare whether they are a
  current student or an alumnus**.
- **Proof of identity:** they upload a valid Student ID or Diploma during registration.
- **AI auto-verification:** the Flask AI engine runs a **3-point check** on the upload — school name,
  student ID and course must all appear in the OCR text. All three matching verifies the account
  automatically.
- If the check fails, the account is held in **pending verification** for manual Registrar Admin
  review rather than being rejected. A failed OCR read is a bad photo far more often than a bad
  account.

### 0b. Password Recovery
Anyone who cannot sign in — student or staff — uses **Forgot Password?** on the login page.
- Accepts a Student ID, a Staff ID, or the email address on the account.
- The confirmation is **deliberately identical whether or not the account exists**, so the form
  cannot be used to discover which IDs are registered.
- The link works **once** and expires after an hour. Requesting a new one retires the old link, and
  completing a reset retires every other outstanding link for that account.

### 0c. Staff Accounts
Staff are created by the Registrar Admin with a temporary password and a `must_change_password` flag
that clears when they set their own. That is a separate route from 0b, which is for people locked out
of an account they already own.

---

## 1. Universal Document Pipeline
Regardless of the document type, the core routing logic in Project TRACE follows this strictly automated path:

1. **Submission (`pending_payment`)**: Student submits a request. The AI Engine instantly verifies any required attachments. If valid, the document enters the system.
2. **Payment (`pending_payment_verification`)**: Student uploads a GCash receipt.
3. **Finance Desk (`pending_secretary`)**: Finance verifies the payment. Once cleared, it routes to the College Secretary.
4. **Secretary Desk (`ready_window_1`)**: The College Secretary evaluates the request, cross-references records, and prints the document.
5. **Window 1 (`completed/released`)**: The printed document waits at Window 1. The student arrives, the clerk scans/releases it, and the request is closed.

---

## 1b. Multi-Document Requests (One Payment, Independent Routing)

A student may tick several document types in a single request — for example a Transcript of Records **and** a Diploma — and pay **once** for the combined total instead of filing separate requests.

1. **Selection**: each ticked type expands to its own fields (copies, semesters, attachment), because fees and requirements differ per document. A running total shows what will be charged.
2. **One request**: all selected documents are created together under a shared **request group**, each with its own tracking number.
3. **One payment**: the student uploads a single GCash receipt. It settles **every** document in the group, and Finance clears them all in one action.
4. **Independent routing**: from the Secretary desk onward each document moves on its own. A Diploma can be ready for pickup at Window 1 while the Transcript is still being evaluated — a slow document never holds up a fast one.

> Requesting a single document is simply a group of one, so the pipeline in section 1 is unchanged.

---

## 1c. Graduate Application

Graduates and alumni complete an application form defined by the Registrar. The questions are **configured, not coded**: an admin adds, reorders or removes fields, and both the form and its validation follow automatically. Submissions land in a staff review queue and move through `submitted → under_review → approved / rejected`.

---

## 1d. Payment Methods

A student chooses how to pay at checkout. Every method follows the same verification path — pay, submit proof, Finance confirms — but each asks for the reference its own channel produces:

| Method | What the student submits |
| :--- | :--- |
| **GCash** | Scan the PLP Finance QR, pay in-app, upload the receipt screenshot + GCash reference number |
| **Credit / Debit Card** | Pay at the Cashier terminal, upload the terminal receipt + approval code |
| **Online Banking / Bank Transfer** | Transfer to the PLP Finance account, upload the confirmation + transaction reference |
| **Over-the-Counter (Cashier)** | Pay cash at the Cashier window, upload the official receipt + its number |

> Payments are **never** settled by a third-party gateway. Every method reconciles against the Finance Office's own records, which is what PLP accounting requires. Methods are managed by the admin, so the Registrar can enable or retire one without a code change.

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

### 📜 College Secretary (`SEC-CCS001`, `SEC-CON001`, … one per college)
* **Role:** Academic evaluator.
* **Workflow:**
  1. Receives documents *only* after Finance has cleared them — and **only for their own college**.
     n8n routes each document to the secretary matching the student's course, so a CCS document
     appears in the CCS secretary's queue and in no other. A document filed while n8n is stopped is
     simply left unassigned and falls back to the college filter, so the pipeline never stalls on the
     orchestrator being down.
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
  4. Manages the global **Registered Users** table, manually verifying or rejecting the accounts
     that failed automatic AI verification at registration (section 0a), and administering staff
     accounts, document types and colleges.
  5. Monitors the global **Activity Logs** (`step_logs` audit trail) to maintain total system accountability across all desks.

---

**See also:** `docs/ENV_SETUP_GUIDE.md` for configuration · `docs/BACKEND_GUIDE.md` for the endpoints
behind each step · `docs/ALGORITHM_COMPUTATION.md` for how the OCR, forecast and classifier actually
compute.
