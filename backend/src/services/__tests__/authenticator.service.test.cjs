const env = require('../../config/env');
const { pool } = require('../../config/db');
const model = require('../../models/authenticator.model');
const users = require('../../models/user.model');
const notifications = require('../notification.service');
const otp = require('../../utils/authenticator');
const bcrypt = require('bcryptjs');
const service = require('../authenticator.service');
let account, row, connection, secret, challenge;
beforeEach(() => {
  vi.spyOn(env, 'MFA_ENCRYPTION_KEY', 'get').mockReturnValue('a'.repeat(64));
  account = { id: 3, student_id: 'STU-003', role: 'student', verification_status: 'verified', is_active: 1, token_version: 2, email: 'synthetic@example.test', password_hash: 'hash' };
  secret = otp.newSecret(); row = { pending_secret: otp.encrypt(secret, 3), pending_expires_ms: Date.now() + 60000, pending_version: 2, last_counter: -1, failed_attempts: 0 };
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(bcrypt, 'compare').mockImplementation(async value => value === 'right-password');
  vi.spyOn(model, 'lockAccount').mockImplementation(async () => account);
  vi.spyOn(model, 'find').mockImplementation(async () => row);
  for (const key of ['savePending', 'activate', 'disable', 'acceptCounter', 'failure', 'clearFailures', 'replaceCodes', 'createChallenge', 'updateChallenge', 'revokeChallenges']) vi.spyOn(model, key).mockResolvedValue([{}]);
  vi.spyOn(model, 'countCodes').mockResolvedValue(10);
  vi.spyOn(model, 'consumeCode').mockResolvedValue(false);
  challenge = { user_id: 3, token_version: 2, method: 'authenticator', attempts: 0, consumed: false, expires_at_ms: Date.now() + 60000 };
  vi.spyOn(model, 'findChallenge').mockImplementation(async () => challenge);
  vi.spyOn(users, 'getProfileById').mockImplementation(async () => [account]);
  vi.spyOn(users, 'findById').mockImplementation(async () => [account]);
  for (const key of ['incrementTokenVersion', 'clearEmailOTP', 'logSecurityEvent']) vi.spyOn(users, key).mockResolvedValue([]);
  vi.spyOn(notifications, 'sendEmail').mockResolvedValue({ ok: true });
});
const user = { id: 3, token_version: 2 };
const good = () => ({ current_password: 'right-password', code: otp.totp(secret, Math.floor(Date.now() / 30000)) });
const decoded = () => ({ id: 3, token_version: 2, nonce: 'b'.repeat(64) });
it.each(['student', 'clerk', 'admin'])('enrolls %s after password and app verification only', async role => {
  account.role = role;
  const result = await service.begin(user, { current_password: 'right-password' });
  expect(result.provisioning_uri).toContain('otpauth://totp/');
  expect(model.activate).not.toHaveBeenCalled();
  const activated = await service.confirm(user, good());
  expect(activated.enabled).toBe(true); expect(activated.recovery_codes).toHaveLength(10);
  expect(activated.user).not.toHaveProperty('password_hash');
  expect(JSON.stringify(model.replaceCodes.mock.calls)).not.toContain(activated.recovery_codes[0]);
  expect(users.incrementTokenVersion).toHaveBeenCalledWith(3, connection);
  expect(connection.commit).toHaveBeenCalledTimes(2);
});
it('does not stage a secret with a wrong password', async () => {
  await expect(service.begin(user, { current_password: 'wrong' })).rejects.toMatchObject({ status: 400 });
  expect(model.savePending).not.toHaveBeenCalled();
});
it('expires setup and rejects concurrent session-version changes', async () => {
  row.pending_expires_ms = 1;
  await expect(service.confirm(user, good())).rejects.toThrow('expired');
  account.token_version = 3;
  await expect(service.begin(user, good())).rejects.toMatchObject({ status: 401 });
  expect(model.activate).not.toHaveBeenCalled();
});
it('commits failed verification counters and locks repeated attempts', async () => {
  row.failed_attempts = 4;
  await expect(service.confirm(user, { ...good(), code: 'bad' })).rejects.toThrow('15 minutes');
  expect(model.failure).toHaveBeenCalledWith(3, 5, expect.any(Number), connection);
  expect(connection.commit).toHaveBeenCalledOnce(); expect(connection.rollback).not.toHaveBeenCalled();
});
it('requires the existing factor before disabling and revokes it atomically', async () => {
  row.active_secret = row.pending_secret;
  await expect(service.change(user, { ...good(), code: 'bad' }, 'disable')).rejects.toThrow('Invalid');
  expect(model.disable).not.toHaveBeenCalled();
  expect((await service.change(user, good(), 'disable')).enabled).toBe(false);
  expect(model.replaceCodes).toHaveBeenCalledWith(3, [], connection);
});
it('can use one recovery code once; accepted login never disables the factor', async () => {
  row.active_secret = row.pending_secret;
  const recovery = otp.recoveryCodes()[0];
  model.consumeCode.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
  await service.verifyChallenge(decoded(), { recovery_code: recovery });
  await expect(service.verifyChallenge(decoded(), { recovery_code: recovery })).rejects.toThrow('Invalid');
  expect(model.disable).not.toHaveBeenCalled();
  expect(model.updateChallenge).toHaveBeenCalledWith(otp.hash(decoded().nonce), 0, true, connection);
});
it.each(['consumed', 'expires_at_ms', 'token_version', 'attempts'])('rejects invalid login challenge %s', async field => {
  challenge[field] = { consumed: true, expires_at_ms: 1, token_version: 1, attempts: 5 }[field];
  await expect(service.verifyChallenge(decoded(), good())).rejects.toMatchObject({ status: 401 });
  expect(model.acceptCounter).not.toHaveBeenCalled();
});
it('does not roll back enrollment for notification failure', async () => {
  notifications.sendEmail.mockRejectedValue(new Error('mail unavailable'));
  await expect(service.confirm(user, good())).resolves.toHaveProperty('enabled', true);
  expect(connection.rollback).not.toHaveBeenCalled();
});
