const auth = require('../auth.service');
const devices = require('../deviceLogin.service');
const controller = require('../../controllers/auth.controller');
const userModel = require('../../models/user.model');
const userDevices = require('../../models/userDevice.model');
const USER = { id: 3, role: 'clerk', email: 'staff@example.test' };
const req = { body: { temp_token: 'challenge', otp: '123456' }, headers: { cookie: 'trace_device=' + 'a'.repeat(64), 'user-agent': 'Test' }, ip: '127.0.0.1' };
let res;
beforeEach(() => {
  res = { cookie: vi.fn(), json: vi.fn(), status: vi.fn().mockReturnThis() };
  vi.spyOn(devices, 'recordLogin').mockResolvedValue('b'.repeat(64));
});
it('does not recognize a browser during the password-only OTP challenge', async () => {
  vi.spyOn(auth, 'login').mockResolvedValue({ requires_2fa: true, temp_token: 'challenge' });
  await controller.login(req, res);
  expect(devices.recordLogin).not.toHaveBeenCalled();
  expect(res.cookie).not.toHaveBeenCalled();
});
it('recognizes a browser only after OTP verification supplies a full authenticated user', async () => {
  vi.spyOn(auth, 'verify2FA').mockResolvedValue({ token: 'authenticated', user: USER });
  await controller.verify2FA(req, res);
  expect(auth.verify2FA).toHaveBeenCalledWith('challenge', '123456', req.ip, 'Test');
  expect(devices.recordLogin).toHaveBeenCalledWith(USER, req.headers.cookie, req.ip, 'Test');
  expect(res.cookie).toHaveBeenCalledWith(devices.COOKIE_NAME, 'b'.repeat(64), devices.COOKIE_OPTIONS);
});
it('does not recognize or notify on an invalid OTP', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(auth, 'verify2FA').mockRejectedValue(Object.assign(new Error('Invalid verification code.'), { status: 401 }));
  await controller.verify2FA(req, res);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(devices.recordLogin).not.toHaveBeenCalled();
});
it('checks graduate completion using the student identifier in both restore and login reads', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[{ has_grad_application: 1 }]]) };
  await userModel.getProfileById(3, executor);
  await userModel.findActiveByStudentId('STU-001', executor);
  for (const [sql] of executor.query.mock.calls) expect(sql).toContain('student_id = u.student_id');
});
it('alerts only for the unique device insert, updating last-seen for subsequent logins', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{ affectedRows: 0 }]) };
  expect(await userDevices.record({ userId: 3, deviceHash: 'hash', ip: '127.0.0.1', userAgent: 'Test' }, executor)).toBe(false);
  expect(executor.query.mock.calls[0][0]).toContain('INSERT IGNORE');
  expect(executor.query.mock.calls[1][1]).toEqual(['127.0.0.1', 'Test', 3, 'hash']);
});
it('login challenge writes and clearing cannot overwrite a pending email challenge', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await userModel.updateEmailOTP(3, '123456', new Date(), executor);
  await userModel.clearEmailOTP(3, executor);
  for (const [sql] of executor.query.mock.calls) {
    expect(sql).toContain('login_otp');
    expect(sql).not.toMatch(/\bemail_otp\b/);
    expect(sql).not.toContain('pending_email');
  }
});
it('Batch 8 migration tolerates existing columns without changing existing user records', async () => {
  const { migrate } = require('../../../database/migrate_batch8');
  const executor = { query: vi.fn(async sql => {
    if (sql.startsWith('ALTER')) throw Object.assign(new Error('Duplicate'), { code: 'ER_DUP_FIELDNAME' });
    return [{}];
  }) };
  await migrate(executor);
  expect(executor.query.mock.calls.some(([sql]) => sql.includes('login_otp VARCHAR(6)'))).toBe(true);
  expect(executor.query.mock.calls.every(([sql]) => !sql.startsWith('UPDATE') && !sql.startsWith('DELETE'))).toBe(true);
});
it('Batch 8 migration propagates unexpected database errors', async () => {
  const { migrate } = require('../../../database/migrate_batch8');
  const executor = { query: vi.fn().mockRejectedValue(Object.assign(new Error('Denied'), { code: 'ER_ACCESS_DENIED_ERROR' })) };
  await expect(migrate(executor)).rejects.toMatchObject({ code: 'ER_ACCESS_DENIED_ERROR' });
});
it('Batch 8 upgrades create the canonical login audit table on every safe rerun', async () => {
  const { readFileSync } = require('node:fs');
  const { resolve } = require('node:path');
  const { migrate } = require('../../../database/migrate_batch8');
  const schema = readFileSync(resolve(__dirname, '../../../database/schema.sql'), 'utf8');
  const canonical = schema.match(/CREATE TABLE IF NOT EXISTS security_logs \([\s\S]*?\);/)[0];
  const normalize = sql => sql.replace(/\s+/g, ' ').trim().replace(/;$/, '');
  const executor = { query: vi.fn(async sql => {
    if (sql.startsWith('ALTER')) throw Object.assign(new Error('Duplicate'), { code: 'ER_DUP_FIELDNAME' });
    return [{}];
  }) };
  await migrate(executor);
  await migrate(executor);
  const auditCreates = executor.query.mock.calls.filter(([sql]) => sql.startsWith('CREATE TABLE IF NOT EXISTS security_logs'));
  expect(auditCreates).toHaveLength(2);
  for (const [sql] of auditCreates) expect(normalize(sql)).toBe(normalize(canonical));
  expect(executor.query.mock.calls.every(([sql]) => !/^\s*(?:DROP|TRUNCATE|DELETE|UPDATE|INSERT)\b/i.test(sql))).toBe(true);
});
