const fs = require('fs');
let schema = fs.readFileSync('backend/database/schema.sql', 'utf8');

if (!schema.includes('rental_fee DECIMAL')) {
  schema = schema.replace(
    "base_fee DECIMAL(10,2) NOT NULL DEFAULT 50.00,",
    "base_fee DECIMAL(10,2) NOT NULL DEFAULT 50.00,\n  rental_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,\n  special_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,"
  );
  schema = schema.replace(
    "official_receipt_path VARCHAR(255),",
    "official_receipt_path VARCHAR(255),\n  or_uploaded_at TIMESTAMP NULL DEFAULT NULL,"
  );
  fs.writeFileSync('backend/database/schema.sql', schema);
}
