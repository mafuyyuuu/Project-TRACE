const { getProfileCompletion, isTransferStudent } = require('../profileCompletion');

const COMPLETE = { role: 'student', user_type: 'student', phone_number: '09123456789', email: 'student@example.test',
  birth_date: '2000-01-01', place_of_birth: 'City', sex: 'Male', civil_status: 'Single', home_address: 'Address',
  elem_school: 'Elementary', elem_grad_year: 2012, jhs_school: 'Junior High', jhs_grad_year: 2016,
  shs_school: 'Senior High', shs_grad_year: 2018 };
it('completes without optional extension name, avatar or non-transfer previous school', () => {
  expect(getProfileCompletion(COMPLETE)).toMatchObject({ complete: true, progress: 100, missing: [] });
});
it.each(Object.keys(COMPLETE).filter(key => !['role', 'user_type'].includes(key)))('requires nonblank %s', field => {
  const result = getProfileCompletion({ ...COMPLETE, [field]: '  ' });
  expect(result.complete).toBe(false);
  expect(result.progress).toBeLessThan(100);
  expect(result.missing).toContainEqual(expect.objectContaining({ field }));
});
it('keeps personal and education tab indicators consistent with progress', () => {
  expect(getProfileCompletion({ ...COMPLETE, birth_date: null })).toMatchObject({ missingPersonal: true, missingEdu: false });
  expect(getProfileCompletion({ ...COMPLETE, jhs_school: '' })).toMatchObject({ missingPersonal: false, missingEdu: true });
});
it('requires alumni attendance, married female maiden name and transfer school conditionally', () => {
  const profile = { ...COMPLETE, user_type: 'alumni', sex: 'Female', civil_status: 'Married', is_transfer_student: 1 };
  expect(getProfileCompletion(profile).missing.map(item => item.field)).toEqual(['maiden_name', 'last_attendance_year', 'previous_school']);
  expect(getProfileCompletion({ ...profile, maiden_name: 'Name', last_attendance_year: 2024, previous_school: 'School' }).complete).toBe(true);
});
it.each([false, 0, '0', null, undefined])('does not require a transfer school for %s', value => {
  expect(isTransferStudent(value)).toBe(false);
  expect(getProfileCompletion({ ...COMPLETE, is_transfer_student: value }).complete).toBe(true);
});
it.each([true, 1, '1'])('requires transfer school for %s', value => {
  expect(isTransferStudent(value)).toBe(true);
  expect(getProfileCompletion({ ...COMPLETE, is_transfer_student: value }).missing).toContainEqual({ field: 'previous_school', label: 'Previous School' });
});
it.each(['admin', 'clerk'])('does not classify staff with legacy student user_type as students: %s', role => {
  expect(getProfileCompletion({ role, user_type: 'student' })).toMatchObject({ complete: true, progress: 100 });
});
