const fs = require('fs');
let file = 'frontend/src/services/documentsService.js';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('uploadDeferredOR')) {
  const uploadFunc = `
export async function uploadDeferredOR(documentId, file) {
  const formData = new FormData();
  formData.append('officialReceipt', file);
  const response = await api.post(\`/documents/\${documentId}/deferred-or\`, formData);
  return response.data;
}
`;
  content = content + '\n' + uploadFunc;
  fs.writeFileSync(file, content);
}
