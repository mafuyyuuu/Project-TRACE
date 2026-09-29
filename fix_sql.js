const fs = require('fs');
let schema = fs.readFileSync('backend/database/schema.sql', 'utf8');
let seed = fs.readFileSync('backend/database/seed.sql', 'utf8');

// Update schema
if (!schema.includes('is_same_day')) {
  schema = schema.replace(
    "registrar_attachment_rule ENUM('none', 'optional', 'required') NOT NULL DEFAULT 'none',",
    "registrar_attachment_rule ENUM('none', 'optional', 'required') NOT NULL DEFAULT 'none',\n  is_same_day BOOLEAN NOT NULL DEFAULT FALSE,"
  );
  fs.writeFileSync('backend/database/schema.sql', schema);
}

// Update seed
// Remove Good Moral
seed = seed.replace(
  "('Certificate of Good Moral Character', 50.00, 'flat', FALSE, NULL, NULL, 5),\n",
  ""
);
// Update Transcript attachment
seed = seed.replace(
  "('Certificate of Transcript', 150.00, 'per_semester_block', FALSE, NULL, NULL, 1),",
  "('Certificate of Transcript', 150.00, 'per_semester_block', TRUE, 'Exit Clearance', 'your Exit Clearance', 1),"
);
// Update Honorable Dismissal attachment
seed = seed.replace(
  "('Honorable Dismissal', 150.00, 'flat', FALSE, NULL, NULL, 4),",
  "('Honorable Dismissal', 150.00, 'flat', TRUE, 'Affidavit of Loss / Sworn Statement', 'your Affidavit or Statement', 4),"
);
fs.writeFileSync('backend/database/seed.sql', seed);
