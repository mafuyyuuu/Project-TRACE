const fs = require('fs');
const file = 'frontend/src/features/secretary/SecretaryDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const targetRegex = /<ConfirmDialog\s+open=\{\!\!orVerifyToConfirm\}[\s\S]*?onCancel=\{cancelVerifyOfficialReceiptConfirm\}\s+\/>/;

const replacement = `<ReceiptVerificationModal
          selectedDoc={orVerifyToConfirm}
          setActiveModal={cancelVerifyOfficialReceiptConfirm}
          setViewImageUrl={setViewImageUrl}
          handleSecretaryVerifyReceipt={confirmVerifyOfficialReceiptAction}
          actionLoading={actionLoading}
        />`;

content = content.replace(targetRegex, replacement);
fs.writeFileSync(file, content);
