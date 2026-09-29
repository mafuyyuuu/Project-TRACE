const fs = require('fs');

let modFile = 'frontend/src/features/finance/components/FinanceVerificationModal.jsx';
let modContent = fs.readFileSync(modFile, 'utf8');

if (!modContent.includes('DocumentChat')) {
  modContent = "import DocumentChat from '@/components/DocumentChat';\n" + modContent;
}

modContent = modContent.replace(
  "export default function FinanceVerificationModal({",
  "export default function FinanceVerificationModal({\n  user,"
);

const insertChat = `
      <div className="flex flex-col gap-1.5 mt-4 border-t border-gray-100 pt-4">
        <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Discussion</label>
        <DocumentChat documentId={selectedDoc.id} user={user} />
      </div>
    </ModalShell>
`;

modContent = modContent.replace(/<\/div>\s*<\/ModalShell>/s, insertChat.trim() + '\n  );\n}');

fs.writeFileSync(modFile, modContent);

// Add to FinanceDashboard.jsx
let dashFile = 'frontend/src/features/finance/FinanceDashboard.jsx';
let dashContent = fs.readFileSync(dashFile, 'utf8');

dashContent = dashContent.replace(
  "<FinanceVerificationModal\n            selectedDoc={selectedDoc}",
  "<FinanceVerificationModal\n            user={user}\n            selectedDoc={selectedDoc}"
);

fs.writeFileSync(dashFile, dashContent);
