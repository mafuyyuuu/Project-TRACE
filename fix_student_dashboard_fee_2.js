const fs = require('fs');
const file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const injectBreakdown2 = `
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm text-emerald-900 border-b border-emerald-100/50 pb-2 mb-2">
                    <span className="font-bold">Total Amount Due</span>
                    <span className="font-black text-lg">{formatPeso(selectedDoc.group_total)}</span>
                  </div>
                  <div className="text-xs text-emerald-800/80 space-y-3">
                    {documents.filter(d => d.request_group_id === selectedDoc.request_group_id).map(doc => {
                      // Construct a pseudo document_type object for the pricing utility
                      const typeObj = {
                        name: doc.document_type,
                        base_fee: doc.base_fee,
                        rental_fee: doc.rental_fee,
                        special_fee: doc.special_fee,
                        fee_rule: doc.fee_rule
                      };
                      // The secretary stores the page count in copies? No, wait. 
                      // 'copies' was the student's input. The secretary inputs 'pageCount' into amount?
                      // Wait, itemBreakdown needs copies and semesters. We might not have semesters.
                      // Let's just use the amount if we don't have enough data, but we can do our best:
                      const breakdown = itemBreakdown(typeObj, { copies: doc.copies });
                      // However, if the secretary evaluated it, \`doc.amount\` is the final price.
                      // The breakdown calculates based on base_fee. 
                      return (
                        <div key={doc.id} className="flex flex-col gap-0.5">
                          <span className="font-bold text-emerald-900">{doc.document_type}</span>
                          {breakdown.length > 0 ? breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between pl-2">
                              <span>{item.label}</span>
                              <span className="font-mono">{formatPeso(item.amount)}</span>
                            </div>
                          )) : (
                            <div className="flex justify-between pl-2">
                              <span>Fee</span>
                              <span className="font-mono">{formatPeso(doc.amount)}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>`;

const regex = /<div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col gap-2">[\s\S]*?\{documents\.filter[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;
content = content.replace(regex, injectBreakdown2);

fs.writeFileSync(file, content);
