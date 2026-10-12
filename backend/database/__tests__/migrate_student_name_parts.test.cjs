const { migrate } = require('../migrate_student_name_parts');
it('adds only missing name columns and never rewrites an identity or receipt',async()=>{
 const executor={query:vi.fn().mockResolvedValueOnce([[{COLUMN_NAME:'user_id'},{COLUMN_NAME:'middle_name'}]]).mockResolvedValue([])};
 await migrate(executor);expect(executor.query.mock.calls.slice(1).map(([sql])=>sql)).toEqual([
 'ALTER TABLE student_profiles ADD COLUMN first_name VARCHAR(255) NULL',
 'ALTER TABLE student_profiles ADD COLUMN last_name VARCHAR(255) NULL'
 ]);
 expect(executor.query.mock.calls.map(([sql])=>sql).join(' ')).not.toMatch(/UPDATE|DELETE|DROP/);
});
it('is safe to rerun and refuses to create an incomplete profile table',async()=>{
 const executor={query:vi.fn().mockResolvedValue([[{COLUMN_NAME:'user_id'},{COLUMN_NAME:'first_name'},{COLUMN_NAME:'middle_name'},{COLUMN_NAME:'last_name'}]])};
 await migrate(executor);expect(executor.query).toHaveBeenCalledOnce();
 executor.query.mockResolvedValue([[]]);await expect(migrate(executor)).rejects.toThrow('migrate_student_profiles');
});
