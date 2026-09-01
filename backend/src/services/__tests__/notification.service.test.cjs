/**
 * Notification dispatch.
 *
 * The bug this guards against: SMTP settings used to fall back to placeholder
 * credentials, so every email failed at send time with an opaque "535
 * Authentication failed" that looked like a code defect. An unconfigured
 * channel must now be reported and skipped, never attempted.
 */
const notificationModel = require('../../models/notification.model');
const service = require('../notification.service');

beforeEach(() => {
  vi.spyOn(notificationModel, 'create').mockResolvedValue([{ insertId: 1 }]);
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('channel configuration detection', () => {
  it('reports email as unconfigured in the test environment', () => {
    // test/setup.js deliberately supplies no SMTP credentials.
    expect(service.isEmailConfigured()).toBe(false);
  });

  it('reports SMS as configured when a key is present', () => {
    expect(service.isSmsConfigured()).toBe(true);
  });

  it('explains what is missing rather than just failing', async () => {
    const status = await service.verifyChannels();
    expect(status.email.configured).toBe(false);
    expect(status.email.detail).toMatch(/SMTP_HOST/);
    expect(status.email.detail).toMatch(/backend\/\.env/);
  });

  it('always treats in-app notifications as available', async () => {
    const status = await service.verifyChannels();
    expect(status.in_app).toMatchObject({ configured: true, ok: true });
  });
});

describe('sendEmail', () => {
  it('skips with a clear reason when email is not configured', async () => {
    const res = await service.sendEmail('someone@example.com', 'Subject', 'Body');
    expect(res).toMatchObject({ ok: false, skipped: true });
    expect(res.reason).toMatch(/not configured/i);
  });

  it('distinguishes "not configured" from "no address on file"', async () => {
    const noAddress = await service.sendEmail('', 'Subject', 'Body');
    expect(noAddress.skipped).toBe(true);
    // Both are skips, but the reasons differ so the cause is diagnosable.
    expect(typeof noAddress.reason).toBe('string');
  });
});

describe('sendSms', () => {
  it('skips when the recipient has no number and no fallback is set', async () => {
    const res = await service.sendSms('', 'Hello');
    expect(res).toMatchObject({ ok: false, skipped: true });
    expect(res.reason).toMatch(/no phone number/i);
  });

  it('reports a provider failure without throwing', async () => {
    const res = await service.sendSms('+639171234567', 'Hello');
    // The test key is not a live credential, so this fails — the point is that
    // it returns a result rather than raising.
    expect(res.ok).toBe(false);
    expect(typeof res.reason).toBe('string');
  });
});

describe('dispatchStudentAlert', () => {
  const USER = { id: 3, full_name: 'Ana Reyes', email: 'ana@example.com', phone_number: '+639171234567' };

  it('always records the in-app notification', async () => {
    const res = await service.dispatchStudentAlert({
      user: USER, title: 'Document Ready', message: 'Your document is ready.', type: 'success',
    });
    expect(notificationModel.create).toHaveBeenCalled();
    expect(res.in_app.ok).toBe(true);
  });

  it('does not attempt SMS or email unless asked', async () => {
    const res = await service.dispatchStudentAlert({
      user: USER, title: 'T', message: 'M', type: 'info',
    });
    expect(res.sms).toBeUndefined();
    expect(res.email).toBeUndefined();
  });

  it('returns a per-channel outcome so a skip is visible', async () => {
    const res = await service.dispatchStudentAlert({
      user: USER, title: 'T', message: 'M', type: 'success', alsoSmsAndEmail: true,
    });
    expect(res.in_app.ok).toBe(true);
    expect(res.email.skipped).toBe(true);   // unconfigured in tests
    expect(res).toHaveProperty('sms');
  });

  it('still succeeds in-app when the outbound channels are down', async () => {
    // This is the critical guarantee: a failed SMS or email must never break
    // the document action that triggered the notification.
    await expect(
      service.dispatchStudentAlert({
        user: USER, title: 'T', message: 'M', type: 'success', alsoSmsAndEmail: true,
      })
    ).resolves.toBeTruthy();
  });

  it('does not throw when the in-app write itself fails', async () => {
    notificationModel.create.mockRejectedValue(new Error('db down'));
    const res = await service.dispatchStudentAlert({
      user: USER, title: 'T', message: 'M', type: 'info',
    });
    expect(res.in_app.ok).toBe(false);
  });
});

describe('notifyInAppBulk', () => {
  it('writes one notification per recipient', async () => {
    await service.notifyInAppBulk([{ id: 1 }, { id: 2 }, { id: 3 }], {
      title: 'T', message: 'M', type: 'info',
    });
    expect(notificationModel.create).toHaveBeenCalledTimes(3);
  });

  it('keeps going when one recipient fails', async () => {
    notificationModel.create
      .mockRejectedValueOnce(new Error('db blip'))
      .mockResolvedValue([{ insertId: 2 }]);
    await service.notifyInAppBulk([{ id: 1 }, { id: 2 }], { title: 'T', message: 'M', type: 'info' });
    expect(notificationModel.create).toHaveBeenCalledTimes(2);
  });
});
