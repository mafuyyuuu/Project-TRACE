const {pool}=require('../src/config/db');
const SQL=`CREATE TABLE IF NOT EXISTS manual_faq_events (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 user_id INT NOT NULL,
 question_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 question VARCHAR(255) NOT NULL,
 action ENUM('view','helpful','not_helpful') NOT NULL,
 suggestion VARCHAR(2000) NULL,
 client_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 payload_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 created_at_ms BIGINT UNSIGNED NOT NULL,
 UNIQUE KEY manual_faq_retry(user_id,client_key),
 INDEX manual_faq_period(created_at_ms,id),
 INDEX manual_faq_user_question(user_id,question_hash,id),
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;
async function migrate(executor=pool){await executor.query(SQL);}
if(require.main===module)migrate().then(()=>console.log('Manual FAQ feedback migration complete.')).catch(()=>{console.error('Manual FAQ feedback migration failed.');process.exitCode=1;}).finally(()=>pool.end());
module.exports={migrate,SQL};
