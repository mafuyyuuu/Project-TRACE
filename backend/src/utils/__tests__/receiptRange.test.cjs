const { packRange } = require('../receiptSerial');
it.each([
 ['2026-00001','2026-00050',1], ['BOOK/00001-Z','BOOK/00050-Z',0], ['AA2346491','AA2346540',0],
 ['00001/2026','00050/2026',0]
])('derives a fifty-number range without a numeric segment selector: %s', (first,last,segment)=>{
 const pack=packRange(first,last);
 expect(pack.serials).toHaveLength(50);expect(pack.serials[0]).toBe(first);expect(pack.last).toBe(last);expect(pack.pattern.segment).toBe(segment);
 expect(new Set(pack.serials).size).toBe(50);
});
it.each([
 ['2026-00001','2026-00049'],['2026-00001','2026-00051'],['2026-00001','2027-00050'],
 ['A00001','B00050'],['2026-00050','2026-00001'],['A99','A148'],['00001','50'],
 ['<script>00001','<script>00050'],['00001',''],['AA','ZZ']
])('refuses invalid or incompatible first/last numbers: %s to %s', (first,last)=>expect(()=>packRange(first,last)).toThrow());
