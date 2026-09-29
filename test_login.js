const { login } = require('./backend/src/services/auth.service');
const userModel = require('./backend/src/models/user.model');
const bcrypt = require('bcryptjs');

async function test() {
  const passwordHash = await bcrypt.hash('Trace2024!', 10);
  userModel.getLoginSecurity = async () => [{ id: 1, failed_login_attempts: 0, locked_until: null }];
  userModel.findActiveByStudentId = async () => [{
    id: 3,
    student_id: 'STU-001',
    full_name: 'Ana Reyes',
    role: 'student',
    verification_status: 'verified',
    password_hash: passwordHash,
  }];
  userModel.resetLoginSecurity = async () => true;

  try {
    const res = await login({ employee_id: 'STU-001', password: 'Trace2024!' });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
