const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { pool } = require('../../config/db');
const { authenticate } = require('../auth.middleware');
async function check(claims, account = { token_version: 2, is_active: 1 }, route = {}) {
  vi.spyOn(pool, 'query').mockImplementation(async sql => sql.startsWith('SELECT token_hash') ? [[]] : [[account]]);
  const token = jwt.sign(claims, env.JWT_SECRET, { expiresIn: '1h' });
  const req = { headers: { authorization: `Bearer ${token}` }, ...route };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }; const next = vi.fn();
  await authenticate(req, res, next); return { req, res, next };
}
it.each([
  { id: 3, pending_2fa: true, token_version: 2 },
  { id: 3, pending_2fa: true, role: 'student', token_version: 2 },
  { id: 3, role: 'student' },
  { id: 3, role: 'unknown', token_version: 2 },
])('rejects temporary and malformed tokens: %j', async claims => {
  const result = await check(claims);
  expect(result.next).not.toHaveBeenCalled(); expect(result.res.status).toHaveBeenCalledWith(401);
});

describe('account onboarding gates', () => {
  const claims = { id: 3, role: 'student', token_version: 2 };
  const account = { token_version: 2, is_active: 1, role: 'student', user_type: 'student', email_verified_at: null };
  const request = (path, method = 'POST') => ({ baseUrl: '/api', path, method });
  it.each(['/documents/upload', '/documents/1/pay', '/auth/authenticator/begin'])('blocks an unverified student action at %s', async path => {
    const result = await check(claims, account, request(path));
    expect(result.next).not.toHaveBeenCalled();
    expect(result.res.status).toHaveBeenCalledWith(403);
    expect(result.res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'EMAIL_VERIFICATION_REQUIRED' }));
  });
  it.each([['/auth/me', 'GET'], ['/auth/logout', 'POST'], ['/auth/email-verification/resend', 'POST'], ['/auth/profile', 'PUT'], ['/support/3/messages', 'POST']])('allows account recovery at %s', async (path, method) => {
    expect((await check(claims, account, request(path, method))).next).toHaveBeenCalledOnce();
  });
  it('permits verified students and staff without weakening the alumni gate', async () => {
    expect((await check(claims, { ...account, email_verified_at: '2026-10-01' }, request('/documents/upload'))).next).toHaveBeenCalledOnce();
    expect((await check({ ...claims, role: 'clerk' }, { ...account, role: 'clerk' }, request('/documents/1/payment/verify'))).next).toHaveBeenCalledOnce();
    const alumni = await check(claims, { ...account, user_type: 'alumni', email_verified_at: '2026-10-01', has_grad_application: 0 }, request('/documents', 'GET'));
    expect(alumni.res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'GRAD_APPLICATION_REQUIRED' }));
  });
  it.each(['/grad-applications', '/grad-applications/mine', '/grad-applications/form-fields', '/auth/logout'])('allows alumni graduation or recovery at %s', async path => {
    expect((await check(claims, { ...account, user_type: 'alumni', has_grad_application: 0 }, request(path, path.endsWith('mine') || path.endsWith('form-fields') ? 'GET' : 'POST'))).next).toHaveBeenCalledOnce();
  });
  it('blocks temporary-password accounts from desk actions until password change', async () => {
    const result = await check({ ...claims, role: 'clerk' }, { ...account, role: 'clerk', must_change_password: 1 }, request('/documents/1/evaluate'));
    expect(result.res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PASSWORD_CHANGE_REQUIRED' }));
  });
});
it.each([{ token_version: 3, is_active: 1 }, { token_version: 2, is_active: 0 }])('rejects revoked or inactive sessions', async account => {
  const result = await check({ id: 3, role: 'student', token_version: 2 }, account);
  expect(result.next).not.toHaveBeenCalled();
});
it('passes the authenticated version to factor-change services', async () => {
  const result = await check({ id: 3, role: 'student', token_version: 2 });
  expect(result.req.user.token_version).toBe(2); expect(result.next).toHaveBeenCalledOnce();
});

it('denies a logged-out session while its JWT is otherwise valid', async () => {
  const sessions = require('../../models/session.model');
  vi.spyOn(sessions, 'revoked').mockResolvedValue(true);
  const result = await check({ id: 3, role: 'student', token_version: 2 });
  expect(result.next).not.toHaveBeenCalled(); expect(result.res.status).toHaveBeenCalledWith(401);
});
