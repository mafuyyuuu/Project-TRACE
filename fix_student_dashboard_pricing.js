const fs = require('fs');
let file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { formatPeso, itemBreakdown } from '@/utils/pricing';", "import { formatPeso } from '@/utils/pricing';");

const oldBlock = `
                      const typeObj = {
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
`;

const newBlock = `
                      return (
                        <div key={doc.id} className="flex flex-col gap-0.5">
                          <span className="font-bold text-emerald-900">{doc.document_type}</span>
                          <div className="flex justify-between pl-2 text-emerald-800/80">
                            <span>Evaluated Price</span>
                            <span className="font-mono font-semibold">{formatPeso(doc.amount)}</span>
                          </div>
                        </div>
                      );
`;

content = content.replace(oldBlock.trim(), newBlock.trim());
fs.writeFileSync(file, content);
