const { login } = require('./backend/src/services/auth.service');
const bcrypt = require('bcryptjs');

async function test() {
  const hash = await bcrypt.hash('Trace2024!', 10);
  const mockUser = {
    id: 3, student_id: 'STU-001', role: 'student', verification_status: 'verified', password_hash: hash
  };
  
  // mock user model
  const userModel = require('./backend/src/models/user.model');
  userModel.getLoginSecurity = async () => [{ id: 1, failed_login_attempts: 0, locked_until: null }];
  userModel.findActiveByStudentId = async () => [mockUser];
  
  try {
    const res = await login({ employee_id: 'STU-001', password: 'Trace2024!' });
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  }
}
test();
