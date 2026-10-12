const {migrate,statement}=require('../migrate_password_resets');
it('creates only an absent hashed-token reset table and preserves current reset links on rerun',async()=>{
  const executor={query:vi.fn()};await migrate(executor);await migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(2);expect(statement).toContain('CREATE TABLE IF NOT EXISTS password_resets');
  expect(statement).toContain('token_hash CHAR(64) NOT NULL UNIQUE');expect(statement).not.toMatch(/DELETE FROM|DROP TABLE|TRUNCATE/i);
});
