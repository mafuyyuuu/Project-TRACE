const {migrate,statements}=require('../migrate_internal_assistance');
it('creates only isolated preserving tables and can be rerun',async () => {
  const executor={query:vi.fn().mockResolvedValue([])};await migrate(executor);await migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(6);
  for (const sql of statements) {expect(sql).toContain('CREATE TABLE IF NOT EXISTS internal_assistance_');expect(sql).not.toMatch(/\b(INSERT|DELETE|UPDATE|DROP|student_user_id|documents)\b/i);expect(sql).toContain('ENGINE=InnoDB');}
  expect(statements.join('\n')).toContain('UNIQUE KEY internal_actor_retry (actor_id,client_key)');
});
