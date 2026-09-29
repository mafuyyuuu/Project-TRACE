const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "  await passwordResetModel.invalidateAllForUser(reset.user_id);",
  "  await passwordResetModel.invalidateAllForUser(reset.user_id);\n\n  const uRows = await userModel.findById(reset.user_id);\n  if (uRows.length > 0 && uRows[0].email && notifications.notifyByEmail) {\n    await notifications.notifyByEmail({\n      email: uRows[0].email,\n      title: 'Password Reset Successful',\n      message: 'Your Project TRACE password has been successfully reset. If this was not you, please contact the administrator immediately.'\n    });\n  }"
);

fs.writeFileSync(file, content);
