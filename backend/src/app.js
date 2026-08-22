require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const documentRoutes = require('./routes/documents.routes');
const paymentRoutes = require('./routes/payments.routes');
const fileRoutes = require('./routes/files.routes');
const errorHandler = require('./middlewares/errorHandler.middleware');
const { apiLimiter } = require('./middlewares/rateLimit.middleware');

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
// NOTE: uploaded files are deliberately NOT served by express.static. They
// contain student ID photos and payment receipts, so they go through
// /api/files, which authenticates the caller and checks ownership.
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/files', fileRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TRACE Backend API',
    timestamp: new Date().toISOString(),
  });
});

// Must be registered last.
app.use(errorHandler);

module.exports = app;
