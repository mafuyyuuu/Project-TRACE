const { pool } = require('../../config/db');
const model = require('../../models/pickupReminder.model');
const notifications = require('../notification.service');
const service = require('../pickupReminder.service');
const { reminderPeriod, FIRST_DELAY_MS, REPEAT_MS } = require('../../utils/pickupReminderSchedule');

const ready = Date.UTC(2026, 9, 1, 2);
const candidate = (patch = {}) => ({ document_id: 11, ready_step_id: 42, tracking_number: 'TRC-SYNTHETIC',
  user_id: 3, phone_number: '09123456789', ready_at_ms: ready, now_ms: ready + FIRST_DELAY_MS, ...patch });
let connection;

beforeEach(() => {
  connection = { release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(notifications, 'isSmsConfigured').mockReturnValue(true);
  vi.spyOn(notifications, 'sendSms').mockResolvedValue({ ok: true, outcome: 'provider_accepted' });
  vi.spyOn(model, 'acquire').mockResolvedValue(true);
  vi.spyOn(model, 'release').mockResolvedValue();
  vi.spyOn(model, 'markAbandoned').mockResolvedValue();
  vi.spyOn(model, 'candidates').mockResolvedValue([candidate()]);
  vi.spyOn(model, 'stillEligible').mockResolvedValue({ phone_number: '09123456789' });
  vi.spyOn(model, 'reserve').mockResolvedValue(7);
  vi.spyOn(model, 'finish').mockResolvedValue();
  vi.spyOn(console, 'info').mockImplementation(() => {});
});

it('starts at 72 hours, repeats weekly and skips missed periods', () => {
  expect(reminderPeriod(ready, ready + FIRST_DELAY_MS - 1)).toBeNull();
  expect(reminderPeriod(ready, ready + FIRST_DELAY_MS)).toEqual({ period: 0, dueAt: ready + FIRST_DELAY_MS });
  expect(reminderPeriod(ready, ready + FIRST_DELAY_MS + REPEAT_MS - 1).period).toBe(0);
  expect(reminderPeriod(ready, ready + FIRST_DELAY_MS + REPEAT_MS).period).toBe(1);
  expect(reminderPeriod(ready, ready + FIRST_DELAY_MS + 4 * REPEAT_MS).period).toBe(4);
  expect(reminderPeriod(NaN, ready)).toBeNull();
});

it('persists the period before sending and records provider acceptance', async () => {
  expect(await service.processReminders()).toEqual({ submitted: 1 });
  expect(model.reserve).toHaveBeenCalledWith(candidate(), { period: 0, dueAt: ready + FIRST_DELAY_MS }, connection);
  expect(model.reserve.mock.invocationCallOrder[0]).toBeLessThan(notifications.sendSms.mock.invocationCallOrder[0]);
  expect(notifications.sendSms).toHaveBeenCalledWith('09123456789', expect.stringContaining('Window 1'));
  expect(model.finish).toHaveBeenCalledWith(7, 'accepted', null, connection);
  expect(model.release).toHaveBeenCalledWith(connection);
  expect(connection.release).toHaveBeenCalledOnce();
});

it.each(['duplicate', 'claimed', 'bad-phone', 'not-due'])('sends nothing for %s', async scenario => {
  if (scenario === 'duplicate') model.reserve.mockResolvedValue(null);
  if (scenario === 'claimed') model.stillEligible.mockResolvedValue(null);
  if (scenario === 'bad-phone') model.stillEligible.mockResolvedValue({ phone_number: '9'.repeat(100) });
  if (scenario === 'not-due') model.candidates.mockResolvedValue([candidate({ now_ms: ready + FIRST_DELAY_MS - 1 })]);
  await service.processReminders();
  expect(notifications.sendSms).not.toHaveBeenCalled();
});

it('cancels a reserved attempt if the document was claimed before dispatch', async () => {
  model.stillEligible.mockResolvedValueOnce({ phone_number: '09123456789' }).mockResolvedValueOnce(null);
  await service.processReminders();
  expect(notifications.sendSms).not.toHaveBeenCalled();
  expect(model.finish).toHaveBeenCalledWith(7, 'cancelled', 'NO_LONGER_ELIGIBLE', connection);
});

it('batches a recipient’s due documents into one SMS and records each attempt', async () => {
  model.candidates.mockResolvedValue([candidate(), candidate({ document_id: 12, ready_step_id: 43 })]);
  model.reserve.mockResolvedValueOnce(7).mockResolvedValueOnce(8);
  expect(await service.processReminders()).toEqual({ submitted: 2 });
  expect(notifications.sendSms).toHaveBeenCalledOnce();
  expect(notifications.sendSms.mock.calls[0][1]).toContain('2 documents');
  expect(model.finish).toHaveBeenCalledWith(7, 'accepted', null, connection);
  expect(model.finish).toHaveBeenCalledWith(8, 'accepted', null, connection);
});

it.each([
  [{ ok: false, outcome: 'provider_rejected', code: 'HTTP_401' }, 'failed'],
  [{ ok: false, outcome: 'unknown', code: 'UNCONFIRMED' }, 'unknown'],
])('records failure/uncertainty without immediate retries (%j)', async (result, state) => {
  notifications.sendSms.mockResolvedValue(result);
  expect(await service.processReminders()).toEqual({ submitted: 0 });
  expect(notifications.sendSms).toHaveBeenCalledOnce();
  expect(model.finish).toHaveBeenCalledWith(7, state, result.code, connection);
});

it('preserves a dispatch marker after a crash instead of replaying an uncertain send', async () => {
  model.finish.mockRejectedValue(new Error('lost connection after acceptance'));
  await expect(service.processReminders()).rejects.toThrow('lost connection');
  expect(notifications.sendSms).toHaveBeenCalledOnce();
  expect(model.release).toHaveBeenCalledWith(connection);
  expect(connection.release).toHaveBeenCalledOnce();
});

it.each(['unconfigured', 'another-worker'])('skips %s safely', async scenario => {
  if (scenario === 'unconfigured') notifications.isSmsConfigured.mockReturnValue(false);
  else model.acquire.mockResolvedValue(false);
  await service.processReminders();
  expect(notifications.sendSms).not.toHaveBeenCalled();
  expect(model.candidates).not.toHaveBeenCalled();
  if (scenario === 'another-worker') expect(connection.release).toHaveBeenCalledOnce();
});

it('prevents overlapping local timer ticks and stops on shutdown', async () => {
  vi.useFakeTimers();
  let resolve;
  model.candidates.mockImplementation(() => new Promise(done => { resolve = done; }));
  const stop = service.startTimers();
  await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
  expect(model.candidates).toHaveBeenCalledOnce();
  resolve([]);
  await vi.advanceTimersByTimeAsync(0);
  stop();
  await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
  expect(model.candidates).toHaveBeenCalledOnce();
  vi.useRealTimers();
});
