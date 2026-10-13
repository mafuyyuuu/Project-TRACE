const { pool } = require('../../config/db');
const users = require('../../models/user.model');
const model = require('../../models/studyYears.model');
const service = require('../studyYears.service');
let connection;
const account = { id: 3, role: 'student', user_type: 'alumni', year_started: 2020, graduation_year: 2024 };
beforeEach(() => {
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(users, 'getProfileById').mockResolvedValue([account]);
  vi.spyOn(model, 'save').mockResolvedValue([{}]);
  vi.spyOn(model, 'record').mockResolvedValue([{}]);
});
it.each([{ year_started: '2021' }, { graduation_year: '' }, { graduation_year: '2025' }])('rejects self-correction before writes: %j', draft => {
  expect(() => service.validateSelf(draft, account)).toThrow(/authorized administrator/);
  expect(model.save).not.toHaveBeenCalled();
});
it('preserves unchanged historical years without normalization or an audit rewrite', async () => {
  await service.completeLocked({ ...account, year_started: 1995, graduation_year: 1999 }, { year_started: '1995', graduation_year: '1999' }, connection);
  expect(model.save).not.toHaveBeenCalled(); expect(model.record).not.toHaveBeenCalled();
});
it('fills missing years once and records the initial saved values', async () => {
  await service.completeLocked({ ...account, year_started: null, graduation_year: null }, { year_started: '2020', graduation_year: '2024' }, connection);
  expect(model.save).toHaveBeenCalledWith(3, { year_started: 2020, graduation_year: 2024 }, connection);
  expect(model.record).toHaveBeenCalledWith(expect.objectContaining({ actorId: 3, kind: 'initial', before: { year_started: null, graduation_year: null } }), connection);
});
it('rejects a concurrent correction when the locked account no longer has missing years', async () => {
  await expect(service.completeLocked(account, { year_started: '2021', graduation_year: '2025' }, connection)).rejects.toMatchObject({ status: 403 });
  expect(model.save).not.toHaveBeenCalled();
});
it.each(['student', 'clerk'])('rejects %s corrections before opening a transaction', async role => {
  await expect(service.correct({ id: 9, role }, 3, {})).rejects.toMatchObject({ status: 403 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it.each(['', ' '.repeat(5), 'x'.repeat(1001)])('requires a bounded correction reason', async reason => {
  await expect(service.correct({ id: 9, role: 'admin' }, 3, { reason })).rejects.toMatchObject({ status: 400 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('locks the student and commits corrected years with the original values, actor and reason', async () => {
  await service.correct({ id: 9, role: 'admin' }, 3, { year_started: '2019', graduation_year: '2024', reason: ' Checked registrar record ' });
  expect(users.getProfileById).toHaveBeenCalledWith(3, connection, true);
  expect(model.record).toHaveBeenCalledWith({ userId: 3, actorId: 9, kind: 'correction', before: { year_started: 2020, graduation_year: 2024 }, after: { year_started: 2019, graduation_year: 2024 }, reason: 'Checked registrar record' }, connection);
  expect(connection.commit).toHaveBeenCalledOnce(); expect(connection.rollback).not.toHaveBeenCalled();
});
it('rolls back the year write when its audit write fails', async () => {
  model.record.mockRejectedValue(new Error('audit unavailable'));
  await expect(service.correct({ id: 9, role: 'admin' }, 3, { year_started: '2019', graduation_year: '2024', reason: 'Checked record' })).rejects.toThrow('audit unavailable');
  expect(connection.rollback).toHaveBeenCalledOnce(); expect(connection.commit).not.toHaveBeenCalled(); expect(connection.release).toHaveBeenCalledOnce();
});
it.each([{ year_started: '2001', graduation_year: '2005' }, { year_started: '2010', graduation_year: '2021' }, { year_started: '2024', graduation_year: '2020' }, { year_started: '2e3', graduation_year: '2024' }])('rejects invalid corrections without writing %j', async draft => {
  await expect(service.correct({ id: 9, role: 'admin' }, 3, { ...draft, reason: 'Checked record' })).rejects.toMatchObject({ status: 400 });
  expect(model.save).not.toHaveBeenCalled(); expect(connection.rollback).toHaveBeenCalledOnce();
});
it.each([null, { ...account, role: 'clerk' }])('never corrects a missing or staff profile', async row => {
  users.getProfileById.mockResolvedValue(row ? [row] : []);
  await expect(service.correct({ role: 'admin' }, 3, { reason: 'Checked record' })).rejects.toMatchObject({ status: 404 });
  expect(model.save).not.toHaveBeenCalled();
});
