const { check, requirements } = require('../check_schema');
it('maps missing recorded verification reasons to the preserving migration', async () => {
  const rows = requirements.flatMap(([table, columns]) => columns.filter(column => column !== 'verification_reason').map(column => ({ TABLE_NAME: table, COLUMN_NAME: column })));
  expect(await check({ query: vi.fn().mockResolvedValue([rows]) })).toEqual([{ field: 'users.verification_reason', migration: 'migrate_verification_reason.js' }]);
});
it('checks only metadata and accepts all required fields', async () => {
  const rows = requirements.flatMap(([table, columns]) => columns.map(column => ({ TABLE_NAME: table, COLUMN_NAME: column })));
  const executor = { query: vi.fn().mockResolvedValue([rows]) };
  expect(await check(executor)).toEqual([]);
  expect(executor.query).toHaveBeenCalledOnce();
  expect(executor.query.mock.calls[0][0]).toMatch(/^SELECT /);
});
it('identifies missing MFA schema with the exact migration instead of silently disabling it', async () => {
  const rows = requirements.flatMap(([table, columns]) => table === 'authenticator_credentials' ? [] : columns.map(column => ({ TABLE_NAME: table, COLUMN_NAME: column })));
  const result = await check({ query: vi.fn().mockResolvedValue([rows]) });
  expect(result).toContainEqual({ field: 'authenticator_credentials.user_id', migration: 'migrate_authenticator.js' });
  expect(result.every(item => item.migration === 'migrate_authenticator.js')).toBe(true);
});
it('propagates metadata failures without attempting writes', async () => {
  const executor = { query: vi.fn().mockRejectedValue(new Error('unavailable')) };
  await expect(check(executor)).rejects.toThrow('unavailable');
  expect(executor.query).toHaveBeenCalledOnce();
});
it('maps the password-history rollout gap and ordering ID to its explicit migration', async () => {
  const rows = requirements.flatMap(([table, columns]) => table === 'password_history' ? [] : columns.map(column => ({ TABLE_NAME: table, COLUMN_NAME: column })));
  const missing = await check({ query: vi.fn().mockResolvedValue([rows]) });
  expect(missing).toEqual(['id', 'user_id', 'password_hash', 'created_at'].map(column => ({
    field: `password_history.${column}`, migration: 'migrate_password_history.js',
  })));
});
it('identifies the exact missing pricing, messaging and template schema reported during rollout', async () => {
  const absent = new Set(['document_fee_schedules', 'document_messages', 'system_templates', 'request_attachment_uploads']);
  const rows = requirements.flatMap(([table, columns]) => absent.has(table) ? [] : columns.filter(column => !(table === 'document_types' && column === 'rental_fee')).map(column => ({ TABLE_NAME: table, COLUMN_NAME: column })));
  const missing = await check({ query: vi.fn().mockResolvedValue([rows]) });
  expect(missing).toContainEqual({ field: 'document_types.rental_fee', migration: 'migrate_fee_schedules.js' });
  expect(missing).toContainEqual({ field: 'document_messages.read_at', migration: 'migrate_document_messages.js' });
  expect(missing).toContainEqual({ field: 'system_templates.content', migration: 'migrate_templates.js' });
  expect(missing).toContainEqual({ field: 'document_fee_schedules.fee_items', migration: 'migrate_fee_schedules.js' });
  expect(missing).toContainEqual({ field: 'request_attachment_uploads.file_path', migration: 'migrate_request_attachments.js' });
});
