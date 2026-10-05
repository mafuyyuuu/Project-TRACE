const {migrate,statement}=require('../migrate_payment_methods');
it('preserves configured payment methods and does not seed invented instructions',async()=>{
  const executor={query:vi.fn()};await migrate(executor);await migrate(executor);
  expect(executor.query).toHaveBeenCalledTimes(2);expect(statement).toContain('CREATE TABLE IF NOT EXISTS payment_methods');
  expect(statement).not.toMatch(/INSERT|UPDATE|DELETE FROM|DROP TABLE|TRUNCATE/i);
});
