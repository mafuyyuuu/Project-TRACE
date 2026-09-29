const fs = require('fs');
const file = 'backend/src/models/referenceData.model.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /registrar_attachment_rule/g,
  'registrar_attachment_rule, is_same_day'
);
content = content.replace(
  "requires_original = false, registrar_attachment_rule = 'none' } = data;",
  "requires_original = false, registrar_attachment_rule = 'none', is_same_day = false } = data;"
);
content = content.replace(
  "requires_original = false, registrar_attachment_rule = 'none', is_same_day } = data;",
  "requires_original = false, registrar_attachment_rule = 'none', is_same_day = false } = data;" // cleanup if duplicated
);

content = content.replace(
  ", is_same_day = false } = data;",
  ", is_same_day = false } = data;"
);

// We need to add it to the VALUES array
content = content.replace(
  "requires_original, registrar_attachment_rule)",
  "requires_original, registrar_attachment_rule, is_same_day)"
);
content = content.replace(
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
content = content.replace(
  "requires_original, registrar_attachment_rule]",
  "requires_original, registrar_attachment_rule, is_same_day]"
);
content = content.replace(
  "requires_original = ?, registrar_attachment_rule = ? WHERE",
  "requires_original = ?, registrar_attachment_rule = ?, is_same_day = ? WHERE"
);
content = content.replace(
  "requires_original, registrar_attachment_rule, id]",
  "requires_original, registrar_attachment_rule, is_same_day, id]"
);

fs.writeFileSync(file, content);
