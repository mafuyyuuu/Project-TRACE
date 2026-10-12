const {pool}=require('../src/config/db');
const statement=`CREATE TABLE IF NOT EXISTS payment_methods (
  id INT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL, provider VARCHAR(50) NOT NULL DEFAULT 'manual',
  instructions TEXT NULL, requires_reference BOOLEAN NOT NULL DEFAULT TRUE,
  reference_label VARCHAR(150) NULL, requires_proof BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE, sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB`;
async function migrate(executor=pool){await executor.query(statement);}
if(require.main===module)migrate().then(()=>console.log('Payment-method schema migration complete. Existing methods preserved; absent catalogs require Admin configuration.')).catch(()=>{console.error('Payment-method schema migration failed.');process.exitCode=1;}).finally(()=>pool.end());
module.exports={migrate,statement};
