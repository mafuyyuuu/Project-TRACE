const fs = require('fs');
let file = 'frontend/src/features/secretary/useSecretaryDashboard.js';
let content = fs.readFileSync(file, 'utf8');

const effect = `
  // Automatically calculate price based on pages typed (CN-08)
  useEffect(() => {
    if (activeModal === 'price' && selectedDoc && pricePageCount) {
      const pages = parseInt(pricePageCount, 10) || 0;
      const base = parseFloat(selectedDoc.base_fee) || 0;
      if (pages > 0 && base > 0) {
        setPriceAmount((pages * base).toFixed(2));
      } else {
        setPriceAmount('');
      }
    }
  }, [pricePageCount, selectedDoc, activeModal]);
`;

content = content.replace(
  "  const [handoffToConfirm, setHandoffToConfirm] = useState(null);",
  "  const [handoffToConfirm, setHandoffToConfirm] = useState(null);\n" + effect
);

fs.writeFileSync(file, content);
