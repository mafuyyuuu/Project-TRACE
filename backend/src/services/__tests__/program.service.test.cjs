const { pool } = require('../../config/db');
const model = require('../../models/program.model');
const reference = require('../../models/referenceData.model');
const users = require('../../models/user.model');
const service = require('../program.service');
const auth = require('../auth.service');
let connection;
const student = { id: 3, role: 'student', college_id: 1, course: 'Old College', program: 'Historical Program' };
const admin = { id: 7, role: 'admin' };
beforeEach(() => {
  connection = { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(), release: vi.fn() };
  vi.spyOn(pool, 'getConnection').mockResolvedValue(connection);
  vi.spyOn(model, 'list').mockResolvedValue([]);
  vi.spyOn(model, 'lockCollege').mockResolvedValue({ id: 2, name: 'New College', is_active: 1 });
  vi.spyOn(reference, 'findCollegeById').mockResolvedValue([{ id: 2, name: 'New College', is_active: 1 }]);
  vi.spyOn(model, 'find').mockResolvedValue({ id: 9, college_id: 2, name: 'Approved Program', is_active: 1 });
  vi.spyOn(model, 'findByName').mockResolvedValue({ id: 9, college_id: 2, name: 'Approved Program', is_active: 1 });
  vi.spyOn(model, 'create').mockResolvedValue(9);
  vi.spyOn(model, 'setActive').mockResolvedValue([{}]);
  vi.spyOn(users, 'getProfileById').mockResolvedValue([student]);
  vi.spyOn(users, 'updateProfile').mockResolvedValue([{}]);
  vi.spyOn(users, 'upsertProfile').mockResolvedValue([{}]);
});
it.each(['student', 'clerk', undefined])('denies catalog management for %s before database access', async role => {
  for (const action of [() => service.list({ role }), () => service.create({ role }, { college_id: 2, name: 'Program' }), () => service.setActive({ role }, 9, false)]) {
    await expect(action()).rejects.toMatchObject({ status: 403 });
  }
  expect(pool.getConnection).not.toHaveBeenCalled(); expect(model.list).not.toHaveBeenCalled();
});
it('adds only an approved name under an active college and commits', async () => {
  model.findByName.mockResolvedValue(null);
  await expect(service.create(admin, { college_id: '2', name: ' Approved Program ' })).resolves.toMatchObject({ id: 9 });
  expect(model.create).toHaveBeenCalledWith(2, 'Approved Program', connection);
  expect(connection.commit).toHaveBeenCalledOnce(); expect(connection.release).toHaveBeenCalledOnce();
});
it('rejects duplicates, including inactive entries, without creating or deleting data', async () => {
  model.findByName.mockResolvedValue({ is_active: 0 });
  await expect(service.create(admin, { college_id: 2, name: 'Approved Program' })).rejects.toMatchObject({ status: 400 });
  expect(model.create).not.toHaveBeenCalled(); expect(connection.rollback).toHaveBeenCalledOnce();
});
it.each(['', ' '.repeat(2), 'a'.repeat(151), 123])('rejects invalid catalog names before writes', async name => {
  await expect(service.create(admin, { college_id: 2, name })).rejects.toMatchObject({ status: 400 });
  expect(pool.getConnection).not.toHaveBeenCalled();
});
it('rejects an inactive college and a restore underneath one', async () => {
  model.lockCollege.mockResolvedValue({ id: 2, is_active: 0 });
  await expect(service.create(admin, { college_id: 2, name: 'Program' })).rejects.toMatchObject({ status: 400 });
  await expect(service.setActive(admin, 9, true)).rejects.toMatchObject({ status: 400 });
  expect(model.setActive).not.toHaveBeenCalled();
});
it('deactivates only catalog availability, preserving historical profiles', async () => {
  await service.setActive(admin, 9, false);
  expect(model.setActive).toHaveBeenCalledWith(9, false, connection);
  expect(users.updateProfile).not.toHaveBeenCalled();
});
it('rejects missing ids and nonboolean toggle flags', async () => {
  await expect(service.setActive(admin, 9, 'false')).rejects.toMatchObject({ status: 400 });
  model.find.mockResolvedValue(null);
  await expect(service.setActive(admin, 9, false)).rejects.toMatchObject({ status: 404 });
});
it('preserves untouched historical values without needing the new catalog', async () => {
  expect(await service.profileFields(student, { program: student.program, college_id: '1' })).toEqual({});
  expect(model.findByName).not.toHaveBeenCalled(); expect(reference.findCollegeById).not.toHaveBeenCalled();
  await auth.updateProfile(3, { phone_number: 'synthetic' });
  expect(users.updateProfile).toHaveBeenCalledWith(3, { phone_number: 'synthetic' });
});
it('canonicalizes the three distinct academic fields from trusted reference data', async () => {
  expect(await service.profileFields(student, { college_id: '2', program: ' Approved Program ', course: 'forged' })).toEqual({ college_id: 2, course: 'New College', program: 'Approved Program' });
  expect(model.findByName).toHaveBeenCalledWith(2, 'Approved Program', pool, false);
});
it.each([null, { is_active: 0 }])('rejects missing or inactive programs before any profile write', async row => {
  model.findByName.mockResolvedValue(row);
  await expect(auth.updateProfile(3, { college_id: 2, program: 'Program', phone_number: 'changed' })).rejects.toMatchObject({ status: 400 });
  expect(users.updateProfile).not.toHaveBeenCalled(); expect(users.upsertProfile).not.toHaveBeenCalled();
});
it('rejects a program from another college and raw display-name edits', async () => {
  model.findByName.mockImplementation(async college => college === 2 ? null : { is_active: 1 });
  await expect(service.profileFields(student, { college_id: 2, program: student.program })).rejects.toMatchObject({ status: 400 });
  await expect(service.profileFields(student, { course: 'forged' })).rejects.toMatchObject({ status: 400 });
});
it('rejects changed staff academic values', async () => {
  await expect(service.profileFields({ ...student, role: 'clerk' }, { college_id: 2, program: 'Program' })).rejects.toMatchObject({ status: 403 });
});
it('revalidates inside the write transaction and saves college, display name and program together', async () => {
  await auth.updateProfile(3, { college_id: 2, program: 'Approved Program' });
  expect(users.getProfileById).toHaveBeenCalledWith(3, connection, true);
  expect(model.findByName).toHaveBeenLastCalledWith(2, 'Approved Program', connection, true);
  expect(users.updateProfile).toHaveBeenCalledWith(3, { college_id: 2, course: 'New College', program: 'Approved Program' }, connection);
  expect(connection.commit).toHaveBeenCalledOnce();
});
it('rolls back if a program is deactivated between initial validation and the locked write', async () => {
  model.findByName.mockResolvedValueOnce({ is_active: 1, name: 'Program' }).mockResolvedValueOnce({ is_active: 0 });
  await expect(auth.updateProfile(3, { college_id: 2, program: 'Program' })).rejects.toMatchObject({ status: 400 });
  expect(users.updateProfile).not.toHaveBeenCalled(); expect(connection.rollback).toHaveBeenCalledOnce(); expect(connection.release).toHaveBeenCalledOnce();
});
