const fs = require('fs');
let file = 'frontend/src/features/finance/components/FinanceVerificationModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// Remove required attribute from file input
content = content.replace(
  'accept="image/png, image/jpeg, image/webp, application/pdf"\n            required',
  'accept="image/png, image/jpeg, image/webp, application/pdf"\n            /* FIN-03: Deferred Upload */'
);

// Optional label
content = content.replace(
  'Attach Official POS Receipt <span className="text-red-500">*</span>',
  'Attach Official POS Receipt <span className="text-gray-400 font-normal normal-case">(Optional - upload later if deferred)</span>'
);

fs.writeFileSync(file, content);
