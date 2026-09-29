const fs = require('fs');
let file = 'backend/src/services/documents.service.js';
let content = fs.readFileSync(file, 'utf8');

const targetMsg = /\`Your payment for \$\{doc\.document_type\} has been verified\. Your document is being prepared for release at Window 1\.\`/;
const replaceMsg = "officialReceiptPath\n          ? (new Date().getHours() >= 16 \n             ? `Your payment for ${doc.document_type} has been verified. Your digital Official Receipt will be generated and uploaded by tomorrow.`\n             : `Your payment for ${doc.document_type} has been verified. Your digital Official Receipt is now available in your dashboard.`)\n          : `Your payment for ${doc.document_type} has been verified. Your document is being prepared for release at Window 1.`";

content = content.replace(targetMsg, replaceMsg);

fs.writeFileSync(file, content);
