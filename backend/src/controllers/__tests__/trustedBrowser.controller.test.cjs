const auth = require('../../services/auth.service');
const recognition = require('../../services/deviceLogin.service');
const trust = require('../../services/trustedBrowser.service');
const controller = require('../auth.controller');
const user = { id: 7, role: 'clerk' };
let req, res;
beforeEach(() => {
  req = { body: {}, user, headers: { cookie: 'trace_mfa_trust=synthetic', 'user-agent': 'Test' }, ip: '127.0.0.1' };
  res = { cookie: vi.fn(), clearCookie: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
  vi.spyOn(recognition, 'recordLogin').mockResolvedValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

it('passes only the actual Cookie header as browser proof and clears it in default shared mode', async () => {
  req.body = { employee_id: 'CLERK001', password: 'test-password', cookie: 'forged-body-cookie' };
  vi.spyOn(auth, 'login').mockResolvedValue({ requires_2fa: true });
  await controller.login(req, res);
  expect(auth.login).toHaveBeenCalledWith(req.body, req.ip, 'Test', req.headers.cookie);
  expect(res.clearCookie).toHaveBeenCalledWith(trust.COOKIE_NAME, trust.COOKIE_OPTIONS);
  expect(res.cookie).not.toHaveBeenCalled();
  expect(recognition.recordLogin).not.toHaveBeenCalled();
});

it('leaves a personal browser cookie available for service validation', async () => {
  req.body.shared_computer = false;
  vi.spyOn(auth, 'login').mockResolvedValue({ requires_2fa: true });
  await controller.login(req, res);
  expect(res.clearCookie).not.toHaveBeenCalled();
});

it('sets trust only from the verified service result and never exposes the secret in JSON', async () => {
  const secret = 'a'.repeat(64);
  const expiresAt = Date.parse('2026-09-30T16:00:00Z');
  req.body = { temp_token: 'challenge', otp: '123456', trust_browser: true };
  vi.spyOn(auth, 'verify2FA').mockResolvedValue({ token: 'session', user, browserTrust: { value: secret, expiresAt } });
  await controller.verify2FA(req, res);
  expect(auth.verify2FA).toHaveBeenCalledWith('challenge', '123456', req.ip, 'Test', true);
  expect(res.cookie).toHaveBeenCalledWith(trust.COOKIE_NAME, secret, {
    ...trust.COOKIE_OPTIONS, httpOnly: true, expires: new Date(expiresAt),
  });
  expect(res.json).toHaveBeenCalledWith({ token: 'session', user, browser_trusted_until: '2026-09-30T16:00:00.000Z' });
  expect(JSON.stringify(res.json.mock.calls)).not.toContain(secret);
  expect(recognition.recordLogin).toHaveBeenCalledOnce();
});

it('cannot fabricate a cookie from a client trust choice when the service issues none', async () => {
  req.body = { trust_browser: true, browserTrust: { value: 'forged', expiresAt: 9999999999999 } };
  vi.spyOn(auth, 'verify2FA').mockResolvedValue({ token: 'session', user });
  await controller.verify2FA(req, res);
  expect(res.cookie).not.toHaveBeenCalled();
});

it('never sets trust when verification fails', async () => {
  req.body.trust_browser = true;
  vi.spyOn(auth, 'verify2FA').mockRejectedValue(Object.assign(new Error('Invalid verification code.'), { status: 401 }));
  await controller.verify2FA(req, res);
  expect(res.cookie).not.toHaveBeenCalled();
  expect(recognition.recordLogin).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(401);
});

it.each(['resetPassword', 'logoutAll', 'updateProfile'])('clears browser trust after successful %s', async action => {
  if (action === 'updateProfile') req.body.password = 'test-password';
  vi.spyOn(auth, action).mockResolvedValue({ message: 'Success' });
  await controller[action](req, res);
  expect(res.clearCookie).toHaveBeenCalledExactlyOnceWith(trust.COOKIE_NAME, trust.COOKIE_OPTIONS);
  expect(res.json).toHaveBeenCalledWith({ message: 'Success' });
});

it.each(['resetPassword', 'logoutAll', 'updateProfile'])('does not claim revocation or clear trust after failed %s', async action => {
  req.body.password = 'test-password';
  vi.spyOn(auth, action).mockRejectedValue(Object.assign(new Error('Denied'), { status: 401 }));
  await controller[action](req, res);
  expect(res.clearCookie).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(401);
});

it('runs password → OTP → HttpOnly trust → password login → expiry/revocation through real controllers and services', async () => {
  const bcrypt = require('bcryptjs');
  const crypto = require('crypto');
  const { pool } = require('../../config/db');
  const users = require('../../models/user.model');
  const proofs = require('../../models/trustedBrowser.model');
  const notifications = require('../../services/notification.service');
  const account = { id: 7, role: 'clerk', is_active: 1, student_id: 'CLERK001',
    email: 'clerk@example.test', password_hash: 'synthetic-hash', token_version: 0 };
  let proof;
  const connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(bcrypt, 'compare').mockImplementation(async value => value === 'test-password');
  vi.spyOn(users, 'getLoginSecurity').mockResolvedValue([]);
  vi.spyOn(users, 'findActiveByStudentId').mockImplementation(async () => [{ ...account }]);
  vi.spyOn(users, 'findById').mockImplementation(async () => [{ ...account }]);
  vi.spyOn(users, 'getProfileById').mockImplementation(async () => [{ ...account }]);
  vi.spyOn(users, 'logSecurityEvent').mockResolvedValue([{}]);
  vi.spyOn(users, 'updateEmailOTP').mockImplementation(async (_id, otp, expires) => {
    account.login_otp = otp; account.login_otp_expires = expires;
  });
  vi.spyOn(users, 'clearEmailOTP').mockImplementation(async () => { account.login_otp = null; });
  vi.spyOn(users, 'incrementTokenVersion').mockImplementation(async () => { account.token_version += 1; });
  vi.spyOn(notifications, 'sendEmail').mockResolvedValue({ ok: true });
  vi.spyOn(proofs, 'lockAccount').mockImplementation(async () => ({ ...account }));
  vi.spyOn(proofs, 'create').mockImplementation(async stored => { proof = stored; });
  vi.spyOn(proofs, 'findValid').mockImplementation(async lookup => Boolean(proof
    && proof.userId === lookup.userId && proof.tokenHash === lookup.tokenHash
    && proof.tokenVersion === account.token_version && proof.tokenVersion === lookup.tokenVersion
    && proof.expiresAt > lookup.now));

  req.body = { employee_id: 'CLERK001', password: 'test-password', shared_computer: false };
  req.headers.cookie = '';
  await controller.login(req, res);
  const pending = res.json.mock.calls[0][0];
  expect(pending).toMatchObject({ requires_2fa: true, can_trust_browser: true });
  expect(res.cookie).not.toHaveBeenCalled();

  req.body = { temp_token: pending.temp_token, otp: account.login_otp, trust_browser: true };
  await controller.verify2FA(req, res);
  const cookie = res.cookie.mock.calls.find(([name]) => name === trust.COOKIE_NAME);
  expect(cookie[2].httpOnly).toBe(true);
  expect(proof.tokenHash).toBe(crypto.createHash('sha256').update(cookie[1]).digest('hex'));
  expect(JSON.stringify(res.json.mock.calls)).not.toContain(cookie[1]);

  req.headers.cookie = `${trust.COOKIE_NAME}=${cookie[1]}`;
  req.body = { employee_id: 'CLERK001', password: 'test-password', shared_computer: false };
  res.json.mockClear();
  await controller.login(req, res);
  expect(res.json.mock.calls[0][0]).toHaveProperty('token');

  req.body.shared_computer = true;
  res.json.mockClear();
  await controller.login(req, res);
  expect(res.json.mock.calls[0][0]).toMatchObject({ requires_2fa: true, can_trust_browser: false });

  req.body.shared_computer = false;
  proof.expiresAt = Date.now();
  res.json.mockClear();
  await controller.login(req, res);
  expect(res.json.mock.calls[0][0]).toHaveProperty('requires_2fa', true);

  proof.expiresAt = Date.now() + 60000;
  await controller.logoutAll(req, res);
  res.json.mockClear();
  await controller.login(req, res);
  expect(res.json.mock.calls[0][0]).toHaveProperty('requires_2fa', true);
});
