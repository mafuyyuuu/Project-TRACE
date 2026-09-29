const fs = require('fs');
let file = 'frontend/src/features/finance/components/FinanceVerificationModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { formatPeso, itemBreakdown } from '@/utils/pricing';", "import { formatPeso } from '@/utils/pricing';");

const oldBlock = `
          <div className="flex justify-between"><span>Copies</span><span className="font-bold text-gray-950">{selectedDoc.copies || 1}</span></div>
          <div className="border-t border-gray-200/50 pt-2 mt-2 space-y-1">
          {(() => {
            const typeObj = {
              base_fee: selectedDoc.base_fee,
              rental_fee: selectedDoc.rental_fee,
              special_fee: selectedDoc.special_fee,
              fee_rule: selectedDoc.fee_rule
            };
            const breakdown = itemBreakdown(typeObj, { copies: selectedDoc.copies });
            return breakdown.length > 0 ? breakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px] text-gray-600">
                <span>{item.label}</span>
                <span className="font-mono">{formatPeso(item.amount)}</span>
              </div>
            )) : (
              <div className="flex justify-between text-[11px] text-gray-600">
                <span>Document Fee</span>
                <span className="font-mono">{formatPeso(selectedDoc.amount)}</span>
              </div>
            );
          })()}
          </div>
`;

const newBlock = `
          <div className="border-t border-gray-200/50 pt-2 mt-2 space-y-1">
            <div className="flex justify-between text-[11px] text-gray-600 font-semibold">
              <span>Evaluated Price</span>
              <span className="font-mono text-gray-950">{formatPeso(selectedDoc.amount)}</span>
            </div>
          </div>
`;

content = content.replace(oldBlock.trim(), newBlock.trim());
fs.writeFileSync(file, content);
