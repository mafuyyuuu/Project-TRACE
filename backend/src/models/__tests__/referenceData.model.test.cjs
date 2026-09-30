const model = require('../referenceData.model');

describe('document policy SQL', () => {
  it('binds each insert field to exactly one placeholder, including policy fields', async () => {
    const executor = { query: vi.fn().mockResolvedValue([{ insertId: 7 }]) };
    await model.createDocumentType({ name: 'Test', available_to: 'alumni', is_repeatable: false }, executor);
    const [sql, values] = executor.query.mock.calls[0];
    expect((sql.match(/\?/g) || []).length).toBe(values.length);
    expect(values).toHaveLength(13);
    expect(values[7]).toBe('alumni');
    expect(values[8]).toBe(false);
  });
  it('writes false settings and clears college restrictions through the same executor', async () => {
    const executor = { query: vi.fn().mockResolvedValue([[]]) };
    await model.updateDocumentType(7, { is_repeatable: false, is_walk_in: false }, executor);
    expect(executor.query.mock.calls[0][1].slice(8, 10)).toEqual([false, false]);
    await model.setDocumentTypeColleges(7, [], executor);
    expect(executor.query).toHaveBeenLastCalledWith('DELETE FROM document_type_colleges WHERE document_type_id = ?', [7]);
  });
  it('returns college IDs as numbers and loads policy fields for multi-item submissions', async () => {
    const executor = { query: vi.fn().mockResolvedValue([[{ name: 'Test', allowed_college_ids: '1,4', available_to: 'student' }]]) };
    const rows = await model.findDocumentTypesByNames(['Test'], executor);
    expect(rows[0].allowed_college_ids).toEqual([1, 4]);
    expect(executor.query.mock.calls[0][0]).toContain('document_types.*');
    await model.setDocumentTypeColleges(7, [1, 4], executor);
    expect(executor.query.mock.calls.at(-1)[1]).toEqual([7, 1, 7, 4]);
  });
});
