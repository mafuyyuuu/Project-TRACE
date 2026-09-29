const fs = require('fs');

let authFile = 'backend/src/services/auth.service.js';
let authContent = fs.readFileSync(authFile, 'utf8');

authContent = authContent.replace(
  "const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [decoded.id]);\n  if (!rows || rows.length === 0) throw notFound('User not found.');\n  const user = rows[0];",
  "const user = await userModel.findById(decoded.id);\n  if (!user) throw notFound('User not found.');"
);

authContent = authContent.replace(
  "const [rows] = await pool.query('SELECT pending_email, email_otp, email_otp_expires FROM users WHERE id = ?', [userId]);\n  if (!rows || rows.length === 0) throw notFound('User not found.');\n  \n  const user = rows[0];",
  "const user = await userModel.findById(userId);\n  if (!user) throw notFound('User not found.');"
);

fs.writeFileSync(authFile, authContent);
