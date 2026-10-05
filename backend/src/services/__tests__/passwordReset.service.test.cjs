/**
 * Password recovery: enumeration resistance on the request side, and
 * single-use / expiry enforcement on the reset side.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const userModel = require('../../models/user.model');
const passwordResetModel = require('../../models/passwordReset.model');
const notifications = require('../notification.service');
const service = require('../auth.service');
const { pool } = require('../../config/db');
const trustedBrowserModel = require('../../models/trustedBrowser.model');
const env = require('../../config/env');
const originalFrontend = env.FRONTEND_URL;
const originalNodeEnv = env.NODE_ENV;
afterEach(() => { env.FRONTEND_URL = originalFrontend; env.NODE_ENV = originalNodeEnv; });
let connection;

const statusOf = (promise) => promise.then(() => undefined, (err) => err.status);

const account = () => ({
  id: 7,
  student_id: 'STU2024001',
  full_name: 'Reyes, Ana',
  email: 'ana@plp.edu.ph',
});

beforeEach(() => {
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(trustedBrowserModel, 'lockAccount').mockResolvedValue({ ...account(), is_active: 1, token_version: 0 });
  vi.spyOn(userModel, 'incrementTokenVersion').mockResolvedValue([{}]);
  vi.spyOn(userModel, 'clearEmailOTP').mockResolvedValue([{}]);
  vi.spyOn(userModel, 'findActiveByStudentIdOrEmail').mockResolvedValue([]);
  vi.spyOn(userModel, 'updateProfile').mockResolvedValue(true);
  vi.spyOn(userModel, 'findById').mockResolvedValue([{ id: 7, email: 'student@example.com', is_active: 1, password_hash: '$2a$04$invalid' }]);
  vi.spyOn(userModel, 'getProfileById').mockResolvedValue([{ id: 7, role: 'student', email: 'student@example.com' }]);
  vi.spyOn(userModel, 'getPasswordHistory').mockResolvedValue([]);
  vi.spyOn(userModel, 'addPasswordHistory').mockResolvedValue([{}]);
  vi.spyOn(userModel, 'logSecurityEvent').mockResolvedValue([{}]);
  vi.spyOn(passwordResetModel, 'create').mockResolvedValue([{ insertId: 1 }]);
  vi.spyOn(passwordResetModel, 'findUsableByTokenHash').mockResolvedValue([]);
  vi.spyOn(passwordResetModel, 'markUsed').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(passwordResetModel, 'invalidateAllForUser').mockResolvedValue([{ affectedRows: 0 }]);
  vi.spyOn(notifications, 'sendEmail').mockResolvedValue({ ok: true });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  env.FRONTEND_URL = 'https://trace.example.test';
  env.NODE_ENV = 'test';
});

describe('requestPasswordReset', () => {
  it('uses the real lock query projection so an active saved email survives the account lock', async () => {
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    trustedBrowserModel.lockAccount.mockRestore();
    const stored = { ...account(), role: 'student', is_active: 1, token_version: 0, password_hash: 'synthetic-hash' };
    connection.query = vi.fn().mockImplementation(async sql => {
      // Model the fields SQL actually selects, rather than returning a richer
      // fixture that conceals a missing email in the account-lock query.
      const columns = sql.match(/SELECT\s+([\s\S]+?)\s+FROM/)[1].split(',').map(value => value.trim());
      return [[Object.fromEntries(columns.map(column => [column, stored[column]]))]];
    });
    await service.requestPasswordReset({ identifier: 'STU2024001' });
    expect(connection.query).toHaveBeenCalledWith(expect.stringContaining('FOR UPDATE'), [7]);
    expect(passwordResetModel.create).toHaveBeenCalledOnce();
    expect(notifications.sendEmail).toHaveBeenCalledWith('ana@plp.edu.ph', 'Password reset request',
      expect.stringContaining('STU2024001'), expect.objectContaining({ purpose: 'password_reset' }));
  });
  it('rejects an empty identifier', async () => {
    expect(await statusOf(service.requestPasswordReset({}))).toBe(400);
    expect(await statusOf(service.requestPasswordReset({ identifier: '   ' }))).toBe(400);
  });

  it('gives the same answer for a real and an unknown account', async () => {
    const unknown = await service.requestPasswordReset({ identifier: 'NOPE001' });

    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    const real = await service.requestPasswordReset({ identifier: 'STU2024001' });

    // The whole point: the response must not reveal which accounts exist.
    expect(real.message).toBe(unknown.message);
    expect(Object.keys(real)).toEqual(Object.keys(unknown));
    for (const result of [real, unknown]) expect(result.request_id).toMatch(/^[a-f0-9-]{36}$/);
    expect(real.request_id).not.toBe(unknown.request_id);
  });

  it('sends no email and stores no token for an unknown account', async () => {
    await service.requestPasswordReset({ identifier: 'NOPE001' });
    expect(passwordResetModel.create).not.toHaveBeenCalled();
    expect(notifications.sendEmail).not.toHaveBeenCalled();
  });

  it('stores only a hash of the token, never the token itself', async () => {
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    await service.requestPasswordReset({ identifier: 'STU2024001' });

    const stored = passwordResetModel.create.mock.calls[0][0];
    const emailBody = notifications.sendEmail.mock.calls[0][2];
    const rawToken = emailBody.match(/token=([a-f0-9]+)/)[1];

    expect(stored.token_hash).not.toBe(rawToken);
    expect(stored.token_hash).toBe(crypto.createHash('sha256').update(rawToken).digest('hex'));
  });

  it.each(['  STU2024001  ', ' FINANCE001 ', 'ana@plp.edu.ph'])('looks up trimmed identifier %s and sends only to the locked active email', async identifier => {
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([{ ...account(), email: 'stale@example.test' }]);
    trustedBrowserModel.lockAccount.mockResolvedValue({ ...account(), is_active: 1, pending_email: 'pending@example.test' });
    const result = await service.requestPasswordReset({ identifier });
    expect(userModel.findActiveByStudentIdOrEmail).toHaveBeenCalledWith(identifier.trim());
    expect(notifications.sendEmail).toHaveBeenCalledExactlyOnceWith('ana@plp.edu.ph', 'Password reset request',
      expect.stringContaining('https://trace.example.test/reset-password#token='), { purpose: 'password_reset', requestId: result.request_id });
    const stored = passwordResetModel.create.mock.calls[0][0];
    expect(stored.expires_at.getTime() - Date.now()).toBeGreaterThan(3590000);
    expect(stored.expires_at.getTime() - Date.now()).toBeLessThanOrEqual(3600000);
  });

  it.each(['unconfigured', 'smtp_rejected', 'smtp_failed'])('keeps %s operational outcomes private and gives a usable support reference', async outcome => {
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    notifications.sendEmail.mockResolvedValue({ ok: false, outcome, diagnostics: { code: 'EAUTH', response_code: 535 } });
    const result = await service.requestPasswordReset({ identifier: 'STU2024001' });
    const unknown = await service.requestPasswordReset({ identifier: 'unknown' });
    expect(result.message).toBe(unknown.message);
    expect(result).not.toHaveProperty('outcome');
    expect(result.message).toMatch(/Spam\/Junk.*Registrar/);
    expect(result.message).not.toMatch(/has been sent/);
    expect(console.warn).toHaveBeenCalledWith('[Password reset]', expect.stringContaining(result.request_id));
    const output = JSON.stringify(console.warn.mock.calls);
    expect(output).not.toContain('ana@');
    expect(output).not.toContain('STU2024001');
    expect(output).not.toContain(passwordResetModel.create.mock.calls[0][0].token_hash);
    expect(output).not.toContain('token=');
  });

  it.each(['', 'http://trace.example.test', 'https://user:secret@trace.example.test', 'https://trace.example.test/nested', 'https://trace.example.test?token=secret', 'https://localhost'])('does not issue production reset links for an unsafe frontend origin: %s', async origin => {
    env.NODE_ENV = 'production'; env.FRONTEND_URL = origin;
    const result = await service.requestPasswordReset({ identifier: 'STU2024001' });
    expect(result.request_id).toBeTruthy();
    expect(userModel.findActiveByStudentIdOrEmail).not.toHaveBeenCalled();
    expect(passwordResetModel.create).not.toHaveBeenCalled();
    expect(notifications.sendEmail).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('[Password reset]', expect.stringContaining('invalid_frontend_url'));
  });

  it('uses the first configured HTTPS origin with a fragment token and no query token', async () => {
    env.NODE_ENV = 'production'; env.FRONTEND_URL = 'https://trace.example.test/,https://preview.example.test';
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    await service.requestPasswordReset({ identifier: 'STU2024001' });
    const body = notifications.sendEmail.mock.calls[0][2];
    expect(body).toMatch(/https:\/\/trace\.example\.test\/reset-password#token=[a-f0-9]{64}/);
    expect(body).not.toContain('?token=');
    expect(body).not.toContain('preview.example');
  });

  it.each(['lookup', 'issuance', 'delivery'])('logs only safe metadata after a %s failure and preserves the generic response', async phase => {
    const error = Object.assign(new Error('sensitive recipient reset-password#token=secret'), { code: phase === 'delivery' ? 'EAUTH' : 'ER_NO_SUCH_TABLE', sql: 'sensitive sql', response: 'password=secret' });
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    if (phase === 'lookup') userModel.findActiveByStudentIdOrEmail.mockRejectedValue(error);
    if (phase === 'issuance') passwordResetModel.create.mockRejectedValue(error);
    if (phase === 'delivery') notifications.sendEmail.mockRejectedValue(error);
    const result = await service.requestPasswordReset({ identifier: 'STU2024001' });
    expect(result.message).toMatch(/request received/);
    expect(JSON.stringify(console.warn.mock.calls)).not.toMatch(/sensitive|secret|token=/);
    expect(console.warn).toHaveBeenCalledWith('[Password reset]', expect.stringContaining(result.request_id));
    if (phase === 'issuance') {
      expect(connection.rollback).toHaveBeenCalledOnce();
      expect(connection.release).toHaveBeenCalledOnce();
      expect(notifications.sendEmail).not.toHaveBeenCalled();
    }
  });

  it('retires earlier outstanding links so only the newest works', async () => {
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    await service.requestPasswordReset({ identifier: 'STU2024001' });
    expect(passwordResetModel.invalidateAllForUser).toHaveBeenCalledWith(7, connection);
  });

  it('stops quietly when the account has no email on file', async () => {
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([{ ...account(), email: null }]);
    await service.requestPasswordReset({ identifier: 'STU2024001' });
    expect(passwordResetModel.create).not.toHaveBeenCalled();
  });

  it('returns the generic response when mail fails without logging a usable link', async () => {
    notifications.sendEmail.mockResolvedValue({ ok: false, skipped: true, reason: 'not configured' });
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);

    await expect(service.requestPasswordReset({ identifier: 'STU2024001' })).resolves.toBeTruthy();
    expect(console.warn).toHaveBeenCalled();
    expect(JSON.stringify(console.warn.mock.calls)).not.toContain('/reset-password?token=');
  });
});

describe('resetPassword', () => {
  const usable = () => [{ id: 12, user_id: 7, student_id: 'STU2024001' }];
  it('allows an issued token only once and rejects a later replay', async () => {
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    await service.requestPasswordReset({ identifier: 'STU2024001' });
    const token = notifications.sendEmail.mock.calls[0][2].match(/#token=([a-f0-9]{64})/)[1];
    let consumed = false;
    passwordResetModel.findUsableByTokenHash.mockImplementation(async hash => {
      expect(hash).toBe(passwordResetModel.create.mock.calls[0][0].token_hash);
      return consumed ? [] : usable();
    });
    passwordResetModel.markUsed.mockImplementation(async () => { consumed = true; return [{ affectedRows: 1 }]; });
    await service.resetPassword({ token, password: 'Newpassword1!' });
    expect(await statusOf(service.resetPassword({ token, password: 'Otherpassword1!' }))).toBe(400);
    expect(userModel.updateProfile).toHaveBeenCalledOnce();
    expect(passwordResetModel.markUsed).toHaveBeenCalledOnce();
  });
  it('accepts underscore as the only symbol while preserving the last-three-password check', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    await service.resetPassword({ token: 'synthetic-token', password: 'Newpassword_2026' });
    expect(await bcrypt.compare('Newpassword_2026', userModel.updateProfile.mock.calls[0][1].password_hash)).toBe(true);
    userModel.updateProfile.mockClear();
    passwordResetModel.markUsed.mockClear();
    userModel.getPasswordHistory.mockResolvedValue([{ password_hash: await bcrypt.hash('Newpassword_2026', 4) }]);
    await expect(service.resetPassword({ token: 'synthetic-token', password: 'Newpassword_2026' })).rejects.toThrow('last 3 passwords');
    expect(userModel.updateProfile).not.toHaveBeenCalled();
    expect(passwordResetModel.markUsed).not.toHaveBeenCalled();
  });

  it('requires both a token and a password', async () => {
    expect(await statusOf(service.resetPassword({}))).toBe(400);
    expect(await statusOf(service.resetPassword({ token: 'abc' }))).toBe(400);
  });

  it('enforces a minimum password length', async () => {
    expect(await statusOf(service.resetPassword({ token: 'abc', password: 'short' }))).toBe(400);
  });
  it.each(['lowercase123!', 'UPPERCASE123!', 'NoDigitsHere!', 'NoSymbols123', 'Aa1!' + 'x'.repeat(70), 12345678])('rejects weak or truncatable passwords: %s', async password => {
    expect(await statusOf(service.resetPassword({ token: 'abc', password }))).toBe(400);
    expect(passwordResetModel.findUsableByTokenHash).not.toHaveBeenCalled();
    expect(userModel.updateProfile).not.toHaveBeenCalled();
  });
  it.each(['current', 'history'])('rejects %s password reuse inside the account lock', async source => {
    const hash = await bcrypt.hash('Newpassword1!', 4);
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    if (source === 'current') userModel.findById.mockResolvedValue([{ id: 7, is_active: 1, password_hash: hash }]);
    else userModel.getPasswordHistory.mockResolvedValue([{ password_hash: hash }]);
    expect(await statusOf(service.resetPassword({ token: 'abc', password: 'Newpassword1!' }))).toBe(400);
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(userModel.updateProfile).not.toHaveBeenCalled();
    expect(passwordResetModel.markUsed).not.toHaveBeenCalled();
  });
  it('keeps a committed reset successful when its owner notice cannot be delivered', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    notifications.sendEmail.mockRejectedValue(new Error('SMTP unavailable'));
    await expect(service.resetPassword({ token: 'abc', password: 'Newpassword1!' })).resolves.toHaveProperty('message');
    expect(connection.commit).toHaveBeenCalledOnce();
    expect(notifications.sendEmail).toHaveBeenCalledWith('student@example.com', 'Password Reset Successful', expect.stringContaining('/forgot-password'));
  });

  it('400s for an unknown, expired, or already-used token', async () => {
    // findUsableByTokenHash filters out used and expired rows in SQL, so an
    // empty result covers all three cases identically.
    expect(
      await statusOf(service.resetPassword({ token: 'deadbeef', password: 'Newpassword1!' }))
    ).toBe(400);
  });

  it('looks the token up by hash, not by its raw value', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    await service.resetPassword({ token: 'plaintext-token', password: 'Newpassword1!' });

    expect(passwordResetModel.findUsableByTokenHash).toHaveBeenCalledWith(
      crypto.createHash('sha256').update('plaintext-token').digest('hex')
    );
  });

  it('stores the new password hashed, and clears any forced-change flag', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    await service.resetPassword({ token: 'abc', password: 'Newpassword1!' });

    const [userId, fields] = userModel.updateProfile.mock.calls[0];
    expect(userId).toBe(7);
    expect(fields.password_hash).not.toBe('Newpassword1!');
    expect(await bcrypt.compare('Newpassword1!', fields.password_hash)).toBe(true);
    expect(fields.must_change_password).toBe(false);
  });

  it('consumes the token and retires the user other links', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    await service.resetPassword({ token: 'abc', password: 'Newpassword1!' });

    expect(passwordResetModel.markUsed).toHaveBeenCalledWith(12, connection);
    expect(passwordResetModel.invalidateAllForUser).toHaveBeenCalledWith(7, connection);
    expect(userModel.incrementTokenVersion).toHaveBeenCalledWith(7, connection);
    expect(userModel.clearEmailOTP).toHaveBeenCalledWith(7, connection);
    expect(connection.commit).toHaveBeenCalledOnce();
  });

  it('rolls back password, link consumption and revocation together on failure', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    userModel.incrementTokenVersion.mockRejectedValue(new Error('write denied'));
    await expect(service.resetPassword({ token: 'abc', password: 'Newpassword1!' })).rejects.toThrow('write denied');
    expect(connection.commit).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(notifications.sendEmail).not.toHaveBeenCalled();
  });

  it('rechecks a link after the account lock and rejects concurrent consumption', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValueOnce(usable()).mockResolvedValueOnce([]);
    expect(await statusOf(service.resetPassword({ token: 'abc', password: 'Newpassword1!' }))).toBe(400);
    expect(userModel.updateProfile).not.toHaveBeenCalled();
    expect(userModel.incrementTokenVersion).not.toHaveBeenCalled();
    expect(connection.rollback).toHaveBeenCalledOnce();
  });
});
