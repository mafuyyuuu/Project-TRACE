const fs = require('fs');
const file = 'frontend/src/features/secretary/useSecretaryDashboard.js';
let content = fs.readFileSync(file, 'utf8');

const target = `  const [evalStudentName, setEvalStudentName] = useState('');
  const [evalDocType, setEvalDocType] = useState('');
  const [estimatedReadyDate, setEstimatedReadyDate] = useState('');`;

const replacement = `  const [evalStudentName, setEvalStudentName] = useState('');
  const [evalDocType, setEvalDocType] = useState('');
  const [estimatedReadyDate, setEstimatedReadyDate] = useState('');
  const [documentTypes, setDocumentTypes] = useState([]);

  useEffect(() => {
    getDocumentTypes().then(setDocumentTypes).catch(console.error);
  }, []);`;

content = content.replace(target, replacement);

const returnTarget = `return {
    ...core,
    secretaryTabs,
    secretaryActiveTab,
    setSecretaryActiveTab,
    evalStudentId,
    setEvalStudentId,
    evalStudentName,
    setEvalStudentName,
    evalDocType,
    setEvalDocType,
    estimatedReadyDate,
    setEstimatedReadyDate,
    clerkNotes,
    setClerkNotes,
    handleSecretaryEvaluate,
    handleSecretaryPrice,
    handleSecretaryVerifyReceipt,
    handleSecretaryHandoff,
  };`;

const returnReplacement = `return {
    ...core,
    secretaryTabs,
    secretaryActiveTab,
    setSecretaryActiveTab,
    evalStudentId,
    setEvalStudentId,
    evalStudentName,
    setEvalStudentName,
    evalDocType,
    setEvalDocType,
    estimatedReadyDate,
    setEstimatedReadyDate,
    clerkNotes,
    setClerkNotes,
    handleSecretaryEvaluate,
    handleSecretaryPrice,
    handleSecretaryVerifyReceipt,
    handleSecretaryHandoff,
    documentTypes,
  };`;

content = content.replace(returnTarget, returnReplacement);
fs.writeFileSync(file, content);
