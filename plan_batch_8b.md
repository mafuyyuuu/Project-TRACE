# Batch 8b Analysis & Execution Plan

Below is the breakdown of the requests in Batch 8b, categorized by whether they are purely presentation-layer or require backend schema/API updates.

### 🟡 Requires Backend Changes (Awaiting Confirmation)
As per the standing instructions, I am stopping to flag these items. They require backend modifications (database schema changes, AI engine integration, or new REST endpoints) and cannot be implemented purely on the frontend. Please confirm how you'd like to proceed with these:

1. **SU-09 & SU-10 (OCR auto-fill for ID at sign-up):**
   - *Why it needs backend:* Requires integrating the `ai-engine` directly into the public `/api/auth/register` flow or creating a pre-registration `/api/ai/extract-id` endpoint that accepts unauthenticated ID uploads to parse and return the fields.
2. **AC-06 (Save uploaded ID documents to the profile):**
   - *Why it needs backend:* The current schema drops the `id_proof_path` from the `/api/auth/me` and `/api/users/:id` responses. We need to expose this field in the backend user model queries so the frontend can render it in the profile settings.
3. **AD-04 (Per-document student/alumni/both visibility setting):**
   - *Why it needs backend:* While the frontend already uses `available_to` in `NewRequestModal.jsx` (ST-02), the Admin *System Maintenance* tab currently lacks the CRUD endpoints to update the `available_to` column on `document_types`.
4. **AD-06 (Per-college document restrictions):**
   - *Why it needs backend (Needs Investigation):* I investigated the schema. Currently, a student's `course` is stored as a free-text `VARCHAR(100)` column in the `users` table. There is no relational foreign key mapping `course` to the `colleges` table. To restrict documents by college, we must either add a `college_id` foreign key to students, or create a formal `courses` table that maps to `colleges`.
5. **DOC-01, DOC-02, DOC-03 (Document configuration rules):**
   - *Why it needs backend:* These require adding new columns to the `document_types` table (`is_repeatable`, `is_walk_in`, `requires_original`, `registrar_attachment_rule`) and updating the `referenceData` API payload.

---

### 🟢 Presentation Layer Only (Ready to Implement)
I plan to touch the following files to implement the frontend-only UI/UX revisions. I will proceed with these upon your confirmation:

* **AC-04 (Rename Settings & Profile icons):**
  - `frontend/src/layouts/SidebarNav.jsx` (Rename sidebar label)
  - `frontend/src/components/ProfileSettingsModal.jsx` (Rename header and triggers)
* **AC-05 (Color distinction for buttons, text, and info):**
  - Global review across `StudentDashboard`, `FinanceDashboard`, `Window1Dashboard`, and `AdminDashboard` to swap generic gray/blue statuses and buttons with distinct Semantic colors (e.g., amber for warnings, red for destructive, bold green for primary progression).
* **SEC-06 (Preview documents inline in verification modals):**
  - `frontend/src/features/admin/AdminDashboard.jsx` (Replace the generic `ConfirmDialog` for Student Verification with a new split-screen modal)
  - `frontend/src/features/admin/components/AccountVerificationModal.jsx` (New component to preview the student's `id_proof_path` inline)
* **WI-13 (Export/report access for Window 1 and Secretary):**
  - `frontend/src/features/window1/Window1Dashboard.jsx` (Add Reports tab)
  - `frontend/src/features/secretary/SecretaryDashboard.jsx` (Add Reports tab)
  - `frontend/src/features/admin/components/ReportsPanel.jsx` (Refactor to make it a shared component accessible by clerks)
* **AD-05 (Staff can view full profile from lists):**
  - Wrap student names in `<button>` tags across all queue tables to trigger the shared `UserDetailModal`.
* **SEC-17 (Auto-dismiss notification pop-ups):**
  - `frontend/src/layouts/Layout.jsx` or `NotificationDropdown.jsx` (Wire a `useEffect` on `location.pathname` to auto-close active dropdowns/modals on route change).

**Next Step:** Please confirm if I should proceed with the **Presentation Layer (🟢)** files listed above, and let me know your architectural decisions for the **Backend Changes (🟡)**.
