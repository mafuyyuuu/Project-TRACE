const { pool } = require('../config/db');
async function increment(key, windowMs, executor = pool) {
  const tx = await executor.getConnection();
  try {
    await tx.beginTransaction();
    await tx.query(`INSERT INTO rate_limit_counters (bucket_key, hits, reset_at_ms)
      VALUES (?, 1, FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) + ?)
      ON DUPLICATE KEY UPDATE
        hits = IF(reset_at_ms <= FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000), 1, hits + 1),
        reset_at_ms = IF(reset_at_ms <= FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000), FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) + ?, reset_at_ms)`, [key, windowMs, windowMs]);
    const [[row]] = await tx.query('SELECT hits, reset_at_ms FROM rate_limit_counters WHERE bucket_key = ? FOR UPDATE', [key]);
    await tx.commit();
    return { totalHits: Number(row.hits), resetTime: new Date(Number(row.reset_at_ms)) };
  } catch (error) { await tx.rollback(); throw error; }
  finally { tx.release(); }
}
function decrement(key) { return pool.query('UPDATE rate_limit_counters SET hits = GREATEST(1, hits) - 1 WHERE bucket_key = ? AND reset_at_ms > FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000)', [key]); }
function resetKey(key) { return pool.query('DELETE FROM rate_limit_counters WHERE bucket_key = ?', [key]); }
function prune() { return pool.query('DELETE FROM rate_limit_counters WHERE reset_at_ms <= FLOOR(UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3))*1000) LIMIT 10000'); }
module.exports = { increment, decrement, resetKey, prune };
