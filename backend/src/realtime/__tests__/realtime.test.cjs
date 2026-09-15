/**
 * The realtime layer must never be able to break a document action.
 *
 * `emitToUser` is called from inside notification dispatch, which itself runs
 * inside desk workflows — so a missing or broken Socket.IO server has to
 * degrade silently rather than throw.
 */
const realtime = require('../index');

describe('before init (or when realtime is unavailable)', () => {
  it('emitToUser reports "not delivered" instead of throwing', () => {
    expect(() => realtime.emitToUser(1, 'notification', { title: 'T' })).not.toThrow();
    expect(realtime.emitToUser(1, 'notification', { title: 'T' })).toBe(false);
  });

  it('emitToDesk behaves the same way', () => {
    expect(realtime.emitToDesk('Finance', 'notification', {})).toBe(false);
  });

  it('reports zero connections rather than crashing', () => {
    expect(realtime.connectionCount()).toBe(0);
  });

  it('exposes no server until initialised', () => {
    expect(realtime.io).toBeNull();
  });
});

describe('notification dispatch tolerates a dead realtime layer', () => {
  it('still stores the notification when the push cannot be delivered', async () => {
    const notificationModel = require('../../models/notification.model');
    const notifications = require('../../services/notification.service');

    vi.spyOn(notificationModel, 'create').mockResolvedValue([{ insertId: 1 }]);
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const res = await notifications.notifyInApp({
      userId: 3, title: 'T', message: 'M', type: 'info',
    });

    expect(res.ok).toBe(true);
    expect(notificationModel.create).toHaveBeenCalled();
  });
});
