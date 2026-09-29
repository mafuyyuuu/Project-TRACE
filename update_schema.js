const fs = require('fs');
let schema = fs.readFileSync('backend/database/schema.sql', 'utf8');

// document_types table
schema = schema.replace(
  "is_active BOOLEAN NOT NULL DEFAULT TRUE,",
  "is_active BOOLEAN NOT NULL DEFAULT TRUE,\n  available_to ENUM('student', 'alumni', 'both') NOT NULL DEFAULT 'both',\n  is_repeatable BOOLEAN NOT NULL DEFAULT TRUE,\n  is_walk_in BOOLEAN NOT NULL DEFAULT FALSE,\n  requires_original BOOLEAN NOT NULL DEFAULT FALSE,\n  registrar_attachment_rule ENUM('none', 'optional', 'required') NOT NULL DEFAULT 'none',"
);

// users table
schema = schema.replace(
  "course VARCHAR(100),",
  "course VARCHAR(100),\n  college_id INT NULL,\n  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL,"
);

// add document_type_colleges table after document_types
const dtTableEnd = ");\n\n--";
const insertPos = schema.indexOf(dtTableEnd, schema.indexOf("CREATE TABLE IF NOT EXISTS document_types"));
if (insertPos !== -1) {
  const newTable = `);\n\nCREATE TABLE IF NOT EXISTS document_type_colleges (\n  document_type_id INT NOT NULL,\n  college_id INT NOT NULL,\n  PRIMARY KEY (document_type_id, college_id),\n  FOREIGN KEY (document_type_id) REFERENCES document_types(id) ON DELETE CASCADE,\n  FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE CASCADE\n);\n\n--`;
  schema = schema.substring(0, insertPos) + newTable + schema.substring(insertPos + dtTableEnd.length);
}

fs.writeFileSync('backend/database/schema.sql', schema);
