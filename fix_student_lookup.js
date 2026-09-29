const fs = require('fs');

let svcFile = 'backend/src/services/documents.service.js';
let svcContent = fs.readFileSync(svcFile, 'utf8');

const regex1 = /if \(user\.role === 'student' && doc\.student_id !== user\.student_id\) \{\s*throw forbidden\('You can only view your own messages\.'\);\s*\}/;
const replace1 = `if (user.role === 'student') {
    const owner = await userModel.findStudentIdById(user.id);
    if (!owner[0] || doc.student_id !== owner[0].student_id) {
      throw forbidden('You can only view your own messages.');
    }
  }`;

svcContent = svcContent.replace(regex1, replace1);

const regex2 = /if \(user\.role === 'student' && doc\.student_id !== user\.student_id\) \{\s*throw forbidden\('You can only message about your own requests\.'\);\s*\}/;
const replace2 = `if (user.role === 'student') {
      const owner = await userModel.findStudentIdById(user.id, connection);
      if (!owner[0] || doc.student_id !== owner[0].student_id) {
        throw forbidden('You can only message about your own requests.');
      }
    }`;

svcContent = svcContent.replace(regex2, replace2);
fs.writeFileSync(svcFile, svcContent);
