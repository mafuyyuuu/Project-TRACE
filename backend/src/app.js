require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/documents.routes');
const fileRoutes = require('./routes/files.routes');
const referenceRoutes = require('./routes/referenceData.routes');
const gradApplicationRoutes = require('./routes/gradApplication.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const reportRoutes = require('./routes/reports.routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const env = require('./config/env');
const { corsOrigin } = require('./config/cors');
const { pool } = require('./config/db');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
// Behind a reverse proxy (Caddy, a load balancer) every request otherwise
// carries the proxy's IP, which collapses the IP-keyed rate limiters into a
// single shared bucket and makes loginLimiter far weaker than it looks.
// A hop count rather than `true`, so X-Forwarded-For cannot be spoofed.
if (env.TRUST_PROXY > 0) {
  app.set('trust proxy', env.TRUST_PROXY);
}

app.use(cors({ origin: corsOrigin(), credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Deliberately above the rate limiter: an orchestrator polling readiness must
// never be throttled into reporting a healthy container as unhealthy.
app.get('/api/health', async (req, res) => {
  const body = {
    status: 'ok',
    service: 'TRACE Backend API',
    database: 'ok',
    timestamp: new Date().toISOString(),
  };

  // The server deliberately boots without a database (see server.js), so
  // liveness alone would report a completely unusable container as healthy.
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    return res.status(503).json({ ...body, status: 'degraded', database: err.message });
  }

  res.json(body);
});

app.use('/api', apiLimiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// NOTE: uploaded files are deliberately NOT served by express.static. They
// contain student ID photos and payment receipts, so they go through
// /api/files, which authenticates the caller and checks ownership.
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/grad-applications', gradApplicationRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);

// Must be registered last.
app.use(errorHandler);

module.exports = app;
