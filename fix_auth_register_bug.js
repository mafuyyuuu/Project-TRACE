const fs = require('fs');
let file = 'backend/src/services/auth.service.js';
let content = fs.readFileSync(file, 'utf8');

const badRegisterBlock = `
  validatePassword(password);
  await checkPasswordHistory(reset.user_id, password);
  const password_hash = await bcrypt.hash(password, 10);
  await userModel.addPasswordHistory(reset.user_id, password_hash);
`;

const correctRegisterBlock = `
  validatePassword(password);
  const password_hash = await bcrypt.hash(password, 10);
`;

// It occurs in register!
content = content.replace(badRegisterBlock, correctRegisterBlock);

fs.writeFileSync(file, content);
