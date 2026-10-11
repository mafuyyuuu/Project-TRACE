const {packPattern,serialAt}=require('../receiptSerial');
const {snapshot,amountWords,printConfig}=require('../receiptSnapshot');
it('preserves the year/padding and explicitly increments the selected segment through the 50th serial',()=>{
 const result=packPattern('2026-00001',1);expect(result.first).toEqual(['2026-00001','2026-00002','2026-00003']);expect(result.last).toBe('2026-00050');expect(result.serials).toHaveLength(50);expect(()=>serialAt(result.pattern,50)).toThrow('exhausted');
});
it('supports an alphanumeric issuance format supplied by Finance',()=>{expect(packPattern('AA2346491').last).toBe('AA2346540');expect(packPattern('BOOK/00001-Z').last).toBe('BOOK/00050-Z');});
it.each([['2026-00001',undefined],['AA',undefined],['A99',undefined],['<script>00001',undefined],['00001',2]])('rejects ambiguous, unsupported or overflowing %s', (serial,segment)=>{expect(()=>packPattern(serial,segment)).toThrow();});
it('uses saved decimal line amounts without float accumulation, payment reference and actual cashier',()=>{
 const result=snapshot([{id:1,student_id:'DEMO001',student_name:'Demo Person',document_type:'TOR',amount:'100.10',gcash_reference_no:'PAY-DEMO'},{id:2,student_id:'DEMO001',document_type:'Diploma',amount:'50.20',gcash_reference_no:'PAY-DEMO'}],{id:4,full_name:'Demo Cashier'},'DEMO00001','2026-10-11','Person, Demo');
 expect(result.total_centavos).toBe(15030);expect(result.amount_words).toBe('One Hundred Fifty Pesos and 30/100');expect(result.payment_reference).toBe('PAY-DEMO');expect(result.items[0]).toMatchObject({fund_code:'',account_code:''});expect(result.saved_student_name).toBe('Demo Person');expect(result.cashier_name).toBe('Demo Cashier');
});
it.each([null,-1,'0.001','NaN'])('rejects absent or unsupported saved money %s',amount=>expect(()=>snapshot([{student_id:'A',student_name:'Demo',amount}],{},'A00001','2026-10-11')).toThrow());
it('rejects mixed owner/reference groups and invalid print calibration',()=>{
 expect(()=>snapshot([{student_id:'A'},{student_id:'B'}],{},'A','2026-10-11')).toThrow('inconsistent');
 expect(()=>snapshot([{student_id:'A',student_name:'Demo',amount:1,gcash_reference_no:'A'},{student_id:'A',amount:1,gcash_reference_no:'B'}],{},'A','2026-10-11')).toThrow('references');
 expect(()=>printConfig({width_mm:0})).toThrow();expect(()=>printConfig({offset_y_mm:Infinity})).toThrow();expect(amountWords(0)).toBe('Zero Pesos and 00/100');
});
