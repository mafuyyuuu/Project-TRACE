const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const model = require('../../models/emailVerification.model');
const users = require('../../models/user.model');
const passwordResets = require('../../models/passwordReset.model');
const notifications = require('../notification.service');
const { pool } = require('../../config/db');
const service = require('../emailVerification.service');
let connection, account, row;
beforeEach(async () => {
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  account = { id: 3, role: 'student', is_active: 1, email: 'old@example.test', pending_email: null, email_verified_at: null, token_version: 2, password_hash: await bcrypt.hash('Trace2024!', 4) };
  row = { id: 8, user_id: 3, token_version: 2, kind: 'signup', email: account.email };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(model, 'lockAccount').mockImplementation(async () => account);
  vi.spyOn(model, 'recentlySent').mockResolvedValue(false);
  vi.spyOn(model, 'invalidate').mockResolvedValue([{}]);
  vi.spyOn(model, 'create').mockResolvedValue([{}]);
  vi.spyOn(model, 'lookup').mockImplementation(async () => row);
  vi.spyOn(model, 'consume').mockResolvedValue([{ affectedRows: 1 }]);
  vi.spyOn(model, 'commitVerification').mockResolvedValue([{}]);
  vi.spyOn(users, 'updateProfile').mockResolvedValue(true);
  vi.spyOn(users, 'logSecurityEvent').mockResolvedValue([{}]);
  vi.spyOn(passwordResets, 'invalidateAllForUser').mockResolvedValue([{}]);
  vi.spyOn(notifications, 'sendEmail').mockResolvedValue({ ok: true });
});
it('stores a hash and only puts the random single-use capability in the email fragment', async () => {
  const result = await service.issue(3);
  const token = notifications.sendEmail.mock.calls[0][2].match(/#token=([a-f0-9]{64})/)[1];
  expect(notifications.sendEmail.mock.calls[0][3]).toEqual({ action: { url: expect.stringContaining(`/verify-email#token=${token}`), label: 'Verify Email' } });
  expect(model.create).toHaveBeenCalledWith(3, 'signup', account.email, crypto.createHash('sha256').update(token).digest('hex'), 2, connection);
  expect(JSON.stringify(result)).not.toContain(token);
  expect(connection.commit).toHaveBeenCalledOnce();
});
it('requires the current password before staging the new email', async () => {
  await expect(service.issue(3, { email: 'new@example.test', current_password: 'wrong' })).rejects.toMatchObject({ status: 400 });
  expect(model.create).not.toHaveBeenCalled();
});
it('preserves the old email until verification and clears legacy email codes', async () => {
  await service.issue(3, { email: 'NEW@example.test', current_password: 'Trace2024!' });
  const [destination, , text, options] = notifications.sendEmail.mock.calls[0];
  expect(destination).toBe('new@example.test');
  expect(options.action.label).toBe('Verify Email');
  expect(text).toContain(options.action.url);
  expect(users.updateProfile).toHaveBeenCalledWith(3, { pending_email: 'new@example.test', email_otp: null, email_otp_expires: null }, connection);
  expect(model.commitVerification).not.toHaveBeenCalled();
  expect(notifications.sendEmail).toHaveBeenCalledTimes(2);
});
it('enforces the resend cooldown under the account lock', async () => {
  model.recentlySent.mockResolvedValue(true);
  await expect(service.issue(3)).rejects.toThrow('60 seconds');
  expect(model.create).not.toHaveBeenCalled();
});
it('returns a delivery error without failing a committed profile action', async () => {
  notifications.sendEmail.mockRejectedValue(new Error('SMTP down'));
  expect(await service.issue(3)).toMatchObject({ email_sent: false });
  expect(connection.commit).toHaveBeenCalledOnce();
});
it('consumes signup proof only after the account lock and stamps email verification', async () => {
  await service.confirm('a'.repeat(64));
  expect(model.lookup).toHaveBeenCalledTimes(2);
  expect(model.commitVerification).toHaveBeenCalledWith(3, account.email, false, connection);
  expect(users.logSecurityEvent).toHaveBeenCalledWith(3, 'EMAIL_VERIFIED', null, null, connection);
});
it('revokes sessions and notifies the old address after confirming an email change', async () => {
  row.kind = 'change'; row.email = 'new@example.test'; account.pending_email = row.email;
  const realtime = require('../../realtime'); const disconnect = vi.spyOn(realtime, 'disconnectUser');
  await service.confirm('a'.repeat(64));
  expect(model.commitVerification).toHaveBeenCalledWith(3, row.email, true, connection);
  expect(passwordResets.invalidateAllForUser).toHaveBeenCalledWith(3, connection);
  expect(disconnect).toHaveBeenCalledWith(3);
  expect(notifications.sendEmail.mock.calls[0][0]).toBe(account.email);
});
it.each(['expired', 'replayed', 'version', 'email', 'inactive'])('rejects %s verification before any credential write', async kind => {
  if (kind === 'expired') model.lookup.mockResolvedValue(undefined);
  if (kind === 'replayed') model.lookup.mockResolvedValueOnce(row).mockResolvedValueOnce(undefined);
  if (kind === 'version') account.token_version = 3;
  if (kind === 'email') account.email = 'different@example.test';
  if (kind === 'inactive') account.is_active = 0;
  await expect(service.confirm('a'.repeat(64))).rejects.toMatchObject({ status: 400 });
  expect(model.commitVerification).not.toHaveBeenCalled();
});
it('rolls back when another request consumes the same link', async () => {
  model.consume.mockResolvedValue([{ affectedRows: 0 }]);
  await expect(service.confirm('a'.repeat(64))).rejects.toMatchObject({ status: 400 });
  expect(connection.rollback).toHaveBeenCalledOnce(); expect(connection.commit).not.toHaveBeenCalled();
});
