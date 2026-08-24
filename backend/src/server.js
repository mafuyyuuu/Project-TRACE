const http = require('http');
const app = require('./app');
const env = require('./config/env');
const { testConnection } = require('./config/db');
const notifications = require('./services/notification.service');
const realtime = require('./realtime');

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

  // Report which notification channels are actually usable, so a missing
  // credential is obvious now rather than when a student doesn't get an alert.
  try {
    await notifications.logChannelStatus();
  } catch (err) {
    console.warn('⚠️  Could not verify notification channels:', err.message);
  }

  // Socket.IO shares the HTTP server, so realtime needs no extra port and
  // rides through the same Vite proxy in development.
  const server = http.createServer(app);
  realtime.init(server);

  server.listen(env.PORT, () => {
    console.log(`🚀 TRACE Backend API listening on http://localhost:${env.PORT}`);
  });
}

start();
