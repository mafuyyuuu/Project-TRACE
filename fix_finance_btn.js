const fs = require('fs');
let file = 'frontend/src/features/finance/FinanceDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// In Walk-In Logging Queue table
const btnWalkIn = `
                          <button
                            onClick={() => { setSelectedDoc(doc); setActiveModal('payment-stub'); }}
                            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold shadow-sm transition-all block whitespace-nowrap shrink-0"
                          >
                            View Slip
                          </button>
                          <button
`;
content = content.replace(
  "                          <button\n                            onClick={() => { setSelectedDoc(doc); setActiveModal('walk-in-payment'); }}",
  btnWalkIn + "                            onClick={() => { setSelectedDoc(doc); setActiveModal('walk-in-payment'); }}"
);
content = content.replace(
  "<td className=\"py-4 text-right pr-4 min-w-[190px]\">",
  "<td className=\"py-4 text-right pr-4 min-w-[200px] flex justify-end gap-2 items-center h-full\">"
);

// In Verification Queue table
const btnVerify = `
                          <button
                            onClick={() => { setSelectedDoc(doc); setActiveModal('payment-stub'); }}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-[11px] font-bold shadow-sm transition-all whitespace-nowrap shrink-0"
                          >
                            Slip
                          </button>
                          <button
`;
content = content.replace(
  "                          <button\n                            onClick={() => { setSelectedDoc(doc); setActiveModal('verify-pay'); }}",
  btnVerify + "                            onClick={() => { setSelectedDoc(doc); setActiveModal('verify-pay'); }}"
);
content = content.replace(
  "<td className=\"py-4 text-right pr-4 min-w-[110px]\">",
  "<td className=\"py-4 text-right pr-4 min-w-[140px] flex justify-end gap-2 items-center h-full\">"
);


fs.writeFileSync(file, content);
