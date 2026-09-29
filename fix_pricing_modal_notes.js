const fs = require('fs');

// 1. Remove from PricingModal.jsx
let modalFile = 'frontend/src/features/secretary/components/PricingModal.jsx';
let modalContent = fs.readFileSync(modalFile, 'utf8');

modalContent = modalContent.replace("  priceNotes,\n", "");
modalContent = modalContent.replace("  setPriceNotes,\n", "");

const oldNotesBlock = `
        <label className="block">
          <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">
            How the amount was worked out
          </span>
          <textarea
            rows={3}
            value={priceNotes}
            onChange={(e) => setPriceNotes(e.target.value)}
            placeholder="e.g. 8 pages across 2 semester blocks at the standard rate."
            className="w-full rounded-2xl border border-gray-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#15803d]/30"
          />
        </label>
`;

modalContent = modalContent.replace(oldNotesBlock.trim(), "");
modalContent = modalContent.replace(/<div className="flex justify-between"><span>Copies<\/span><span className="font-bold text-gray-950">\{selectedDoc\.copies \|\| 1\}<\/span><\/div>/g, ""); // Remove Copies from Pricing Modal too!

fs.writeFileSync(modalFile, modalContent);

// 2. Remove from useSecretaryDashboard.js
let hookFile = 'frontend/src/features/secretary/useSecretaryDashboard.js';
let hookContent = fs.readFileSync(hookFile, 'utf8');

hookContent = hookContent.replace("  const [priceNotes, setPriceNotes] = useState('');\n", "");
hookContent = hookContent.replace("pricing_notes: priceNotes,", "");
hookContent = hookContent.replace("priceNotes, setPriceNotes,", "");
hookContent = hookContent.replace(", priceNotes", ""); // in dependency array

fs.writeFileSync(hookFile, hookContent);

// 3. Remove from SecretaryDashboard.jsx
let dashFile = 'frontend/src/features/secretary/SecretaryDashboard.jsx';
let dashContent = fs.readFileSync(dashFile, 'utf8');

dashContent = dashContent.replace("    priceNotes,\n", "");
dashContent = dashContent.replace("            priceNotes={priceNotes}\n", "");

fs.writeFileSync(dashFile, dashContent);
