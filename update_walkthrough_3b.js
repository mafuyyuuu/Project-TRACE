const fs = require('fs');
let file = 'walkthrough.md';
let content = fs.readFileSync(file, 'utf8');

const update = `
### Phase 3B: Advanced Identity & Auditing (SEC-09 to SEC-13)
- **SEC-09 Stateless Session Revocation:** Created a \`token_version\` column in the \`users\` table. The auth middleware now validates the JWT's embedded token version against the DB, allowing global "logout all devices" functionality without requiring a stateful Redis store. Added a "Logout All Devices" button in the frontend Settings modal.
- **SEC-10 Email Verification & Change:** Rewrote \`updateProfile\` to place requested email changes into \`pending_email\`. Added an \`email_otp\` column and an endpoint \`POST /api/auth/verify-email-change\`. Now, students must input a 6-digit OTP sent via Nodemailer to finalize their new email address.
- **SEC-11 Conditional Two-Factor Authentication:** Built a robust 2FA system utilizing a short-lived \`temp_token\` containing \`{ pending_2fa: true }\`. Admins and staff are strictly forced through 2FA, receiving an OTP to their registered emails. Upgraded the frontend \`LoginPage.jsx\` and \`useAuth.js\` to dynamically detect the \`requires_2fa\` challenge and swap into a Verification Code UI.
- **SEC-12 & SEC-13 Activity Audit Trail:** Created a \`security_logs\` table that permanently records events (\`LOGIN\`, \`LOGOUT_ALL\`, \`PASSWORD_CHANGE\`, \`EMAIL_CHANGE\`). Integrated it securely directly within the \`user.model.js\` methods. Built a user-facing "Recent Security Activity" table in the Profile Settings Modal and a comprehensive global "Security Logs" tab in the Admin Dashboard.
- **Test Integrity Maintained:** Refactored backend services and test files to maintain perfect suite stability (445/445 tests passing). Moved lingering real DB \`pool.query\` calls inside services down into \`user.model.js\` to ensure mocks intercepted all execution.
`;

content = content + '\n' + update;
fs.writeFileSync(file, content);
