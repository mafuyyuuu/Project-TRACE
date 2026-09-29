const fs = require('fs');
let file = 'frontend/src/features/student/components/NewRequestModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const newLogic = `
  // CN-10: Form redesign logic
  const needsSemesters = (type) => false; // TOR dropped semesters
  const needsRequestingSchool = (name) => name === 'Transcript Credential Set'; // Honorable Dismissal and TOR dropped it
  const needsYearGraduated = (name) => name === 'Honorable Dismissal' || name === 'Transcript Credential Set';
  const dropsPurpose = (name) => name === 'Graduate Clearance';
`;

content = content.replace(
  "  const needsSemesters = (type) => type.fee_rule === 'per_semester_block';\n  const needsRequestingSchool = (name) =>\n    name === 'Transcript of Records' || name === 'Honorable Dismissal';\n  const needsYearGraduated = (name) =>\n    name === 'Honorable Dismissal' || name === 'Certificate of Transfer Credential';",
  newLogic.trim()
);

content = content.replace(
  "                          <div className=\"grid grid-cols-1 gap-3\">\n                            \n                            <div className=\"flex flex-col gap-1.5\">\n                              <label className=\"text-[10px] font-bold text-gray-700 uppercase tracking-widest\">Purpose</label>",
  `                          {!dropsPurpose(type.name) && (
                            <div className="grid grid-cols-1 gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Purpose</label>`
);

content = content.replace(
  "                              />\n                            </div>\n                          </div>",
  "                              />\n                            </div>\n                          </div>\n                          )}"
);

content = content.replace(
  "                          {type.requires_attachment ?",
  "                          {!dropsPurpose(type.name) && type.requires_attachment ?"
);

fs.writeFileSync(file, content);
