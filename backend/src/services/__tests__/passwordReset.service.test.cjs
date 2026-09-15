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

const statusOf = (promise) => promise.then(() => undefined, (err) => err.status);

const account = () => ({
  id: 7,
  student_id: 'STU2024001',
  full_name: 'Reyes, Ana',
  email: 'ana@plp.edu.ph',
});

beforeEach(() => {
  vi.spyOn(userModel, 'findActiveByStudentIdOrEmail').mockResolvedValue([]);
  vi.spyOn(userModel, 'updateProfile').mockResolvedValue(true);
  vi.spyOn(passwordResetModel, 'create').mockResolvedValue([{ insertId: 1 }]);
  vi.spyOn(passwordResetModel, 'findUsableByTokenHash').mockResolvedValue([]);
  vi.spyOn(passwordResetModel, 'markUsed').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(passwordResetModel, 'invalidateAllForUser').mockResolvedValue([{ affectedRows: 0 }]);
  vi.spyOn(notifications, 'sendEmail').mockResolvedValue({ ok: true });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('requestPasswordReset', () => {
  it('rejects an empty identifier', async () => {
    expect(await statusOf(service.requestPasswordReset({}))).toBe(400);
    expect(await statusOf(service.requestPasswordReset({ identifier: '   ' }))).toBe(400);
  });

  it('gives the same answer for a real and an unknown account', async () => {
    const unknown = await service.requestPasswordReset({ identifier: 'NOPE001' });

    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    const real = await service.requestPasswordReset({ identifier: 'STU2024001' });

    // The whole point: the response must not reveal which accounts exist.
    expect(real).toEqual(unknown);
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

  it('retires earlier outstanding links so only the newest works', async () => {
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);
    await service.requestPasswordReset({ identifier: 'STU2024001' });
    expect(passwordResetModel.invalidateAllForUser).toHaveBeenCalledWith(7);
  });

  it('stops quietly when the account has no email on file', async () => {
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([{ ...account(), email: null }]);
    await service.requestPasswordReset({ identifier: 'STU2024001' });
    expect(passwordResetModel.create).not.toHaveBeenCalled();
  });

  it('still succeeds when email is unconfigured, logging the link instead', async () => {
    notifications.sendEmail.mockResolvedValue({ ok: false, skipped: true, reason: 'not configured' });
    userModel.findActiveByStudentIdOrEmail.mockResolvedValue([account()]);

    await expect(service.requestPasswordReset({ identifier: 'STU2024001' })).resolves.toBeTruthy();
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  const usable = () => [{ id: 12, user_id: 7, student_id: 'STU2024001' }];

  it('requires both a token and a password', async () => {
    expect(await statusOf(service.resetPassword({}))).toBe(400);
    expect(await statusOf(service.resetPassword({ token: 'abc' }))).toBe(400);
  });

  it('enforces a minimum password length', async () => {
    expect(await statusOf(service.resetPassword({ token: 'abc', password: 'short' }))).toBe(400);
  });

  it('400s for an unknown, expired, or already-used token', async () => {
    // findUsableByTokenHash filters out used and expired rows in SQL, so an
    // empty result covers all three cases identically.
    expect(
      await statusOf(service.resetPassword({ token: 'deadbeef', password: 'newpassword1' }))
    ).toBe(400);
  });

  it('looks the token up by hash, not by its raw value', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    await service.resetPassword({ token: 'plaintext-token', password: 'newpassword1' });

    expect(passwordResetModel.findUsableByTokenHash).toHaveBeenCalledWith(
      crypto.createHash('sha256').update('plaintext-token').digest('hex')
    );
  });

  it('stores the new password hashed, and clears any forced-change flag', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    await service.resetPassword({ token: 'abc', password: 'newpassword1' });

    const [userId, fields] = userModel.updateProfile.mock.calls[0];
    expect(userId).toBe(7);
    expect(fields.password_hash).not.toBe('newpassword1');
    expect(await bcrypt.compare('newpassword1', fields.password_hash)).toBe(true);
    expect(fields.must_change_password).toBe(false);
  });

  it('consumes the token and retires the user other links', async () => {
    passwordResetModel.findUsableByTokenHash.mockResolvedValue(usable());
    await service.resetPassword({ token: 'abc', password: 'newpassword1' });

    expect(passwordResetModel.markUsed).toHaveBeenCalledWith(12);
    expect(passwordResetModel.invalidateAllForUser).toHaveBeenCalledWith(7);
  });
});
