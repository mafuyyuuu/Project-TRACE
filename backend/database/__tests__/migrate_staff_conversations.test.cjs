const {migrate,statements}=require('../migrate_staff_conversations');
it('adds only separate preserving staff tables, with pair and retry uniqueness',async()=>{
  const executor={query:vi.fn().mockResolvedValue([])};await migrate(executor);await migrate(executor);expect(executor.query).toHaveBeenCalledTimes(6);
  for(const sql of statements){expect(sql).toContain('CREATE TABLE IF NOT EXISTS staff_');expect(sql).not.toMatch(/\b(UPDATE|DELETE|INSERT|DROP|support_tickets|internal_assistance_tickets)\b/);expect(sql).toContain('ENGINE=InnoDB');}
  expect(statements.join('\n')).toContain('UNIQUE KEY staff_chat_pair (participant_low,participant_high,scope_college_id)');expect(statements.join('\n')).toContain('UNIQUE KEY staff_chat_retry (actor_id,client_key)');
});
