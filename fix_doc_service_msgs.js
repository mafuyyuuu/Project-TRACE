const fs = require('fs');

let svcFile = 'backend/src/services/documents.service.js';
let svcContent = fs.readFileSync(svcFile, 'utf8');

// Add model require
svcContent = svcContent.replace(
  "const documentModel = require('../models/document.model');",
  "const documentModel = require('../models/document.model');\nconst documentMessageModel = require('../models/documentMessage.model');"
);

const svcCode = `
async function getMessages(user, documentId) {
  const docs = await documentModel.findById(documentId);
  if (docs.length === 0) throw notFound('Document not found.');
  const doc = docs[0];

  if (user.role === 'student' && doc.student_id !== user.student_id) {
    throw forbidden('You can only view your own messages.');
  }

  await documentMessageModel.markAsRead(documentId, user.id);
  return await documentMessageModel.findByDocumentId(documentId);
}

async function sendMessage(user, documentId, { message }) {
  if (!message || message.trim() === '') {
    throw badRequest('Message cannot be empty.');
  }

  const connection = await pool.getConnection();
  let doc;
  let inserted;

  try {
    await connection.beginTransaction();

    const docs = await documentModel.findByIdForUpdate(documentId, connection);
    if (docs.length === 0) throw notFound('Document not found.');
    doc = docs[0];

    if (user.role === 'student' && doc.student_id !== user.student_id) {
      throw forbidden('You can only message about your own requests.');
    }

    const [res] = await documentMessageModel.insert(documentId, user.id, message, connection);
    inserted = res.insertId;

    // We do NOT add a stepLog here because chat messages are separate from the audit trail of status changes.

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }

  // Trigger Notification
  if (user.role === 'student') {
    // Notify the assigned clerk if any, else notify the relevant desk based on status
    if (doc.assigned_clerk_id) {
      await notifyInApp(doc.assigned_clerk_id, {
        title: 'New Message',
        message: \`Student \${doc.student_name} sent a message regarding \${doc.document_type}.\`,
        link_url: \`/dashboard\`
      });
    }
  } else {
    // Staff to student
    await notifyStudent(doc.student_id, {
      title: 'New Message from Registrar',
      message: \`\${user.full_name} sent a message regarding your \${doc.document_type}.\`,
      link_url: \`/dashboard\`
    });
  }

  return { message: 'Message sent successfully.' };
}
`;

svcContent = svcContent.replace("module.exports = {", svcCode.trim() + "\n\nmodule.exports = {");
svcContent = svcContent.replace("module.exports = {", "module.exports = {\n  getMessages,\n  sendMessage,");

fs.writeFileSync(svcFile, svcContent);
