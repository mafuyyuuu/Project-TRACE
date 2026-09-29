const fs = require('fs');
const file = 'frontend/src/features/student/components/NewRequestModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove copies input block
const copiesRegex = /<div className="flex flex-col gap-1\.5">\s*<label className="text-\[10px\] font-bold text-gray-700 uppercase tracking-widest">Copies<\/label>\s*<input\s*type="number" min="1" required\s*value=\{selection\.copies\}\s*onChange=\{\(e\) => updateSelection\(type\.name, \{ copies: e\.target\.value \}\)\}\s*className="w-full bg-white border border-gray-200 rounded-xl p-2\.5 text-xs outline-none focus:ring-2 focus:ring-\[#15803d\]\/20"\s*\/>\s*<\/div>/;
content = content.replace(copiesRegex, '');

// Also change the grid-cols if copies was removed
content = content.replace('<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">', '<div className="grid grid-cols-1 gap-3">');

// Remove the `× ${selections[name].copies}` from the summary
const copiesSummaryRegex = /\{selections\[name\]\.copies > 1 && ` × \$\{selections\[name\]\.copies\}`\}/;
content = content.replace(copiesSummaryRegex, '');

// 2. Inject Reissue Fee for Diploma
content = content.replace(
  '<span className="flex-1 text-xs font-bold text-gray-800">{type.name}</span>',
  '<span className="flex-1 text-xs font-bold text-gray-800">\n                          {type.name}\n                          {type.name === \'Diploma\' && <span className="ml-1 text-[10px] text-gray-500 font-normal italic">(Reissue Fee)</span>}\n                        </span>'
);

// 3. Update requires_attachment logic (CN-06)
content = content.replace(
  '{type.requires_attachment && (',
  '{type.requires_attachment ? (\n                            <div className="flex flex-col gap-1.5">\n                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">\n                                {type.attachment_label || \'Supporting Attachment\'}\n                                <span className="font-normal normal-case text-gray-400 ml-1">\n                                  · upload now, or bring it to Window 1\n                                </span>\n                              </label>\n                              <div className="border-2 border-dashed border-gray-300 rounded-xl p-3 bg-white flex items-center justify-center cursor-pointer hover:bg-gray-50 relative">\n                                {selection.file ? (\n                                  <span className="text-xs font-bold text-[#15803d] truncate px-4">\n                                    ✓ {selection.file.name}\n                                  </span>\n                                ) : (\n                                  <span className="text-xs font-bold text-gray-600">\n                                    <span className="text-[#15803d]">Click here</span> to upload{\' \'}\n                                    {type.attachment_helper || \'the supporting file\'}\n                                  </span>\n                                )}\n                                <input\n                                  type="file"\n                                  onChange={(e) => updateSelection(type.name, { file: e.target.files[0] })}\n                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"\n                                />\n                              </div>\n                            </div>\n                          ) : (\n                            <div className="flex flex-col gap-1.5">\n                              <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">\n                                Required Attachment: <span className="text-gray-500 font-normal">None</span>\n                              </label>\n                            </div>\n                          )}'
);

// To avoid duplicate code because I just replaced the start of the block, I need to match the entire original block.
// Wait, my replace above replaced just the `{type.requires_attachment && (` part, which leaves the rest of the original block hanging! Let me fix it using a more precise replacement.
