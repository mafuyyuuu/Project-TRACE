const fs = require('fs');
let file = 'frontend/src/features/finance/components/FinanceVerificationModal.jsx';
let content = fs.readFileSync(file, 'utf8');

const warningDiv = `
      {new Date().getHours() >= 16 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-lg font-semibold flex items-start gap-2 mb-4">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <p>
            <strong>4:00 PM Cut-off:</strong> Payments verified after 4 PM will not generate a same-day Official Receipt. Ensure the student is aware.
          </p>
        </div>
      )}
`;

content = content.replace(
  '<div className="space-y-4">',
  warningDiv + '\n      <div className="space-y-4">'
);
fs.writeFileSync(file, content);
