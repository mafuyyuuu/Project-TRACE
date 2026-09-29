const fs = require('fs');

let file = 'frontend/src/features/secretary/components/PaymentStubModal.jsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Import api
if (!content.includes("import api from '@/services/api';")) {
  content = "import api from '@/services/api';\n" + content;
}

// 2. Add state for template
content = content.replace(
  "  const [qrSvg, setQrSvg] = useState('');",
  "  const [qrSvg, setQrSvg] = useState('');\n  const [template, setTemplate] = useState('');"
);

// 3. Fetch template
const fetchTemplate = `
  useEffect(() => {
    let mounted = true;
    api.get('/api/templates/payment_slip').then(res => {
      if (mounted) setTemplate(res.data);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);
`;
content = content.replace(
  "  const tracking = selectedDoc?.tracking_number;",
  fetchTemplate.trim() + "\n\n  const tracking = selectedDoc?.tracking_number;"
);

// 4. Generate replaced HTML
const generateHtml = `
  const items = groupDocs?.length ? groupDocs : [selectedDoc];
  const total = items.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  let printHtml = '';
  if (template && template.content) {
    const docList = items.map(d => \`\${d.document_type} (P\${parseFloat(d.amount).toFixed(2)})\`).join(', ');
    printHtml = template.content
      .replace(/{{STUDENT_NAME}}/g, selectedDoc.student_name || '—')
      .replace(/{{STUDENT_ID}}/g, selectedDoc.student_id || '—')
      .replace(/{{DOCUMENT_TYPE}}/g, docList)
      .replace(/{{OR_NUMBER}}/g, tracking)
      .replace(/{{AMOUNT}}/g, formatPeso(total));
  }
`;

content = content.replace(
  "  const items = groupDocs?.length ? groupDocs : [selectedDoc];\n  const total = items.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);",
  generateHtml.trim()
);

// 5. Render custom template if it exists, otherwise fallback
const customRender = `
      {printHtml ? (
        <div 
          className="print-slip" 
          style={{ fontFamily: template.font_family, fontSize: template.font_size }}
          dangerouslySetInnerHTML={{ __html: printHtml }} 
        />
      ) : (
        <>
          {/* Slip header */}
`;
content = content.replace(
  "      {/* Slip header */}",
  customRender.trim()
);
content = content.replace(
  "    </ModalShell>",
  "        </>\n      )}\n    </ModalShell>"
);

fs.writeFileSync(file, content);
