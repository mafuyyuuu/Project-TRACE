const { receiptStudentName, namePartsError } = require('../receiptStudentName');
it.each([
 [{full_name:'Ana Maria Dela Cruz',first_name:'Ana',middle_name:'Maria',last_name:'Dela Cruz'},'Dela Cruz, Ana M.'],
 [{full_name:'Ana Maria Dela Cruz',first_name:'Ana Maria',middle_name:'',last_name:'Dela Cruz'},'Dela Cruz, Ana Maria'],
 [{full_name:'Dela Cruz, Ana M.',first_name:'Ana',middle_name:'Maria',last_name:'Dela Cruz'},'Dela Cruz, Ana M.'],
 [{full_name:'José Andrés De la Cruz',first_name:'José',middle_name:'Andrés',last_name:'De la Cruz'},'De la Cruz, José A.'],
 [{full_name:'Juan A. Cruz Jr.',first_name:'Juan',middle_name:'Andres',last_name:'Cruz',extension_name:'Jr.'},'Cruz Jr., Juan A.']
])('formats confirmed name parts without splitting compound names', (student,expected)=>{
 expect(namePartsError(student,student)).toBe('');expect(receiptStudentName(student)).toBe(expected);
});
it('preserves legacy names and cannot relabel another saved identity',()=>{
 expect(receiptStudentName({student_name:'Ana Maria Dela Cruz'})).toBe('Ana Maria Dela Cruz');
 expect(receiptStudentName({student_name:'Another Student',first_name:'Ana',last_name:'Dela Cruz'})).toBe('Another Student');
 expect(namePartsError({first_name:'Another',last_name:'Person'},{full_name:'Ana Dela Cruz'})).toMatch(/saved Full Name/);
 expect(namePartsError({first_name:'Ana'},{full_name:'Ana Dela Cruz'})).toMatch(/both/);
 expect(namePartsError({first_name:'Ana\u0000',last_name:'Cruz'},{full_name:'Ana Cruz'})).toMatch(/control/);
 expect(namePartsError({first_name:42,last_name:'Cruz'},{full_name:'Ana Cruz'})).toMatch(/255/);
});
