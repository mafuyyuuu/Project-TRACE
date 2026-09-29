const fs = require('fs');
let progress = fs.readFileSync('docs/PROGRESS.md', 'utf8');

const phase23 = `
### Phase 23: Batch 8b — Backend Schema & Presentation Polish
**Status:** Complete
*A combined phase addressing both the presentation-layer refinements requested in Batch 8b and the structural database changes required to support advanced capstone features.*

- [x] **AI Auto-fill (SU-09, SU-10):** Built a public \`/api/ai/extract-id\` endpoint. The student signup form now passes uploaded IDs to the Python EasyOCR engine and auto-fills the Student/Alumni ID field.
- [x] **Profile Edits & Security:** Updated \`/api/auth/me\` to expose \`id_proof_path\` so the frontend can securely render the user's uploaded ID.
- [x] **Document Type Configurations (AD-04, DOC-01/02/03):** Ran a database migration to add \`available_to\`, \`is_repeatable\`, \`is_walk_in\`, \`requires_original\`, and \`registrar_attachment_rule\` to \`document_types\`. Updated \`MaintenancePanel.jsx\` and backend models to support full CRUD for these rules.
- [x] **Per-College Restrictions (AD-06):** Injected \`college_id\` as a foreign key into \`users\` and created a normalized \`document_type_colleges\` junction table to prepare the system for strict document routing.
- [x] **UI/UX Refinements (AC-04, AC-05, SEC-06, WI-13, AD-05, SEC-17):** 
  - Renamed Settings to Preferences to avoid duplicate UI names.
  - Hardened destructive button colors (red) across modals.
  - Implemented \`AccountVerificationModal.jsx\` (split-screen ID preview) for Admin approvals.
  - Extended the \`ReportsPanel\` to Window 1 and Secretary dashboards.
  - Converted student names in queue tables to launch a \`StudentProfileModal\`.
  - Added auto-dismiss to notification dropdowns on route change.
`;

// Insert before "## Known Issues"
progress = progress.replace("## Known Issues", phase23 + "\n## Known Issues");
fs.writeFileSync('docs/PROGRESS.md', progress);
