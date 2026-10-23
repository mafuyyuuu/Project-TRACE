/** One-off DBA operation. Plan by default; never invoked by the API server. */
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
function candidates(source = process.env) {
  const api = { user: source.TRACE_API_DB_USER, password: source.TRACE_API_DB_PASSWORD };
  const ai = { user: source.AI_DB_USER, password: source.AI_DB_PASSWORD };
  if (![api.user, ai.user].every(name => /^[a-z][a-z0-9_]{2,31}$/.test(name || '') && name !== 'root') || api.user === ai.user) throw new Error('Choose two distinct runtime account names.');
  if (![api.password, ai.password].every(value => typeof value === 'string' && value.length >= 32) || api.password === ai.password || !/^[a-zA-Z0-9_]+$/.test(env.DB_NAME)) throw new Error('Use distinct strong passwords and a simple database name.');
  return { api, ai };
}
async function run(mode) {
  const { api, ai } = candidates();
  if (!['--apply', '--verify'].includes(mode)) { console.log('Plan: create a new API CRUD account and a separate AI account reading documents and step_logs only. Existing accounts are never altered. Use --apply, then --verify.'); return; }
  if (mode === '--verify') {
    const connection = await mysql.createConnection({ host: env.DB_HOST, port: env.DB_PORT, database: env.DB_NAME, user: api.user, password: api.password });
    try { await connection.query('SELECT 1'); } finally { await connection.end(); }
    const reader = await mysql.createConnection({ host: env.DB_HOST, port: env.DB_PORT, database: env.DB_NAME, user: ai.user, password: ai.password });
    try { await reader.query('SELECT id FROM documents LIMIT 0'); await reader.query('SELECT id FROM step_logs LIMIT 0'); } finally { await reader.end(); }
    console.log('Both runtime accounts connected successfully.'); return;
  }
  const connection = await mysql.createConnection({ host: env.DB_HOST, port: env.DB_PORT, database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD, multipleStatements: false });
  try {
    // CREATE USER deliberately fails if a named account already exists; never overwrite it.
    for (const account of [api, ai]) await connection.query('CREATE USER ?@? IDENTIFIED BY ?', [account.user, '%', account.password]);
    await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${env.DB_NAME}\`.* TO ?@?`, [api.user, '%']);
    for (const table of ['documents', 'step_logs']) await connection.query(`GRANT SELECT ON \`${env.DB_NAME}\`.\`${table}\` TO ?@?`, [ai.user, '%']);
    console.log('Runtime users created. Verify access before activating.');
  } finally { await connection.end(); }
}
if (require.main === module) run(process.argv[2]).catch(() => { console.error('Runtime account operation failed. Inspect permissions/account existence privately; DDL can have partially succeeded. Do not rerun blindly.'); process.exitCode = 1; });
module.exports = { candidates, run };
