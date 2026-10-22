const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const { pool } = require('../../config/db');
const sessions = require('../../models/session.model');
const service = require('../../services/documents.service');
const { publicError, logError } = require('../../utils/httpError');
const errorHandler = require('../errorHandler.middleware');
const apiSecurity = require('../apiSecurity.middleware');
const app = require('../../app');

async function request(target, path, options = {}) {
  const server = http.createServer(target);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}${path}`, options);
    const body = res.headers.get('content-type')?.includes('application/json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, headers: res.headers, body };
  } finally { await new Promise(resolve => server.close(resolve)); }
}
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(pool, 'query').mockResolvedValue([[{ is_active: 1, token_version: 0 }]]);
  vi.spyOn(sessions, 'revoked').mockResolvedValue(false);
});

it('protects readiness and unauthorized responses from caching and adds an independent request ID', async () => {
  const a = await request(app, '/api/health');
  const b = await request(app, '/api/documents');
  expect(a.status).toBe(200); expect(b.status).toBe(401);
  for (const res of [a, b]) {
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-request-id')).toMatch(/^[a-f0-9-]{36}$/);
    expect(res.headers.has('x-powered-by')).toBe(false);
  }
  expect(a.headers.get('x-request-id')).not.toBe(b.headers.get('x-request-id'));
});

it('keeps failed readiness meaningful without exposing database credentials or SQL', async () => {
  pool.query.mockRejectedValue(Object.assign(new Error('SQL password=fake-secret host=private.example.test'), { code: 'ER_ACCESS_DENIED_ERROR' }));
  const res = await request(app, '/api/health');
  expect(res.status).toBe(503);
  expect(res.body).toMatchObject({ status: 'degraded', database: 'unavailable' });
  expect(JSON.stringify(res.body)).not.toContain('fake-secret');
  expect(JSON.stringify(console.error.mock.calls)).not.toContain('fake-secret');
  expect(JSON.stringify(console.error.mock.calls)).toContain(res.headers.get('x-request-id'));
});

it('handles malformed JSON safely before routing and preserves private headers', async () => {
  const res = await request(app, '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"private":"fake-secret"' });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Request body must contain valid JSON.');
  expect(res.headers.get('cache-control')).toBe('private, no-store');
  expect(JSON.stringify(console.error.mock.calls)).not.toContain('fake-secret');
});

it.each(['student', 'clerk'])('denies %s Admin insight access before analysis runs', async role => {
  vi.spyOn(service, 'getInsights').mockResolvedValue({ insights: [] });
  const token = jwt.sign({ id: 3, role, token_version: 0 }, require('../../config/env').JWT_SECRET, { expiresIn: '5m' });
  const res = await request(app, '/api/documents/stats/insights', { headers: { authorization: `Bearer ${token}` } });
  expect(res.status).toBe(403);
  expect(service.getInsights).not.toHaveBeenCalled();
});

it('masks explicit server-status errors while retaining safe client validation', async () => {
  const target = express(); target.use(apiSecurity);
  target.get('/', () => { throw Object.assign(new Error('SQL fake-secret'), { status: 503 }); });
  target.use(errorHandler);
  expect(await request(target, '/')).toMatchObject({ status: 503, body: { error: 'Internal server error.' } });
  expect(publicError({ status: 400, message: 'Choose a valid account.' })).toEqual({ status: 400, message: 'Choose a valid account.' });
  for (const status of [200, 999, '500', NaN]) expect(publicError({ status, message: 'fake-secret' })).toEqual({ status: 500, message: 'Internal server error.' });
});

it('logs correlation and an error code without serializing an error object or request data', () => {
  const error = Object.assign(new Error('fake-secret'), { code: 'ER_BAD_FIELD_ERROR', sql: 'private SQL', parameters: ['private'] });
  logError('Request failed', error, 'correlation-123');
  const result = JSON.parse(console.error.mock.calls[0][0]);
  expect(result).toEqual({ event: 'Request failed', status: 500, code: 'ER_BAD_FIELD_ERROR', request_id: 'correlation-123' });
  expect(JSON.stringify(result)).not.toContain('fake-secret');
});

it('denies another student tracking-history access before loading its event rows', async () => {
  const documents = require('../../models/document.model');
  const users = require('../../models/user.model');
  const logs = require('../../models/stepLog.model');
  vi.spyOn(documents, 'findByTrackingNumber').mockResolvedValue([{ id: 9, student_id: 'STUDENT-B', current_status: 'SEC_PROCESSING' }]);
  vi.spyOn(users, 'findStudentIdById').mockResolvedValue([{ student_id: 'STUDENT-A' }]);
  vi.spyOn(logs, 'findByDocumentId').mockResolvedValue([]);
  const token = jwt.sign({ id: 3, role: 'student', token_version: 0 }, require('../../config/env').JWT_SECRET, { expiresIn: '5m' });
  const res = await request(app, '/api/documents/TRC-SYNTHETIC', { headers: { authorization: `Bearer ${token}` } });
  expect(res.status).toBe(403);
  expect(logs.findByDocumentId).not.toHaveBeenCalled();
});

it('keeps a successful authorized file response private when sendFile sets its headers', async () => {
  const fs = require('fs/promises');
  const path = require('path');
  const directory = await fs.mkdtemp(path.join(require('os').tmpdir(), 'trace-security-'));
  const file = path.join(directory, 'preview.png');
  await fs.writeFile(file, 'synthetic image bytes');
  vi.spyOn(require('../../services/files.service'), 'getFilePathForUser').mockResolvedValue(file);
  vi.spyOn(require('../../models/supportTicket.model'), 'fileOwner').mockResolvedValue(undefined);
  const token = jwt.sign({ id: 3, role: 'admin', token_version: 0 }, require('../../config/env').JWT_SECRET, { expiresIn: '5m' });
  try {
    const res = await request(app, '/api/files/preview.png', { headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.body.toString()).toBe('synthetic image bytes');
  } finally { await fs.rm(directory, { recursive: true }); }
});
