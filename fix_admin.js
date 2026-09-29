const fs = require('fs');
const file = 'frontend/src/features/admin/AdminDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add import
content = content.replace(
  "import ConfirmDialog from '@/components/ConfirmDialog';",
  "import ConfirmDialog from '@/components/ConfirmDialog';\nimport AccountVerificationModal from './components/AccountVerificationModal';"
);

// Replace the specific ConfirmDialog for student verification
const confirmRegex = /<ConfirmDialog[\s\S]*?open=\{\!\!studentVerifyToConfirm\}[\s\S]*?onCancel=\{cancelAdminVerifyStudent\}\s+\/>/;
const replacement = `<AccountVerificationModal
        studentVerifyToConfirm={studentVerifyToConfirm}
        cancelAdminVerifyStudent={cancelAdminVerifyStudent}
        confirmAdminVerifyStudent={confirmAdminVerifyStudent}
        actionLoading={actionLoading}
        setViewImageUrl={setViewImageUrl}
      />`;

content = content.replace(confirmRegex, replacement);

fs.writeFileSync(file, content);
