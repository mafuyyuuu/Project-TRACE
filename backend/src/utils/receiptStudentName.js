const normalizeName = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[,\s]+/g, ' ').trim();
function fullNameFromParts(parts) {
  return ['first_name', 'middle_name', 'last_name'].map(key => typeof parts[key] === 'string' ? parts[key].trim() : '').filter(Boolean).join(' ');
}
/** Name parts describe the saved identity; they never change its words. */
function namePartsError(parts, student) {
  for (const key of ['first_name', 'middle_name', 'last_name']) {
    if (parts[key] != null && (typeof parts[key] !== 'string' || parts[key].length > 255 || Array.from(parts[key]).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) return 'Use name fields of at most 255 characters without control characters.';
  }
  const first = (parts.first_name || '').trim(), middle = (parts.middle_name || '').trim(), last = (parts.last_name || '').trim();
  if (!first && !middle && !last && !student?.first_name && !student?.last_name) return '';
  if (!first || !last) return 'Enter both First Name and Last Name. Middle Name is optional.';
  const saved = normalizeName(student?.full_name || student?.student_name);
  const initial = middle ? Array.from(middle)[0].toUpperCase() + '.' : '';
  const extensionValue = parts.extension_name || student?.extension_name || '';
  if (typeof extensionValue !== 'string' || extensionValue.length > 20) return 'Use a name extension of at most 20 characters.';
  const extension = extensionValue.trim();
  const variants = [`${first} ${middle} ${last}`, `${last}, ${first} ${middle}`, `${first} ${initial} ${last}`, `${last}, ${first} ${initial}`];
  if (!variants.some(value => normalizeName(value) === saved || extension && normalizeName(value + ' ' + extension) === saved)) return 'Name parts must match your saved Full Name. Contact the Registrar if your saved identity needs correction.';
  return '';
}
/** Existing single-field names are preserved until the student confirms parts. */
function receiptStudentName(student) {
  const saved = student?.student_name || student?.full_name || '';
  const name = typeof saved === 'string' ? saved.trim().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ', ') : '';
  if (!student?.first_name || !student?.last_name || namePartsError(student, { ...student, full_name: saved })) return name;
  const middle = (student.middle_name || '').trim();
  const suffix = (student.extension_name || '').trim();
  const formatted = `${student.last_name.trim()}${suffix ? ' ' + suffix : ''}, ${student.first_name.trim()}${middle ? ' ' + Array.from(middle)[0].toUpperCase() + '.' : ''}`;
  return formatted.length <= 255 ? formatted : name;
}
module.exports = { receiptStudentName, namePartsError, fullNameFromParts };
