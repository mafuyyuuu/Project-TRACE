/**
 * Test environment bootstrap.
 *
 * `src/config/env.js` throws when JWT_SECRET or WEBHOOK_SECRET are missing, and
 * `src/config/db.js` builds a MySQL pool at import time. Setting dummy values
 * here lets the whole service layer be imported without a real `.env` and
 * without ever opening a database connection (mysql2 pools connect lazily, and
 * every test mocks the models).
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-not-a-real-key';
process.env.WEBHOOK_SECRET = 'test-webhook-secret-not-a-real-key';
process.env.UNISMS_SECRET_KEY = 'test-unisms-key';
process.env.UNISMS_SENDER_ID = 'TRACE';
process.env.TEST_PHONE_NUMBER = '';
// Deliberately left unset: tests assert the "email not configured" path, which
// is also the real default until SMTP credentials are supplied.
process.env.SMTP_HOST = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'trace_test';
process.env.AI_ENGINE_URL = 'http://127.0.0.1:59999';
process.env.N8N_URL = 'http://127.0.0.1:59998';
