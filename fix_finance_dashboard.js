const fs = require('fs');
let file = 'frontend/src/features/finance/FinanceDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// Add 'transactions' tab to QueueTabs
content = content.replace(
  "tabs={[\n          { id: 'payment', label: 'Payments', count: paymentQueue.length },\n          { id: 'verification', label: 'Verifications', count: verificationQueue.length }\n        ]}",
  "tabs={[\n          { id: 'payment', label: 'Payments', count: paymentQueue.length },\n          { id: 'verification', label: 'Verifications', count: verificationQueue.length },\n          { id: 'transactions', label: 'Transactions & Exports' }\n        ]}"
);

// We need a list of transactions (completed or paid)
// We can use the existing 'documents' array, filtering for ones that are past PENDING_FINANCE_VERIFICATION
const transactionsContent = `
        {/* Transactions Tab (FIN-05, FIN-03) */}
        {activeQueueTab === 'transactions' && (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h3 className="font-bold text-gray-950 text-sm tracking-wider uppercase">3 · TRANSACTIONS & EXPORTS</h3>
            <button
              onClick={() => alert('Exporting CSV... (Simulated)')}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all whitespace-nowrap shrink-0"
            >
              Export CSV
            </button>
          </div>
          <div className="p-4 sm:p-6">
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[730px]">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                    <th className="pb-4 font-bold pl-4 min-w-[110px]">Tracking ID</th>
                    <th className="pb-4 font-bold min-w-[150px]">Student Name</th>
                    <th className="pb-4 font-bold min-w-[120px]">Date Paid</th>
                    <th className="pb-4 font-bold min-w-[90px]">Amount</th>
                    <th className="pb-4 font-bold min-w-[100px]">OR Status</th>
                    <th className="pb-4 font-bold text-right pr-4 min-w-[110px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {documents.filter(d => ['PAID_PENDING_SEC_RELEASE', 'SEC_OR_VERIFIED', 'READY_FOR_RELEASE', 'COMPLETED'].includes(d.current_status)).map(doc => (
                    <tr key={doc.id} className="hover:bg-gray-50/30 group">
                      <td className="py-4 pl-4 font-mono text-xs font-semibold text-gray-500">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                      <td className="py-4 text-sm font-bold text-gray-700">{doc.student_name}</td>
                      <td className="py-4 text-xs font-semibold text-gray-500">{new Date(doc.updated_at).toLocaleDateString()}</td>
                      <td className="py-4 text-xs font-bold text-gray-800 font-mono">{formatPeso(doc.amount)}</td>
                      <td className="py-4 text-xs font-semibold">
                        {doc.official_receipt_path 
                          ? <span className="text-[#15803d]">Uploaded</span>
                          : <span className="text-amber-600 font-bold">Missing</span>}
                      </td>
                      <td className="py-4 text-right pr-4 min-w-[110px]">
                        {!doc.official_receipt_path && (
                          <button
                            onClick={() => { setSelectedDoc(doc); setActiveModal('upload-or-later'); }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-bold shadow-sm transition-all"
                          >
                            Upload OR
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
`;

content = content.replace(
  '{/* Finance Receipt Verification Modal */}',
  transactionsContent + '\n        {/* Finance Receipt Verification Modal */}'
);

fs.writeFileSync(file, content);
