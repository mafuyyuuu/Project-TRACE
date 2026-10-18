import { INPUT_LIMITS } from '@/utils/inputLimits';
import { fullNameFromParts, namePartsError } from '@/utils/receiptStudentName';
import { phoneNumberError } from '@/utils/phoneNumber';
import { PASSWORD_REQUIREMENTS, validNewPassword } from '@/utils/passwordPolicy';
import { studyYearErrors } from '@/utils/profileYears';

/** Collect all actionable errors so applicants can correct fields together. */
export function signupFieldErrors(draft, { colleges, programs, file, catalog }) {
  const errors = {};
  if (draft.userType !== 'alumni' && !['regular', 'irregular'].includes(draft.study_load)) errors.study_load = 'Choose your Type of Student: Regular or Irregular.';
  if (draft.userType !== 'alumni' && draft.study_load === 'irregular') {
    if (!['true', 'false'].includes(draft.is_transfer_student)) errors.is_transfer_student = 'Choose Yes or No for transfer student.';
    if (draft.is_transfer_student === 'true' && (typeof draft.previous_school !== 'string' || !draft.previous_school.trim() || draft.previous_school.length > INPUT_LIMITS.name || Array.from(draft.previous_school).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) errors.previous_school = 'Enter your previous school, at most 255 characters without control characters.';
  }
  for (const [field, label] of [['employeeId', 'ID number'], ['first_name', 'First Name'], ['last_name', 'Last Name'], ['email', 'Email Address'], ['phoneNumber', 'Phone Number'], ['password', 'Password'], ['confirmPassword', 'Confirm Password']]) {
    if (!draft[field].trim()) errors[field] = `${label} is required.`;
  }
  if (draft.employeeId.length > INPUT_LIMITS.id) errors.employeeId = 'Use an ID number of at most 50 characters.';
  for (const field of ['first_name', 'middle_name', 'last_name']) {
    if (draft[field].length > INPUT_LIMITS.name || Array.from(draft[field]).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) errors[field] = 'Use at most 255 characters without control characters.';
  }
  const fullName = fullNameFromParts(draft);
  if (fullName.length > INPUT_LIMITS.name) errors.last_name = 'The combined Full Name must be at most 255 characters.';
  else if (!errors.first_name && !errors.last_name && namePartsError(draft, { full_name: fullName })) errors.last_name = namePartsError(draft, { full_name: fullName });
  if (draft.email.trim() && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) || draft.email.length > INPUT_LIMITS.email)) errors.email = 'Enter a valid email address, at most 255 characters.';
  if (draft.phoneNumber && phoneNumberError(draft.phoneNumber)) errors.phoneNumber = phoneNumberError(draft.phoneNumber);
  if (draft.password && !validNewPassword(draft.password)) errors.password = PASSWORD_REQUIREMENTS;
  if (draft.confirmPassword && draft.password !== draft.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  const college = colleges.find(row => row.name === draft.college);
  if (catalog.loading || catalog.error) errors.college = 'Load the college and program catalog before registering.';
  else if (!college) errors.college = 'Select your college.';
  if (!college || !programs.some(row => String(row.college_id) === String(college.id) && row.name === draft.program)) errors.program = 'Select a program belonging to your college.';
  if (!draft.privacyAcknowledged) errors.privacyAcknowledged = 'Read and acknowledge the Privacy Notice before registering.';
  const unavailable = draft.userType === 'alumni' && draft.proofUnavailable;
  if (draft.userType === 'alumni') Object.assign(errors, studyYearErrors(draft, { required: true }));
  if (unavailable && (!draft.proofReason.trim() || draft.proofReason.length > 500)) errors.proofReason = 'Explain why proof is unavailable in at most 500 characters.';
  if (!unavailable && !file) errors.proof = 'Please upload your proof of ID.';
  return errors;
}

/** Known API errors identify a field; unknown failures remain beside Submit. */
export function signupServerField(message) {
  if (/previous school/i.test(message)) return 'previous_school';
  if (/transfer student/i.test(message)) return 'is_transfer_student';
  if (/type of student|student status|study load/i.test(message)) return 'study_load';
  if (/\bID (?:is|number is) already registered\b/i.test(message)) return 'employeeId';
  if (/email (?:address )?(?:is |already |must |cannot |invalid)|valid email/i.test(message)) return 'email';
  if (/phone number|Philippine mobile/i.test(message)) return 'phoneNumber';
  if (/password|uppercase.*lowercase/i.test(message)) return 'password';
  if (/privacy notice|privacy acknowledgment/i.test(message)) return 'privacyAcknowledged';
  if (/choose .*program|active program|program belonging|Program\/Course/i.test(message)) return 'program';
  if (/choose .*college|active college/i.test(message)) return 'college';
  if (/explain why proof|why.*proof.*unavailable/i.test(message)) return 'proofReason';
  if (/Year Graduated|study-year gap/i.test(message)) return 'graduation_year';
  if (/Year Started/i.test(message)) return 'year_started';
  if (/proof of ID|ID proof|proof.*(?:required|file|MB)/i.test(message)) return 'proof';
  return null;
}
