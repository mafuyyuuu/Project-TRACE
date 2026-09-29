const fs = require('fs');
const file = 'backend/src/models/referenceData.model.js';
let content = fs.readFileSync(file, 'utf8');

// listDocumentTypes
content = content.replace(
  "attachment_label, attachment_helper, is_active, sort_order, available_to",
  "attachment_label, attachment_helper, is_active, sort_order, available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule"
);

// findDocumentTypeByName
content = content.replace(
  "attachment_label, attachment_helper, is_active\n       FROM document_types",
  "attachment_label, attachment_helper, is_active, available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule\n       FROM document_types"
);

// findDocumentTypeById
content = content.replace(
  "attachment_label, attachment_helper, is_active\n       FROM document_types WHERE id = ?",
  "attachment_label, attachment_helper, is_active, available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule\n       FROM document_types WHERE id = ?"
);

// createDocumentType
content = content.replace(
  "const { name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order = 0 } = data;",
  "const { name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order = 0, available_to = 'both', is_repeatable = true, is_walk_in = false, requires_original = false, registrar_attachment_rule = 'none' } = data;"
);
content = content.replace(
  "INSERT INTO document_types (name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order)",
  "INSERT INTO document_types (name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order, available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule)"
);
content = content.replace(
  "VALUES (?, ?, ?, ?, ?, ?, ?)",
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
content = content.replace(
  "[name, base_fee, fee_rule || 'flat', requires_attachment || false, attachment_label, attachment_helper, sort_order]",
  "[name, base_fee, fee_rule || 'flat', requires_attachment || false, attachment_label, attachment_helper, sort_order, available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule]"
);

// updateDocumentType
content = content.replace(
  "const { name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order } = data;",
  "const { name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order, available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule } = data;"
);
content = content.replace(
  "UPDATE document_types SET name = ?, base_fee = ?, fee_rule = ?, requires_attachment = ?, attachment_label = ?, attachment_helper = ?, sort_order = ? WHERE id = ?",
  "UPDATE document_types SET name = ?, base_fee = ?, fee_rule = ?, requires_attachment = ?, attachment_label = ?, attachment_helper = ?, sort_order = ?, available_to = ?, is_repeatable = ?, is_walk_in = ?, requires_original = ?, registrar_attachment_rule = ? WHERE id = ?"
);
content = content.replace(
  "[name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order, id]",
  "[name, base_fee, fee_rule, requires_attachment, attachment_label, attachment_helper, sort_order, available_to, is_repeatable, is_walk_in, requires_original, registrar_attachment_rule, id]"
);

fs.writeFileSync(file, content);
