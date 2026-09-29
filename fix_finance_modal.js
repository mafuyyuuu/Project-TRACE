const fs = require('fs');
let file = 'frontend/src/features/finance/components/FinanceVerificationModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const correctBottom = `
        <textarea
          value={clerkNotes}
          onChange={(e) => setClerkNotes(e.target.value)}
          placeholder="Add notes (required for rejection)..."
          rows={2}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white outline-none transition-all resize-none"
        />
      </div>
      <div className="flex flex-col gap-1.5 mt-4 border-t border-gray-100 pt-4">
        <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Discussion</label>
        <DocumentChat documentId={selectedDoc.id} user={user} />
      </div>
    </ModalShell>
  );
}
`;

content = content.replace(/<textarea[\s\S]*?className="[^"]*"[\s\S]*?\/>[\s\S]*?$/m, correctBottom.trim() + '\n');
fs.writeFileSync(file, content);
