const fs = require('fs');

// 1. LiveTrackingModal.jsx
let modFile = 'frontend/src/features/student/components/LiveTrackingModal.jsx';
let modContent = fs.readFileSync(modFile, 'utf8');

if (!modContent.includes('DocumentChat')) {
  modContent = "import DocumentChat from '@/components/DocumentChat';\n" + modContent;
}

modContent = modContent.replace(
  "export default function LiveTrackingModal({",
  "export default function LiveTrackingModal({\n  user,"
);

const insertChat = `
        {/* Context Panel */}
        <div className="mt-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-center">
          <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
            {STAGE_MESSAGE[selectedDoc.current_status] || 'Your request is being processed.'}
            {selectedDoc.estimated_ready_date && [STATUS.PENDING_SEC_EVALUATION, STATUS.SEC_PROCESSING].includes(selectedDoc.current_status) && (
              <span className="block mt-2 font-bold">
                Expected ready by {new Date(selectedDoc.estimated_ready_date).toLocaleDateString()}.
              </span>
            )}
          </p>
        </div>

        {/* Chat Panel */}
        <div className="mt-6 border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between mb-3">
             <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Document Discussion</label>
          </div>
          <DocumentChat documentId={selectedDoc.id} user={user} />
        </div>
      </div>
    </ModalShell>
`;

modContent = modContent.replace(/\{\/\* Context Panel \*\/\}.*?<\/ModalShell>/s, insertChat.trim() + '\n  );\n}');

fs.writeFileSync(modFile, modContent);

// 2. StudentDashboard.jsx
let dashFile = 'frontend/src/features/student/StudentDashboard.jsx';
let dashContent = fs.readFileSync(dashFile, 'utf8');

dashContent = dashContent.replace(
  "<LiveTrackingModal \n            selectedDoc={selectedDoc}",
  "<LiveTrackingModal \n            user={user}\n            selectedDoc={selectedDoc}"
);

fs.writeFileSync(dashFile, dashContent);
