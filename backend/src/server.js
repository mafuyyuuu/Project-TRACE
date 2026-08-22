const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/db');

/**
 * Startup. A failed DB connection is logged but not fatal — the server still
 * boots so the health check and static routes stay reachable.
 */
async function start() {
  try {
    await testConnection();
  } catch (err) {
    console.warn('⚠️  Could not connect to database. Server will start anyway.');
  }

  app.listen(env.PORT, () => {
    console.log(`🚀 TRACE Backend API listening on http://localhost:${env.PORT}`);
  });
}

start();
