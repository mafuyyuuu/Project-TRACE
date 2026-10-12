const { pool } = require('../src/config/db');
const statement=`CREATE TABLE IF NOT EXISTS password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY, user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE, expires_at DATETIME NOT NULL,
  used_at DATETIME NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX password_reset_user (user_id,used_at,expires_at)
) ENGINE=InnoDB`;
async function migrate(executor=pool) {await executor.query(statement);}
if(require.main===module)migrate().then(()=>console.log('Password reset schema migration complete. Existing tokens preserved.')).catch(()=>{console.error('Password reset schema migration failed.');process.exitCode=1;}).finally(()=>pool.end());
module.exports={migrate,statement};
