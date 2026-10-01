const crypto = require('crypto');
const { pool } = require('../../config/db');
const model = require('../../models/trustedBrowser.model');
const trust = require('../trustedBrowser.service');

const clerk = { id: 7, role: 'clerk', is_active: 1, token_version: 0 };
const secret = 'a'.repeat(64);
let connection;
beforeEach(() => {
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(model, 'lockAccount').mockResolvedValue(clerk);
  vi.spyOn(model, 'findValid').mockResolvedValue(true);
  vi.spyOn(model, 'create').mockResolvedValue([{}]);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => vi.useRealTimers());

it.each([
  ['2026-09-30T15:59:59.000Z', '2026-09-30T16:00:00.000Z'],
  ['2026-09-30T16:00:00.000Z', '2026-10-01T16:00:00.000Z'],
  ['2026-12-31T16:00:00.000Z', '2027-01-01T16:00:00.000Z'],
])('expires at the next midnight Manila time from %s', (now, expiry) => {
  expect(trust.nextManilaMidnight(Date.parse(now))).toBe(Date.parse(expiry));
});

it('accepts only a hashed, account-bound clerk cookie in explicit personal mode', async () => {
  expect(await trust.isTrusted(clerk, `trace_device=${secret}`, false)).toBe(false);
  expect(await trust.isTrusted(clerk, `${trust.COOKIE_NAME}=${secret}`, false)).toBe(true);
  expect(model.findValid).toHaveBeenCalledExactlyOnceWith({
    userId: 7, tokenVersion: 0, tokenHash: crypto.createHash('sha256').update(secret).digest('hex'), now: expect.any(Number),
  });
});

it.each([undefined, true, 'false', 0])('requires OTP for shared or malformed mode %s', async mode => {
  expect(await trust.isTrusted(clerk, `${trust.COOKIE_NAME}=${secret}`, mode)).toBe(false);
  expect(model.findValid).not.toHaveBeenCalled();
});

it.each(['admin', 'student'])('never grants or accepts trust for %s', async role => {
  expect(await trust.isTrusted({ ...clerk, role }, `${trust.COOKIE_NAME}=${secret}`, false)).toBe(false);
  model.lockAccount.mockResolvedValue({ ...clerk, role });
  expect(await trust.issue(7, 0)).toBe(null);
  expect(model.create).not.toHaveBeenCalled();
});

it.each(['', 'trace_mfa_trust=invalid', `trace_mfa_trust=${secret}; trace_mfa_trust=${secret}`])('rejects absent, malformed or ambiguous cookies', async header => {
  expect(await trust.isTrusted(clerk, header, false)).toBe(false);
  expect(model.findValid).not.toHaveBeenCalled();
});

it('falls back to OTP when the table is missing without logging cookie values', async () => {
  model.findValid.mockRejectedValue(new Error(`database error with ${secret}`));
  expect(await trust.isTrusted(clerk, `${trust.COOKIE_NAME}=${secret}`, false)).toBe(false);
  expect(JSON.stringify(console.warn.mock.calls)).not.toContain(secret);
});

it('issues a random secret, persists only its hash, and uses the account version at OTP verification', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-30T15:59:59Z'));
  const result = await trust.issue(7, 0);
  expect(result.value).toMatch(/^[a-f0-9]{64}$/);
  expect(result.expiresAt).toBe(Date.parse('2026-09-30T16:00:00Z'));
  expect(model.create).toHaveBeenCalledWith({ userId: 7, tokenVersion: 0,
    tokenHash: crypto.createHash('sha256').update(result.value).digest('hex'), expiresAt: result.expiresAt }, connection);
  expect(JSON.stringify(model.create.mock.calls)).not.toContain(result.value);
  expect(connection.commit).toHaveBeenCalledOnce();
  expect(connection.release).toHaveBeenCalledOnce();
});

it.each([{ token_version: 1 }, { is_active: 0 }])('cannot issue trust after revocation or deactivation', async changed => {
  model.lockAccount.mockResolvedValue({ ...clerk, ...changed });
  expect(await trust.issue(7, 0)).toBe(null);
  expect(model.create).not.toHaveBeenCalled();
  expect(connection.rollback).toHaveBeenCalledOnce();
});

it('does not claim trust when storage fails', async () => {
  model.create.mockRejectedValue(new Error('table unavailable'));
  expect(await trust.issue(7, 0)).toBe(null);
  expect(connection.commit).not.toHaveBeenCalled();
  expect(connection.rollback).toHaveBeenCalledOnce();
});

it('sets HttpOnly cookies with HTTPS cross-site settings and bounded expiry', () => {
  expect(trust.cookieOptionsFor('http://localhost:5273')).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/api/auth' });
  expect(trust.cookieOptionsFor('https://trace.example')).toEqual({ httpOnly: true, secure: true, sameSite: 'none', path: '/api/auth' });
});

it('the real lookup SQL checks current role, activation, expiry and account version', async () => {
  model.findValid.mockRestore();
  const executor = { query: vi.fn().mockResolvedValue([[{ user_id: 7 }]]) };
  expect(await model.findValid({ userId: 7, tokenHash: 'hash', tokenVersion: 0, now: 100 }, executor)).toBe(true);
  const [sql, params] = executor.query.mock.calls[0];
  expect(sql).toMatch(/JOIN users/);
  expect(sql).toMatch(/u.role = 'clerk'/);
  expect(sql).toMatch(/u.is_active = TRUE/);
  expect(sql).toMatch(/t.token_version = u.token_version/);
  expect(sql).toMatch(/t.expires_at_ms > \?/);
  expect(params).toEqual([7, 'hash', 0, 100]);
});
