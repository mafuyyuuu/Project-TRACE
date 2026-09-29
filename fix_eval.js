const fs = require('fs');
const file = 'frontend/src/features/secretary/components/SecretaryEvaluationModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'clerkNotes,',
  'clerkNotes,\n  documentTypes = [],'
);

const targetSelect = `<select
              value={evalDocType}
              onChange={(e) => setEvalDocType(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer"
            >
              <option value="Transcript of Records">Transcript of Records (TOR)</option>
              <option value="Graduation Clearance">Graduation Clearance</option>
              <option value="Certificate of Good Moral">Certificate of Good Moral</option>
              <option value="Honorable Dismissal">Honorable Dismissal</option>
              <option value="Diploma">Diploma</option>
            </select>`;

const replacementSelect = `<select
              value={evalDocType}
              onChange={(e) => setEvalDocType(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-base sm:text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer"
            >
              <option value="" disabled>Select Document Type</option>
              {documentTypes.length > 0 ? documentTypes.map((type) => (
                <option key={type.name} value={type.name}>{type.name}</option>
              )) : (
                <option value={evalDocType}>{evalDocType}</option>
              )}
            </select>`;

content = content.replace(targetSelect, replacementSelect);
content = content.replace('setClerkNotes,', 'setClerkNotes, documentTypes,');

fs.writeFileSync(file, content);
