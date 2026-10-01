// Completion uses saved personal and education fields, never an avatar or extension name.
const PERSONAL = [
  ['phone_number', 'Phone Number'], ['email', 'Email Address'], ['birth_date', 'Birth Date'],
  ['place_of_birth', 'Place of Birth'], ['sex', 'Sex'], ['civil_status', 'Civil Status'],
  ['home_address', 'Home Address'],
];
const EDUCATION = [
  ['elem_school', 'Elementary School'], ['elem_grad_year', 'Elementary Graduation Year'],
  ['jhs_school', 'Junior High School'], ['jhs_grad_year', 'Junior High Graduation Year'],
  ['shs_school', 'Senior High School'], ['shs_grad_year', 'Senior High Graduation Year'],
];
function isTransferStudent(value) { return value === true || value === 1 || value === '1'; }
function getProfileCompletion(profile = {}) {
  if (profile.role !== 'student') return { complete: true, progress: 100, missing: [], missingPersonal: false, missingEdu: false };
  const personal = [...PERSONAL], education = [...EDUCATION];
  if (profile.sex === 'Female' && profile.civil_status === 'Married') personal.push(['maiden_name', 'Maiden Name']);
  if (profile.user_type === 'alumni') education.push(['last_attendance_year', 'Last Attendance Year']);
  if (isTransferStudent(profile.is_transfer_student)) education.push(['previous_school', 'Previous School']);
  const absent = ([field]) => profile[field] == null || String(profile[field]).trim() === '';
  const missingPersonal = personal.filter(absent), missingEdu = education.filter(absent);
  const missing = [...missingPersonal, ...missingEdu].map(([field, label]) => ({ field, label }));
  return { complete: missing.length === 0, progress: Math.round((1 - missing.length / (personal.length + education.length)) * 100),
    missing, missingPersonal: missingPersonal.length > 0, missingEdu: missingEdu.length > 0 };
}

export { getProfileCompletion, isTransferStudent };
