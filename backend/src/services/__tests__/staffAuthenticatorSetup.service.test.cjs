const env = require('../../config/env');
const { pool } = require('../../config/db');
const model = require('../../models/staffAuthenticatorSetup.model');
const factors = require('../../models/authenticator.model');
const users = require('../../models/user.model');
const otp = require('../../utils/authenticator');
const bcrypt = require('bcryptjs');
const authenticator = require('../authenticator.service');
const service = require('../staffAuthenticatorSetup.service');
let admin, staff, grant, row, connection, secret;
const raw = 'b'.repeat(64);
const body = () => ({ employee_id: 'FINANCE001', password: 'staff-password', setup_code: raw });
beforeEach(() => {
  vi.spyOn(env, 'MFA_ENCRYPTION_KEY', 'get').mockReturnValue('a'.repeat(64));
  admin = { id: 1, role: 'admin', is_active: 1, token_version: 0, password_hash: 'admin-hash' };
  staff = { id: 3, student_id: 'FINANCE001', role: 'clerk', is_active: 1, token_version: 2, password_hash: 'staff-hash' };
  grant = { user_id: 3, code_hash: otp.hash(raw), issued_by: 1, token_version: 2, expires_at_ms: Date.now() + 60000, attempts: 0, consumed: 0 };
  secret = otp.newSecret(); row = { pending_secret: otp.encrypt(secret, 3), pending_version: 2, pending_expires_ms: grant.expires_at_ms };
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(factors, 'lockAccount').mockImplementation(async id => id === 1 ? admin : staff);
  vi.spyOn(factors, 'find').mockImplementation(async () => row);
  for (const name of ['clearPending', 'savePending', 'activate', 'replaceCodes']) vi.spyOn(factors, name).mockResolvedValue([]);
  vi.spyOn(users, 'findActiveByStudentId').mockResolvedValue([staff]);
  for (const name of ['logSecurityEvent', 'resetLoginSecurity']) vi.spyOn(users, name).mockResolvedValue([]);
  vi.spyOn(model, 'find').mockImplementation(async () => grant);
  for (const name of ['save', 'failed', 'consume']) vi.spyOn(model, name).mockResolvedValue([]);
  vi.spyOn(bcrypt, 'compare').mockImplementation(async (password, hash) => password === (hash === 'admin-hash' ? 'admin-password' : 'staff-password'));
  vi.spyOn(authenticator, 'refreshedSession').mockResolvedValue({ token: 'new-session', user: { id: 3, role: 'clerk' } });
  vi.spyOn(authenticator, 'notifyChanged').mockResolvedValue(undefined);
});
it('requires current Admin identity and password, stores only a hash and audits issuance', async () => {
  const result = await service.issue(admin, 3, { current_password: 'admin-password' });
  expect(result.setup_code).toMatch(/^[a-f0-9]{64}$/);
  expect(model.save).toHaveBeenCalledWith(3, otp.hash(result.setup_code), 1, 2, expect.any(Number), connection);
  expect(JSON.stringify(model.save.mock.calls)).not.toContain(result.setup_code);
  expect(result).not.toHaveProperty('token');
  expect(users.logSecurityEvent).toHaveBeenCalledWith(1, 'STAFF_AUTHENTICATOR_SETUP_ISSUED:3', null, null, connection);
  await expect(service.issue({ ...admin, role: 'clerk' }, 3, {})).rejects.toMatchObject({ status: 403 });
  await expect(service.issue({ ...admin, token_version: 9 }, 3, { current_password: 'admin-password' })).rejects.toMatchObject({ status: 403 });
  await expect(service.issue(admin, 3, { current_password: 'wrong' })).rejects.toMatchObject({ status: 400 });
});
it('never replaces an enrolled authenticator, even for Admin', async () => {
  row.active_secret = row.pending_secret;
  await expect(service.issue(admin, 3, { current_password: 'admin-password' })).rejects.toThrow('already has');
  await expect(service.start(body())).rejects.toMatchObject({ status: 400 });
  expect(model.save).not.toHaveBeenCalled(); expect(factors.activate).not.toHaveBeenCalled();
});
it('returns only encrypted pending setup after checking the clerk password and private code', async () => {
  const result = await service.start(body());
  expect(result.provisioning_uri).toContain('otpauth://totp/');
  expect(result).not.toHaveProperty('token');
  expect(factors.activate).not.toHaveBeenCalled(); expect(model.consume).not.toHaveBeenCalled();
  expect(factors.savePending.mock.calls[0][1]).not.toContain(result.secret);
  expect(factors.savePending.mock.calls[0][2]).toBe(grant.expires_at_ms);
});
it('commits failed password/code attempts and refuses the fifth exhausted grant', async () => {
  await expect(service.start({ ...body(), password: 'wrong' })).rejects.toMatchObject({ status: 400 });
  await expect(service.start({ ...body(), setup_code: 'c'.repeat(64) })).rejects.toMatchObject({ status: 400 });
  expect(model.failed).toHaveBeenCalledTimes(2); expect(connection.commit).toHaveBeenCalledTimes(2);
  expect(connection.rollback).not.toHaveBeenCalled();
  grant.attempts = 5;
  await expect(service.start(body())).rejects.toMatchObject({ status: 400 });
  expect(factors.savePending).not.toHaveBeenCalled();
});
it.each(['consumed', 'expires_at_ms', 'token_version'])('rejects expired, reused or stale grants (%s)', async field => {
  grant[field] = { consumed: 1, expires_at_ms: 1, token_version: 1 }[field];
  await expect(service.confirm({ ...body(), code: '123456' })).rejects.toMatchObject({ status: 400 });
  expect(factors.activate).not.toHaveBeenCalled();
});
it.each(['student', 'admin'])('refuses initial enrollment of %s accounts through staff grants', async role => {
  staff.role = role;
  await expect(service.start(body())).rejects.toMatchObject({ status: 400 });
  expect(factors.savePending).not.toHaveBeenCalled();
});
it('consumes the grant and rotates sessions only after verification from the new app', async () => {
  const payload = { ...body(), code: otp.totp(secret, Math.floor(Date.now() / 30000)) };
  const result = await service.confirm(payload);
  expect(result.recovery_codes).toHaveLength(10);
  expect(factors.activate).toHaveBeenCalledWith(3, expect.any(Number), connection);
  expect(model.consume).toHaveBeenCalledWith(3, connection);
  expect(authenticator.refreshedSession).toHaveBeenCalledWith(staff, connection);
  expect(JSON.stringify(factors.replaceCodes.mock.calls)).not.toContain(result.recovery_codes[0]);
  grant.consumed = true;
  await expect(service.confirm(payload)).rejects.toMatchObject({ status: 400 });
  expect(factors.activate).toHaveBeenCalledOnce();
});
it('commits an invalid app-code attempt without consuming the grant or returning a session', async () => {
  await expect(service.confirm({ ...body(), code: 'bad' })).rejects.toMatchObject({ status: 400 });
  expect(model.failed).toHaveBeenCalledOnce(); expect(model.consume).not.toHaveBeenCalled();
  expect(authenticator.refreshedSession).not.toHaveBeenCalled();
});
it.each([null, {}, { employee_id: 3 }, { employee_id: 'FINANCE001', password: 'staff-password', setup_code: 'invalid' }])('rejects malformed credentials without accessing setup storage (%j)', async payload => {
  await expect(service.start(payload)).rejects.toMatchObject({ status: 400 });
  expect(model.find).not.toHaveBeenCalled();
});
