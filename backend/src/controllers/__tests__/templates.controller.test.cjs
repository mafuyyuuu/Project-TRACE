const jwt = require('jsonwebtoken');
const templateModel = require('../../models/template.model');
const { pool } = require('../../config/db');
const { JWT_SECRET } = require('../../config/env');

const template = { template_key: 'payment_slip', content: '<p>Slip</p>' };
const draft = { content: '<p>Updated</p>', font_family: 'Arial', font_size: 12 };

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(pool, 'query').mockImplementation(async sql => {
    if (sql.startsWith('SELECT token_hash FROM session_revocations')) return [[]];
    if (sql === 'SELECT token_version, is_active FROM users WHERE id = ?') return [[{ token_version: 0, is_active: 1 }]];
    throw new Error('Unexpected database access');
  });
  vi.spyOn(templateModel, 'list').mockResolvedValue([template]);
  vi.spyOn(templateModel, 'findByKey').mockResolvedValue(template);
  vi.spyOn(templateModel, 'update').mockResolvedValue();
});

function requestRoute(method, path, token) {
  const router = require('../../routes/templates.routes');
  const route = router.stack.find(layer =>
    layer.route?.path === path && layer.route.methods[method.toLowerCase()]
  ).route;

  // Run the registered middleware chain without opening a network port.
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { resolve({ status: this.statusCode, body }); return this; },
    };
    route.dispatch({
      method,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      params: { key: 'payment_slip' },
      body: draft,
    }, res, error => reject(error || new Error('Route completed without responding')));
  });
}

function tokenFor(role) {
  return jwt.sign({ id: 12, role, token_version: 0 }, JWT_SECRET, { expiresIn: '5m' });
}

it('imports the complete Express app without missing modules or database queries', () => {
  const app = require('../../app');
  expect(typeof app).toBe('function');
  expect(pool.query).not.toHaveBeenCalled();
});

it('rejects an unauthenticated template update before writing', async () => {
  expect(await requestRoute('PUT', '/:key')).toEqual({
    status: 401,
    body: { error: 'Access denied. No token provided.' },
  });
  expect(templateModel.update).not.toHaveBeenCalled();
});

it('rejects an invalid token before writing', async () => {
  expect(await requestRoute('PUT', '/:key', 'invalid')).toEqual({
    status: 401,
    body: { error: 'Invalid or expired token.' },
  });
  expect(templateModel.update).not.toHaveBeenCalled();
});

it.each(['student', 'clerk'])('rejects a %s template update before writing', async role => {
  expect(await requestRoute('PUT', '/:key', tokenFor(role))).toEqual({
    status: 403,
    body: { error: 'Insufficient permissions.' },
  });
  expect(templateModel.update).not.toHaveBeenCalled();
});

it('allows an authenticated admin to update with the existing payload and response', async () => {
  expect(await requestRoute('PUT', '/:key', tokenFor('admin'))).toEqual({
    status: 200,
    body: { message: 'Template updated successfully.' },
  });
  expect(templateModel.update).toHaveBeenCalledWith(
    'payment_slip', draft.content, draft.font_family, draft.font_size
  );
});

it('retains authenticated read access and the existing list response', async () => {
  expect(await requestRoute('GET', '/', tokenFor('student'))).toEqual({
    status: 200,
    body: [template],
  });
});

it('retains the missing-template response', async () => {
  templateModel.findByKey.mockResolvedValue(null);
  expect(await requestRoute('GET', '/:key', tokenFor('student'))).toEqual({
    status: 404,
    body: { message: 'Template not found' },
  });
});

it.each([
  ['GET', '/', 'list', 'Failed to fetch templates.'],
  ['GET', '/:key', 'findByKey', 'Failed to fetch template.'],
  ['PUT', '/:key', 'update', 'Failed to update template.'],
])('returns a safe error for %s %s failures', async (method, path, modelMethod, message) => {
  templateModel[modelMethod].mockRejectedValue(new Error('Private SQL detail'));
  expect(await requestRoute(method, path, tokenFor('admin'))).toEqual({
    status: 500,
    body: { error: message },
  });
  expect(console.error).toHaveBeenCalled();
});

it('preserves explicit application-error status and message', async () => {
  templateModel.update.mockRejectedValue(Object.assign(new Error('Template is locked.'), { status: 409 }));
  expect(await requestRoute('PUT', '/:key', tokenFor('admin'))).toEqual({
    status: 409,
    body: { error: 'Template is locked.' },
  });
});
