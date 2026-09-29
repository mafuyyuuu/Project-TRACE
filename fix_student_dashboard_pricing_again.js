const fs = require('fs');

let file = 'frontend/src/features/student/StudentDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /\/\/ Construct a pseudo document_type[\s\S]*?<\/div>\s*\)\s*:\s*\(\s*<div className="flex justify-between pl-2">\s*<span>Fee<\/span>\s*<span className="font-mono">\{formatPeso\(doc\.amount\)\}<\/span>\s*<\/div>\s*\)\}\s*<\/div>\s*\);/m;

const newBlock = `
                      return (
                        <div key={doc.id} className="flex flex-col gap-0.5">
                          <span className="font-bold text-emerald-900">{doc.document_sequence_number || doc.document_type}</span>
                          <div className="flex justify-between pl-2 text-emerald-800/80">
                            <span>Evaluated Price</span>
                            <span className="font-mono font-semibold">{formatPeso(doc.amount)}</span>
                          </div>
                        </div>
                      );
`;

content = content.replace(regex, newBlock.trim());
fs.writeFileSync(file, content);
