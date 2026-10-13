const PROFILE_YEAR_FIELDS = {
  year_started: { label: 'Year Started', minimum: 2002 },
  graduation_year: { label: 'PLP/College Year Graduated', minimum: 2002 },
  last_attendance_year: { label: 'Last Attendance Year', minimum: 1000 },
  elem_grad_year: { label: 'Elementary Year Graduated', minimum: 1000 },
  jhs_grad_year: { label: 'Junior High Year Graduated', minimum: 1000 },
  shs_grad_year: { label: 'Senior High Year Graduated', minimum: 1000 },
};

function manilaYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Manila', year: 'numeric' }).format(now));
}

// Draft years travel as text so exponent/decimal notation cannot be normalized
// into a valid integer before validation. Readers explicitly stringify saved INTs.
function yearError(value, { label, minimum = 1000, required = false }, now = new Date()) {
  if (value === '' || value === null || value === undefined) return required ? `${label} is required.` : '';
  if (typeof value !== 'string' || !/^[1-9][0-9]{3}$/.test(value)) return `${label} must contain exactly four digits.`;
  const maximum = manilaYear(now);
  if (Number(value) < minimum || Number(value) > maximum) return minimum === 2002
    ? `${label} must be between 2002 and ${maximum}.`
    : `${label} must be a four-digit year no later than ${maximum}.`;
  return '';
}

function studyYearErrors(draft, { required = false, now = new Date() } = {}) {
  const errors = {};
  for (const field of ['year_started', 'graduation_year']) {
    const error = yearError(draft[field], { ...PROFILE_YEAR_FIELDS[field], required: required || (field === 'year_started' && Boolean(draft.graduation_year)) }, now);
    if (error) errors[field] = error;
  }
  if (!Object.keys(errors).length && draft.year_started && draft.graduation_year) {
    const gap = Number(draft.graduation_year) - Number(draft.year_started);
    if (gap < 0) errors.graduation_year = 'Year Graduated cannot precede Year Started.';
    else if (gap > 10) errors.graduation_year = 'The study-year gap cannot exceed 10 years.';
  }
  return errors;
}

function profileYearErrors(draft, account, { onlyProvided = false, now = new Date() } = {}) {
  const errors = {};
  for (const [field, definition] of Object.entries(PROFILE_YEAR_FIELDS)) {
    if (onlyProvided && !Object.hasOwn(draft, field)) continue;
    const required = ['year_started', 'graduation_year'].includes(field) && account?.role === 'student' && account.user_type === 'alumni';
    const error = yearError(draft[field], { ...definition, required }, now);
    if (error) errors[field] = error;
  }
  return errors;
}

module.exports = { PROFILE_YEAR_FIELDS, manilaYear, yearError, studyYearErrors, profileYearErrors };
