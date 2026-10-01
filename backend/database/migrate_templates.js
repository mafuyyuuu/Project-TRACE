const { pool } = require('../src/config/db');
const statements = [
  `CREATE TABLE IF NOT EXISTS system_templates (
    id INT AUTO_INCREMENT PRIMARY KEY, template_key VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL, content LONGTEXT NULL,
    font_family VARCHAR(100) DEFAULT 'sans-serif', font_size VARCHAR(20) DEFAULT '12px',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`,
  `INSERT IGNORE INTO system_templates (template_key, name) VALUES
    ('payment_slip', 'Order of Payment (Slip)'), ('email_notice', 'Standard Email Notice')`,
];
async function migrate(executor = pool) {
  for (const sql of statements) await executor.query(sql);
}
if (require.main === module) migrate().then(() => console.log('Templates migration complete. Existing layouts preserved.')).catch(() => {
  console.error('Templates migration failed. Check database permissions and existing table definition.'); process.exitCode = 1;
}).finally(() => pool.end());
module.exports = { migrate, statements };
