const fs = require('fs');
const file = 'frontend/src/features/window1/components/ManualInputModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add state for documentType and purpose
if (!content.includes('const [docType, setDocType] = useState(')) {
  content = content.replace(
    'export default function ManualInputModal({',
    'import { useState } from \'react\';\nexport default function ManualInputModal({'
  );
  content = content.replace(
    'actionLoading,\n}) {',
    'actionLoading,\n}) {\n  const [docType, setDocType] = useState(\'\');\n  const [purpose, setPurpose] = useState(\'\');\n  const isGraduate = purpose === \'Graduation Clearance\' || docType === \'Graduate Clearance\';'
  );
}

// 2. Add onChange to selects
content = content.replace(
  'name="documentType"\n                required',
  'name="documentType"\n                required\n                value={docType}\n                onChange={(e) => setDocType(e.target.value)}'
);

content = content.replace(
  'name="purpose"\n                required',
  'name="purpose"\n                required\n                value={purpose}\n                onChange={(e) => setPurpose(e.target.value)}'
);

// 3. Render intercept block if isGraduate
content = content.replace(
  '<h3 className="text-xs font-black text-[#15803d] uppercase tracking-widest border-b border-gray-100 pb-3 mb-6 mt-10">DOCUMENT INFORMATION</h3>',
  `<h3 className="text-xs font-black text-[#15803d] uppercase tracking-widest border-b border-gray-100 pb-3 mb-6 mt-10">DOCUMENT INFORMATION</h3>
          
          {isGraduate && (
            <div className="mb-6 p-4 border border-red-200 bg-red-50 rounded-xl flex flex-col items-center justify-center text-center">
              <h4 className="text-sm font-bold text-red-700 mb-2">Redirect to Online Request</h4>
              <p className="text-xs text-red-600 mb-4 max-w-md">
                Walk-in processing is not available for Graduation/Graduate clearances. Please instruct the student to scan this QR code to request online via their student dashboard.
              </p>
              <img src="/qr-walkin.png" alt="QR Code to Online Portal" className="w-32 h-32 object-cover border-2 border-red-200 rounded-lg shadow-sm" />
            </div>
          )}`
);

// 4. Disable submit if isGraduate
content = content.replace(
  '<button\n            type="submit"\n            disabled={actionLoading}',
  '<button\n            type="submit"\n            disabled={actionLoading || isGraduate}'
);

fs.writeFileSync(file, content);
