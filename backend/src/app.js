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
const templateRoutes = require('./routes/templates.routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const env = require('./config/env');
const { corsOrigin } = require('./config/cors');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();
app.disable('x-powered-by');

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

app.use('/api', require('./middlewares/apiSecurity.middleware'));
app.use(cors({ origin: corsOrigin(), credentials: true, exposedHeaders: ['X-Request-Id'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Deliberately above the rate limiter: an orchestrator polling readiness must
// never be throttled into reporting a healthy container as unhealthy.
const operations = require('./services/operations.service');
app.get('/api/health/live', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/health', async (_req, res) => {
  try { await operations.readiness(); res.json({ status: 'ok', service: 'TRACE Backend API', database: 'ok' }); }
  catch (error) {
    require('./utils/httpError').logError('Database readiness failed', error, res.locals.requestId);
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});
app.use('/api', (_req, res, next) => operations.isDraining() ? res.status(503).set('Retry-After', '5').json({ error: 'Service restarting. Please retry.' }) : next());

app.use('/api', apiLimiter);
app.use('/api', require('./middlewares/dataChanges.middleware').dataChanges);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// NOTE: uploaded files are deliberately NOT served by express.static. They
// contain student ID photos and payment receipts, so they go through
// /api/files, which authenticates the caller and checks ownership.
app.use('/api/auth', (_req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
}, authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/grad-applications', gradApplicationRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/support/tickets', require('./routes/supportTicket.routes'));
app.use('/api/internal-assistance', require('./routes/internalAssistance.routes'));
app.use('/api/staff-conversations', require('./routes/staffConversation.routes'));
app.use('/api/support', require('./routes/support.routes'));

// Must be registered last.
app.use(errorHandler);

module.exports = app;
