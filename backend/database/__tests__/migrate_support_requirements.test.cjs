const {migrate}=require('../migrate_support_requirements');
it('preserves legacy identities, uploads and reviews across reruns while adding stable catalog identity',async()=>{
  const executor={query:vi.fn().mockResolvedValue([[]])};
  await migrate(executor);await migrate(executor);
  const sql=executor.query.mock.calls.map(([statement])=>statement).join('\n');
  expect(sql).toContain("identity_key=CONCAT('legacy:',id) WHERE identity_key IS NULL");
  expect(sql).toContain('replacement_of');expect(sql).toContain('WHERE NOT EXISTS');
  expect(sql).toContain('ON DELETE SET NULL');expect(sql).not.toMatch(/DELETE FROM|TRUNCATE|DROP TABLE|INSERT INTO supporting_document_types\s*\(/i);
});
