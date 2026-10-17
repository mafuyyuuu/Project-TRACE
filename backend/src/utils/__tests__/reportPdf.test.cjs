const {PDFDocument}=require('pdf-lib');
const {createReport}=require('../reportPdf');
it('creates a real, embedded-font multipage report with long cells and repeated headers',async()=>{
 const doc=await createReport({title:'Synthetic José Peñaflor Report',period:'Test period',generatedAt:'2026-10-17 12:00:00'});
 doc.table(['Name','Value'],Array.from({length:90},(_,i)=>['José '+i,i===1?'LONG'.repeat(1200):'Wrap this long measured value with readable words.']),[1,2]);
 doc.bars('Measured zeros',[{label:'No completions',value:0}]);doc.series('Recorded dates',[{label:'2026-10-01',value:0}]);doc.text('Non-Latin: 李');doc.advice({source:'unavailable',insights:[]});
 const bytes=await doc.save();expect(bytes.subarray(0,5).toString()).toBe('%PDF-');const parsed=await PDFDocument.load(bytes);expect(parsed.getPageCount()).toBeGreaterThan(4);expect(parsed.getPageCount()).toBeLessThan(30);expect(parsed.getTitle()).toBe('Synthetic José Peñaflor Report');
},15000);
it('renders an empty report without fabricated charts',async()=>{const doc=await createReport({title:'Empty',period:'No rows',generatedAt:'2026-10-17'});doc.bars('Counts',[]);doc.table(['A','B'],[],[1,1]);doc.series('Releases',[]);expect((await PDFDocument.load(await doc.save())).getPageCount()).toBe(1);});
