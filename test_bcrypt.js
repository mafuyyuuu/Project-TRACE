const bcrypt = require('bcryptjs');
const service = require('./backend/src/services/auth.service');
const userModel = require('./backend/src/models/user.model');
async function test() {
  const hash = await bcrypt.hash('Trace2024!', 10);
  userModel.getLoginSecurity = async () => [{ id: 1, failed_login_attempts: 0, locked_until: null }];
  userModel.findActiveByStudentId = async () => [{
    id: 3, student_id: 'STU-001', role: 'student', verification_status: 'pending', password_hash: hash
  }];
  userModel.incrementFailedLogin = async () => true;
  try {
    await service.login({ employee_id: 'STU-001', password: 'Trace2024!' });
  } catch (err) {
    console.log(err.status, err.message);
  }
}
test();
