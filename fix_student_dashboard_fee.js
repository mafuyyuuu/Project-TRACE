const fs = require('fs');
const file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// The dashboard doesn't have itemBreakdown from pricing.js yet.
if (!content.includes('itemBreakdown')) {
  content = content.replace(
    'import { formatPeso } from \'@/utils/pricing\';',
    'import { formatPeso, itemBreakdown } from \'@/utils/pricing\';'
  );
  
  const injectBreakdown = `
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm text-emerald-900 border-b border-emerald-100/50 pb-2 mb-1">
                    <span className="font-bold">Total Amount Due</span>
                    <span className="font-black text-lg">{formatPeso(selectedDoc.group_total)}</span>
                  </div>
                  {/* Fee Itemization */}
                  <div className="text-xs text-emerald-800/80 space-y-1">
                    {documents.filter(d => d.request_group_id === selectedDoc.request_group_id).map(doc => (
                      <div key={doc.id} className="flex flex-col">
                         <span className="font-bold text-emerald-900">{doc.document_type}</span>
                         {/* We don't have the full document_types object here, just the doc. We should map what we know. */}
                         <div className="flex justify-between pl-2">
                           <span>Document Fee</span>
                           <span className="font-mono">{formatPeso(doc.amount)}</span>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>`;
  content = content.replace(
    /<div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col gap-2">[\s\S]*?<div className="flex justify-between items-center text-sm text-emerald-900">[\s\S]*?<span className="font-bold">Total Amount Due<\/span>[\s\S]*?<span className="font-black text-lg">\{formatPeso\(selectedDoc\.group_total\)\}<\/span>[\s\S]*?<\/div>[\s\S]*?<\/div>/,
    injectBreakdown
  );
  
  fs.writeFileSync(file, content);
}
