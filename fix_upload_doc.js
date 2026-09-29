const fs = require('fs');

let file = 'backend/src/services/documents.service.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Add countByTypeAndStudent to document.model.js
let modelFile = 'backend/src/models/document.model.js';
let modelContent = fs.readFileSync(modelFile, 'utf8');

const query = `
function countByTypeAndStudent(documentType, studentId, executor = pool) {
  return executor.query('SELECT COUNT(*) as count FROM documents WHERE document_type = ? AND student_id = ?', [documentType, studentId]).then(([rows]) => rows[0].count);
}
`;

modelContent = modelContent.replace("function findById(documentId", query + "\nfunction findById(documentId");
modelContent = modelContent.replace("  insert,", "  insert,\n  countByTypeAndStudent,");
fs.writeFileSync(modelFile, modelContent);


// 2. Modify uploadDocument
const oldLoop = `
    for (const [index, item] of priced.entries()) {
      const trackingNumber = generateTrackingNumber();
      const attachment = fileForItem(fileList, index);

      const [docResult] = await documentModel.insert(
        {
          tracking_number: trackingNumber,
          request_group_id: requestGroupId,
          student_id,
          student_name,
          document_type: item.document_type,
          current_status: STATUS.PENDING_W1_INTAKE,
          payment_status: 'UNPAID',
          // Nobody owns it yet. n8n picks the desk after Window 1 has checked
          // the paperwork; until then it belongs to the shared intake queue.
          assigned_clerk_id: null,
          file_path: attachment ? attachment.path : null,
          original_filename: attachment ? attachment.originalname : null,
          checkout_url: \`https://pm.link/mock/\${trackingNumber}\`,
          purpose: requested[index].purpose ?? body.purpose ?? null,
          copies: item.copies,
          amount: item.amount,
        },
        connection
      );
`;

const newLoop = `
    // Determine if the student is an alumni for sequence offset
    let isAlumni = false;
    const [targetStudentRows] = await connection.query('SELECT user_type FROM users WHERE student_id = ? LIMIT 1', [student_id]);
    if (targetStudentRows.length > 0 && targetStudentRows[0].user_type === 'alumni') {
      isAlumni = true;
    }

    for (const [index, item] of priced.entries()) {
      const trackingNumber = generateTrackingNumber();
      const attachment = fileForItem(fileList, index);

      const previousCount = await documentModel.countByTypeAndStudent(item.document_type, student_id, connection);
      const sequenceNumberStr = \`\${item.document_type} – Request No. \${previousCount + (isAlumni ? 2 : 1)}\`;

      const [docResult] = await documentModel.insert(
        {
          tracking_number: trackingNumber,
          request_group_id: requestGroupId,
          student_id,
          student_name,
          document_type: item.document_type,
          current_status: STATUS.PENDING_W1_INTAKE,
          payment_status: 'UNPAID',
          // Nobody owns it yet. n8n picks the desk after Window 1 has checked
          // the paperwork; until then it belongs to the shared intake queue.
          assigned_clerk_id: null,
          file_path: attachment ? attachment.path : null,
          original_filename: attachment ? attachment.originalname : null,
          checkout_url: \`https://pm.link/mock/\${trackingNumber}\`,
          purpose: requested[index].purpose ?? body.purpose ?? null,
          copies: item.copies,
          amount: item.amount,
          document_sequence_number: sequenceNumberStr,
        },
        connection
      );
`;

content = content.replace(oldLoop.trim(), newLoop.trim());
fs.writeFileSync(file, content);

// 3. We also need to update documentModel.insert to handle document_sequence_number!
let modelContent2 = fs.readFileSync(modelFile, 'utf8');
modelContent2 = modelContent2.replace(
  "checkout_url, purpose, copies, amount,\n  } = data;",
  "checkout_url, purpose, copies, amount, document_sequence_number,\n  } = data;"
);
modelContent2 = modelContent2.replace(
  "current_status, payment_status, assigned_clerk_id, file_path, original_filename, checkout_url, purpose, copies, amount)",
  "current_status, payment_status, assigned_clerk_id, file_path, original_filename, checkout_url, purpose, copies, amount, document_sequence_number)"
);
modelContent2 = modelContent2.replace(
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
modelContent2 = modelContent2.replace(
  "checkout_url, purpose || null, copies, amount,",
  "checkout_url, purpose || null, copies, amount, document_sequence_number || null,"
);
fs.writeFileSync(modelFile, modelContent2);
