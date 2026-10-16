const {documentCsv,manilaTimestamp,readableDetails,readableFees}=require('../reportCsv');
it('exports exact Manila date/time without ISO syntax',()=>{
 expect(manilaTimestamp('2026-10-06T15:59:10Z')).toBe('2026-10-06 23:59:10');
 expect(manilaTimestamp('2026-10-06T23:59:10+08:00')).toBe('2026-10-06 23:59:10');
 expect(manilaTimestamp('bad')).toBe('');
});
it('renders structured purpose and request details without discarding study years or flags',()=>{
 expect(readableDetails('{"purpose":"Employment","year_started":2010,"original_seen":true}')).toBe('Purpose: Employment; Year Started: 2010; Original Seen: Yes');
 expect(readableDetails('true')).toBe('true');expect(readableDetails('Reason, with "quotes"')).toBe('Reason, with "quotes"');
});
it('renders fee amounts and calculations as readable text',()=>{
 expect(readableFees('[{"rate":100,"label":"Document Fee","units":1,"amount":100,"calculation":"1 copies × PHP 100.00"}]')).toBe('Document Fee · PHP 100.00 · 1 copies × PHP 100.00');
});
it('keeps spreadsheet escaping and quoted commas/newlines after readable conversion',()=>{
 const csv=documentCsv([{purpose:'=HYPERLINK("bad")',fee_lines:[{label:'Fee, "test"',amount:100}],created_at:'2026-10-06T15:59:10Z'}]);
 expect(csv).toContain("'=HYPERLINK");expect(csv).toContain('Fee, ""test""');expect(csv).toContain('2026-10-06 23:59:10');
 expect(csv).not.toContain('[{"');
});
