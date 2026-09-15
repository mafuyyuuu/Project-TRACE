const mysql = require('mysql2/promise');
const env = require('./env');

/**
 * TLS for the database connection.
 *
 * Managed MySQL providers generally require it and refuse a plaintext
 * connection, so a deployment that omits this fails at the very first query.
 * Left off by default because a local MySQL has no certificate.
 */
function sslOptions() {
  if (!env.DB_SSL) return undefined;
  // A provider-supplied CA is verified against; otherwise fall back to the
  // system trust store, which covers providers using a public CA.
  return env.DB_SSL_CA
    ? { ca: env.DB_SSL_CA, rejectUnauthorized: true }
    : { rejectUnauthorized: true };
}

const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  ssl: sslOptions(),
  waitForConnections: true,
  connectionLimit: env.DB_POOL_LIMIT,
  // Bounded: with an unlimited queue, a slow database silently accumulates
  // pending requests in memory instead of failing fast.
  queueLimit: 50,
  connectTimeout: 10000,
});

/**
 * Test the database connection by running a simple query.
 * Logs success or failure to the console.
 */
async function testConnection() {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connection established successfully.');
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    throw err;
  }
}

module.exports = { pool, testConnection, sslOptions };
