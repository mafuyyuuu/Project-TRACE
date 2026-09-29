const fs = require('fs');
const file = 'backend/src/models/document.model.js';
let content = fs.readFileSync(file, 'utf8');

// I previously added dt.is_same_day
content = content.replace(
  "dt.is_same_day",
  "dt.is_same_day, dt.rental_fee, dt.special_fee, dt.base_fee, dt.fee_rule"
);

fs.writeFileSync(file, content);
