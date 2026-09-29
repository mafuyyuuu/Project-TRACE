const fs = require('fs');
let file = 'backend/src/services/documents.service.js';
let content = fs.readFileSync(file, 'utf8');

// Replace triggerNotification with notifyInApp
content = content.replace(
  "await notifications.triggerNotification(\n    doc.student_id,\n    'Official Receipt Uploaded',\n    `Your Official Receipt for request #${doc.tracking_number || doc.id} has been uploaded and is available to view in your dashboard.`,\n    'student'\n  );",
  "const students = await userModel.findStudentContactByStudentId(doc.student_id);\n  if (students.length > 0) {\n    await notifications.notifyInApp({\n      userId: students[0].id,\n      title: 'Official Receipt Uploaded',\n      message: `Your Official Receipt for request #${doc.tracking_number || doc.id} has been uploaded and is available to view in your dashboard.`,\n      type: 'success',\n    });\n  }"
);

fs.writeFileSync(file, content);
