const fs = require('fs');
let file = 'frontend/src/features/finance/components/FinanceVerificationModal.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('itemBreakdown')) {
  content = content.replace(
    'import AuthedFilePreview from \'@/components/AuthedFilePreview\';',
    'import AuthedFilePreview from \'@/components/AuthedFilePreview\';\nimport { formatPeso, itemBreakdown } from \'@/utils/pricing\';'
  );

  const replaceTarget = /<div className="flex justify-between"><span>Copies<\/span><span className="font-bold text-gray-950">\{selectedDoc\.copies \|\| 1\}<\/span><\/div>\s*<div className="flex justify-between border-t border-gray-200\/50 pt-2"><span>Amount<\/span><span className="font-bold text-gray-950">P\{parseFloat\(selectedDoc\.amount \|\| 150\)\.toFixed\(2\)\}<\/span><\/div>/;
  
  const newSection = `
        {/* Itemization */}
        <div className="border-t border-gray-200/50 pt-3 mt-1 space-y-1">
          {(() => {
            const typeObj = {
              name: selectedDoc.document_type,
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
            )) : null;
          })()}
        </div>
        <div className="flex justify-between border-t border-gray-200/50 pt-2">
          <span>Amount</span>
          <span className="font-bold text-gray-950">{formatPeso(selectedDoc.amount)}</span>
        </div>`;
        
  content = content.replace(replaceTarget, newSection);
  fs.writeFileSync(file, content);
}
