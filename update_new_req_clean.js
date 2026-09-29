const fs = require('fs');
const file = 'frontend/src/features/student/components/NewRequestModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove Copies
const copiesInputRegex = /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[10px\] font-bold text-gray-700 uppercase tracking-widest">Copies<\/label>\s*<input\s*type="number" min="1" required\s*value=\{selection\.copies\}\s*onChange=\{\(e\) => updateSelection\(type\.name, \{ copies: e\.target\.value \}\)\}\s*className="w-full bg-white border border-gray-200 rounded-xl p-2\.5 text-xs outline-none focus:ring-2 focus:ring-\[#15803d\]\/20"\s*\/>\s*<\/div>/g;
content = content.replace(copiesInputRegex, '');
content = content.replace(/<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">/g, '<div className="grid grid-cols-1 gap-3">');

// Remove Copies from summary
const summaryCopiesRegex = /\{selections\[name\]\.copies > 1 && ` × \$\{selections\[name\]\.copies\}`\}/g;
content = content.replace(summaryCopiesRegex, '');

// 2. Reissue Fee
content = content.replace(
  '<span className="flex-1 text-xs font-bold text-gray-800">{type.name}</span>',
  `<span className="flex-1 text-xs font-bold text-gray-800">
                          {type.name}
                          {type.name === 'Diploma' && <span className="ml-1 text-[10px] text-gray-500 font-normal italic">(Reissue Fee)</span>}
                        </span>`
);

// 3. Attachments
const oldAttachmentBlockRegex = /\{type\.requires_attachment && \([\s\S]*?<input\s+type="file"[\s\S]*?\/>\s*<\/div>\s*<\/div>\s*\)\}/;
const newAttachmentBlock = `{type.requires_attachment ? (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                                {type.attachment_label || 'Supporting Attachment'}
                                <span className="font-normal normal-case text-gray-400 ml-1">
                                  · upload now, or bring it to Window 1
                                </span>
                              </label>
                              <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 relative">
                                {selection.file ? (
                                  <span className="text-xs font-bold text-[#15803d] truncate px-4">
                                    ✓ {selection.file.name}
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold text-gray-600">
                                    <span className="text-[#15803d]">Click here</span> to upload{' '}
                                    {type.attachment_helper || 'the supporting file'}
                                  </span>
                                )}
                                <input
                                  type="file"
                                  onChange={(e) => updateSelection(type.name, { file: e.target.files[0] })}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                                Required Attachment: <span className="text-gray-500 font-normal">None</span>
                              </label>
                            </div>
                          )}`;

content = content.replace(oldAttachmentBlockRegex, newAttachmentBlock);

fs.writeFileSync(file, content);
