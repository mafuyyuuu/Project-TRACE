const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trace_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
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

module.exports = { pool, testConnection };
