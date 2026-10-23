/** CI-only real MySQL acceptance. Exact disposable database required. */
const assert = require('assert/strict');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const { pool } = require('../src/config/db');
const counters = require('../src/models/rateLimit.model');
async function main() {
  assert.equal(env.NODE_ENV, 'test'); assert.equal(env.DB_NAME, 'trace_security_test');
  await require('./migrate_rate_limits').migrate();
  const key = 'a'.repeat(64);
  await counters.resetKey(key);
  const results = await Promise.all(Array.from({ length: 64 }, () => counters.increment(key, 60000)));
  assert.deepEqual(results.map(row => row.totalHits).sort((a, b) => a - b), Array.from({ length: 64 }, (_, n) => n + 1));
  await pool.query('UPDATE rate_limit_counters SET reset_at_ms = 1 WHERE bucket_key = ?', [key]);
  assert.equal((await counters.increment(key, 60000)).totalHits, 1);
  await counters.decrement(key); assert.equal((await counters.increment(key, 60000)).totalHits, 1);
  await pool.query('CREATE TABLE documents (id INT PRIMARY KEY)');
  await pool.query('CREATE TABLE step_logs (id INT PRIMARY KEY)');
  await pool.query('CREATE TABLE users (id INT PRIMARY KEY)');
  await require('./provision_runtime_users').run('--apply');
  const db = candidate => mysql.createConnection({ host: env.DB_HOST, port: env.DB_PORT, database: env.DB_NAME, ...candidate });
  const { api, ai } = require('./provision_runtime_users').candidates();
  const writer = await db(api), reader = await db(ai);
  try {
    await writer.query('INSERT INTO documents VALUES (1)'); await reader.query('SELECT id FROM documents');
    await assert.rejects(writer.query('CREATE TABLE forbidden_ddl (id INT)'));
    await assert.rejects(reader.query('INSERT INTO documents VALUES (2)'));
    await assert.rejects(reader.query('SELECT * FROM users'));
  } finally { await writer.end(); await reader.end(); }
  console.log('Atomic shared counters, expiry and least-privilege MySQL accounts passed.');
}
main().catch(error => { console.error('Disposable SQL acceptance failed:', error.code || error.name); process.exitCode = 1; }).finally(() => pool.end());
