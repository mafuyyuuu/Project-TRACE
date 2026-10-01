const model = require('../supportMessage.model');
it('bounds conversation reads and parameterizes identity twice', async () => {
  const executor = { query: vi.fn().mockResolvedValue([[]]) };
  await model.messages(3, executor);
  expect(executor.query.mock.calls[0][0]).toContain('LIMIT 100');
  expect(executor.query.mock.calls[0][1]).toEqual([3, 3]);
});
it('does not mark concurrently arriving replies as read', async () => {
  const executor = { query: vi.fn().mockResolvedValue([{}]) };
  await model.markRead(3, true, 7, executor);
  expect(executor.query.mock.calls[0][0]).toContain('id <= ?');
  expect(executor.query.mock.calls[0][0]).toContain('sender_id <> ?');
  expect(executor.query.mock.calls[0][1]).toEqual([3, 7, 3]);
});
