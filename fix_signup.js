const fs = require('fs');
const file = 'frontend/src/pages/SignupPage.jsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import api from')) {
  content = content.replace(
    "import { getColleges } from '@/services/referenceService'",
    "import { getColleges } from '@/services/referenceService'\nimport api from '@/services/api'"
  );
}

if (!content.includes('extractingId')) {
  content = content.replace(
    "const [colleges, setColleges] = useState([])",
    "const [colleges, setColleges] = useState([])\n  const [extractingId, setExtractingId] = useState(false)"
  );
}

const fileChangeRegex = /onChange=\{\(e\) => setFile\(e\.target\.files\[0\]\)\}/;
if (content.match(fileChangeRegex)) {
  const replacement = `onChange={async (e) => {
                  const selected = e.target.files[0];
                  setFile(selected);
                  if (selected) {
                    setExtractingId(true);
                    try {
                      const fd = new FormData();
                      fd.append('id_proof', selected);
                      const res = await api.post('/ai/extract-id', fd, { headers: { 'Content-Type': 'multipart/form-data' }});
                      if (res.data?.success) {
                        const extractedId = res.data.student_id || res.data.alumni_id;
                        if (extractedId) {
                          setFormData(prev => ({ ...prev, employeeId: extractedId }));
                        }
                      }
                    } catch (err) {
                      console.warn('OCR extraction failed', err);
                    } finally {
                      setExtractingId(false);
                    }
                  }
                }}`;
  content = content.replace(fileChangeRegex, replacement);
}

// Just add readOnly to the input manually
content = content.replace(
  'id="idNumber"',
  'id="idNumber" readOnly={extractingId}'
);

content = content.replace(
  />Upload Valid ID</g,
  '>Upload Valid ID <span className="text-[10px] text-gray-400 font-normal ml-2 uppercase">(Auto-fills ID)</span><'
);

fs.writeFileSync(file, content);
