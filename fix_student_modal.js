const fs = require('fs');
let file = 'frontend/src/features/student/components/LiveTrackingModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const correctBottom = `
        {/* Chat Panel */}
        <div className="mt-6 border-t border-gray-100 pt-6">
          <div className="flex items-center justify-between mb-3">
             <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Document Discussion</label>
          </div>
          <DocumentChat documentId={selectedDoc.id} user={user} />
        </div>
      </div>
    </ModalShell>
  );
}
`;

content = content.replace(/\{\/\* Chat Panel \*\/\}.*$/s, correctBottom.trim() + '\n');
fs.writeFileSync(file, content);
