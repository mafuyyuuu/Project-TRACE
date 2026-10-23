const fs=require('fs'),path=require('path');
const manual=require('../migrate_manual_faq_feedback'),release=require('../migrate_release_policy');
it('installs FAQ persistence identically on fresh and existing schemas',async()=>{
  expect(fs.readFileSync(path.resolve(__dirname,'../schema.sql'),'utf8')).toContain(manual.SQL+';');
  const executor={query:vi.fn().mockResolvedValue([[]])};await manual.migrate(executor);await manual.migrate(executor);expect(executor.query).toHaveBeenCalledTimes(2);
});
it('adds the release snapshot without backfilling old estimates or bills',async()=>{
  const executor={query:vi.fn().mockResolvedValueOnce([[]]).mockResolvedValueOnce([{}])};await release.migrate(executor);
  expect(executor.query.mock.calls[1][0]).toBe('ALTER TABLE documents ADD COLUMN release_working_days TINYINT UNSIGNED NULL');
  executor.query.mockClear().mockResolvedValue([[{COLUMN_NAME:'release_working_days'}]]);await release.migrate(executor);expect(executor.query).toHaveBeenCalledTimes(1);
});
