# Project TRACE Progress

This document tracks the current development and implementation progress of the Project TRACE system.

## Overall Status: 🟡 In Development

### 📍 Next Steps for Next Session
When we resume development, start here:
1. **Admin Verification Dashboard:** We need a UI for Admins to view `pending` student accounts (where AI auto-verification failed) so they can view the uploaded ID image and manually click "Verify" or "Reject".
2. **Clerk Queue Dashboard (Phase 2):** Build the React table for Window 1 Clerks to see the live queue of documents that have successfully been paid for.
3. **n8n Webhook Routing:** Set up the n8n orchestrator to automatically route documents from `WINDOW_1` to `SECRETARY_EVALUATION` when the clerk clicks "Process".

---

### Phase 1: The Foundation & Tech Stack Handshake
**Status:** Complete
- [x] Setup React (Vite) and Tailwind CSS for Frontend
- [x] Setup Node.js + Express backend with MySQL schemas
- [x] Implement Python Flask + EasyOCR baseline microservice
- [x] Establish initial database connection and seed data

### Phase 1.5: Automated Payments & Account Verification Integration
**Status:** Complete
- [x] Integrate automated payment gateway (e.g., PayMongo/Xendit) for QRPh and GCash.
- [x] Update frontend UI to enforce payment upon document request.
- [x] Setup Node.js webhook listeners to verify payment success.
- [x] Ensure documents only enter the `WINDOW_1` queue if `payment_status` is `PAID`.
- [x] Add Student Account Verification flow (`verification_status` ENUM, signup page, and login restrictions).
- [x] Implement File Upload for Account Proof (Student ID / Diploma).
- [x] Integrate AI Auto-Verification using Python EasyOCR engine.
- [x] Differentiate frontend UI (Students only see Upload, Clerks see Queue).

### Phase 2: Intelligent Intake & Auto-Routing
**Status:** Planned
- [ ] Build Clerk Queue Dashboard table in React
- [ ] Refine EasyOCR regex logic for Student Number and Form Type
- [ ] Build n8n webhook logic for basic Window 1 ➔ Secretary routing

### Phase 3: Dynamic Hand-off & The Core Loop
**Status:** Planned
- [ ] Implement Approve/Reject action buttons on Clerk Dashboard
- [ ] Wire buttons to n8n to advance MySQL database state
- [ ] End-to-end testing of core loop: Intake -> Payment -> Window 1 -> Secretary -> Window 1 Release

## Recent Major Changes
* **Documentation Rewrite:** Rewrote `APP_GUIDE.md`, `BACKEND_GUIDE.md`, and `CODING_PREFERENCES.md` to accurately reflect the TRACE tech stack (Node.js, MySQL, React, Python OCR, n8n), replacing the mismatched external (Firebase) docs.
* **Payment Integration Added:** Decided to insert an automated payment gateway (GCash / QRPh) process immediately after a student submits a request. The system will gate the document from reaching Window 1 until the payment is successfully verified via webhook.
