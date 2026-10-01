const { pool } = require('../../config/db');
const model = require('../documentMessage.model');
beforeEach(() => vi.spyOn(pool, 'query').mockResolvedValue([[], []]));
it('uses the exported pool and parameterizes message text', async () => {
  await model.insert(11, 3, "' DROP TABLE users");
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('VALUES (?, ?, ?)'), [11, 3, "' DROP TABLE users"]);
});
it('bounds conversation reads to the latest 100 messages', async () => {
  await model.findByDocumentId(11);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY id DESC LIMIT 100'), [11, 11]);
});
it('routes notifications only to active Window 1 and legacy Receiving Desk accounts', async () => {
  await model.window1Recipients();
  const [sql] = pool.query.mock.calls[0];
  expect(sql).toContain('is_active = 1'); expect(sql).toContain("'Window 1', 'Receiving Desk'");
});
it('binds thread ownership, limit and offset parameters', async () => {
  await model.threadList(['student.id = ?'], [3], 2, 20, 'student');
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('WHERE student.id = ?'), [3, 20, 20]);
});
