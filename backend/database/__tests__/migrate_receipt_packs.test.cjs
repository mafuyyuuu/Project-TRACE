const {migrate,statements}=require('../migrate_receipt_packs');
it('creates preserving InnoDB tables and singleton control, with serial/retry/group uniqueness',async()=>{
 let indexed=false;const executor={query:vi.fn().mockImplementation(async sql=>{if(sql.startsWith('SELECT INDEX_NAME'))return [indexed?[{INDEX_NAME:'idx_documents_or_number'}]:[]];if(sql.startsWith('ALTER TABLE'))indexed=true;return [[]];})};await migrate(executor);await migrate(executor);
 expect(executor.query).toHaveBeenCalledTimes(statements.length*2+3);
 const sql=statements.join('\n');expect(sql).toContain('UNIQUE KEY receipt_serial (serial)');expect(sql).toContain('UNIQUE KEY receipt_retry_key (client_key)');expect(sql).toContain('UNIQUE KEY receipt_active_group (active_group)');expect(sql).toContain('UNIQUE KEY pack_position (pack_id,position)');expect(sql).toContain('INSERT IGNORE');
 expect(statements.filter(s=>s.startsWith('CREATE TABLE IF NOT EXISTS'))).toHaveLength(5);
 expect(executor.query.mock.calls.filter(([sql])=>sql.startsWith('ALTER TABLE'))).toHaveLength(1);
 expect(sql).not.toMatch(/UPDATE documents|DELETE|TRUNCATE|DROP TABLE|INSERT INTO documents/);
});
it('stops on a failed schema write',async()=>{const executor={query:vi.fn().mockRejectedValue(new Error('DDL failure'))};await expect(migrate(executor)).rejects.toThrow('DDL failure');expect(executor.query).toHaveBeenCalledOnce();});
