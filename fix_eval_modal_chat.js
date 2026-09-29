const fs = require('fs');

let file = 'frontend/src/features/secretary/components/SecretaryEvaluationModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add import
if (!content.includes('DocumentChat')) {
  content = "import DocumentChat from '@/components/DocumentChat';\n" + content;
}

// 2. Add user prop
content = content.replace(
  "export default function SecretaryEvaluationModal({",
  "export default function SecretaryEvaluationModal({\n  user,"
);

// 3. Pass user to formProps
content = content.replace(
  "evalDocType, setEvalDocType, estimatedReadyDate, setEstimatedReadyDate, clerkNotes, setClerkNotes,",
  "evalDocType, setEvalDocType, estimatedReadyDate, setEstimatedReadyDate, clerkNotes, setClerkNotes, user,"
);

// 4. Accept user in EvaluationForm
content = content.replace(
  "function EvaluationForm({",
  "function EvaluationForm({\n  user,"
);

// 5. Add DocumentChat under clerkNotes
const insertChat = `
        </div>

        <div className="flex flex-col gap-1.5 pt-4 border-t border-gray-100">
          <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Discussion</label>
          <DocumentChat documentId={selectedDoc.id} user={user} />
        </div>
      </div>
    </div>
  );
}
`;

content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/, insertChat.trim() + '\n');

fs.writeFileSync(file, content);

// Now add 'user={user}' in SecretaryDashboard.jsx where SecretaryEvaluationModal is called
let dashFile = 'frontend/src/features/secretary/SecretaryDashboard.jsx';
let dashContent = fs.readFileSync(dashFile, 'utf8');
dashContent = dashContent.replace(
  "<SecretaryEvaluationModal\n            selectedDoc={selectedDoc}",
  "<SecretaryEvaluationModal\n            user={user}\n            selectedDoc={selectedDoc}"
);
fs.writeFileSync(dashFile, dashContent);
