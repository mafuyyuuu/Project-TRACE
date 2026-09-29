const fs = require('fs');
let agents = fs.readFileSync('.agents/AGENTS.md', 'utf8');

agents = agents.replace(
  "* **Official Receipt Verification (Phase 22):** Added `SEC_OR_VERIFIED` stage, allowing Finance to capture OR numbers and Secretary to verify physical receipts.",
  "* **Official Receipt Verification (Phase 22):** Added `SEC_OR_VERIFIED` stage, allowing Finance to capture OR numbers and Secretary to verify physical receipts.\n* **Batch 8b & Schema Expansion (Phase 23):** Built AI auto-fill for registration, implemented `college_id` foreign keys and junction tables for per-college document restrictions, added 5 new configuration flags to `document_types` (e.g. `available_to`, `is_repeatable`), and completed sweeping presentation-layer polish."
);

fs.writeFileSync('.agents/AGENTS.md', agents);
