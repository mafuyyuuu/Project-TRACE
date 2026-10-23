const {pool}=require('../src/config/db');
async function migrate(executor=pool) {
  const [rows]=await executor.query("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='documents' AND COLUMN_NAME='release_working_days'");
  if(!rows.length) await executor.query('ALTER TABLE documents ADD COLUMN release_working_days TINYINT UNSIGNED NULL');
  // No historical dates or finalized amounts are rewritten.
}
if(require.main===module)migrate().then(()=>console.log('Release policy migration complete.')).catch(()=>{console.error('Release policy migration failed.');process.exitCode=1;}).finally(()=>pool.end());
module.exports={migrate};
