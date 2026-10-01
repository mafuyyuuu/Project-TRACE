const { pool } = require('../config/db');
function enroll(userId, executor = pool) {
  return executor.query('INSERT IGNORE INTO onboarding_guides (user_id) VALUES (?)', [userId]);
}
async function claim(userId, executor = pool) {
  // A conditional update allows only one browser to claim the automatic tour.
  const [result] = await executor.query('UPDATE onboarding_guides SET shown_at = CURRENT_TIMESTAMP WHERE user_id = ? AND shown_at IS NULL', [userId]);
  return result.affectedRows === 1;
}
module.exports = { enroll, claim };
