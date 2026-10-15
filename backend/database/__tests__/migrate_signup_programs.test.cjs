const { migrate, PROGRAMS } = require('../migrate_signup_programs');
const names = [...new Set(PROGRAMS.map(([, college]) => college))];
function connection({ existing = [], colleges = names.map((name, index) => ({ id: index + 1, name })) } = {}) {
  return { beginTransaction: vi.fn(), commit: vi.fn(), rollback: vi.fn(),
    query: vi.fn().mockResolvedValueOnce([colleges]).mockResolvedValueOnce([existing]).mockResolvedValue([{}]) };
}
it('adds all 13 supplied programs under their actual college ids, including the historical hospitality name', async () => {
  const colleges = names.map((name, index) => ({ id: index + 10, name: name === 'College of Hospitality Management' ? 'College of International Hospitality Management' : name }));
  const db = connection({ colleges });
  const result = await migrate(db);
  expect(result.added).toBe(13);
  expect(result.programs).toHaveLength(13);
  expect(db.query).toHaveBeenCalledWith('INSERT INTO programs (college_id, name) VALUES (?, ?)', [13, 'BS Hospitality Management']);
  expect(db.commit).toHaveBeenCalledOnce();
  expect(db.query.mock.calls.map(([sql]) => sql).join('\n')).not.toMatch(/^(UPDATE|DELETE|DROP|ALTER)\s|users|student_profiles/im);
});
it('reruns without changing existing program names or inactive states', async () => {
  const db = connection({ existing: PROGRAMS.map(([name, college]) => ({ name, college_id: names.indexOf(college) + 1, is_active: 0 })) });
  expect((await migrate(db)).added).toBe(0);
  expect(db.query).toHaveBeenCalledTimes(2);
  expect(db.commit).toHaveBeenCalledOnce();
});
it.each(['missing', 'ambiguous'])('refuses a %s college before any insertion', async mode => {
  const colleges = names.map((name, index) => ({ id: index + 1, name }));
  if (mode === 'missing') colleges.pop();
  else colleges.push({ id: 99, name: 'College of International Hospitality Management' });
  const db = connection({ colleges });
  await expect(migrate(db)).rejects.toThrow('Resolve the missing or ambiguous college');
  expect(db.query).toHaveBeenCalledTimes(1);
  expect(db.rollback).toHaveBeenCalledOnce();
  expect(db.commit).not.toHaveBeenCalled();
});
it('rolls back additions if a write fails', async () => {
  const db = connection();
  db.query.mockRejectedValue(new Error('cannot write catalog'));
  await expect(migrate(db)).rejects.toThrow('cannot write catalog');
  expect(db.rollback).toHaveBeenCalledOnce();
  expect(db.commit).not.toHaveBeenCalled();
});
