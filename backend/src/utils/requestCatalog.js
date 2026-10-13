// Registrar-confirmed options for new requests. Historical type names remain
// in the database; the catalog migration deactivates rather than renames them.
const SET_NAMES = ['For Second Course (Bachelor Degree)', 'For Graduate School', 'For Masters', 'For CTP', 'Transfer Credentials'];
const pageFee = (label, amount) => ({ label, amount, fee_rule: 'per_page' });
const option = (name, base_fee, fee_rule = 'flat', extra = {}) => ({ name, base_fee, fee_rule, available_to: 'both', ...extra });
const REQUEST_CATALOG = [
  ...SET_NAMES.map((name, index) => option(name, 100, index === 2 ? 'per_page' : 'flat', {
    base_label: 'Set of Honorable Dismissal',
    catalog_description: index === 4 ? 'Set of Honorable Dismissal, Copy of Grade, and Transcript of Records' : 'Set of Honorable Dismissal and Transcript of Records copy for Enrolled University',
    fee_items: index === 4 ? [pageFee('Copy of Grade', 50), pageFee('Transcript of Records', 100)] : [pageFee('Transcript of Records copy for Enrolled University', 100)],
  })),
  ...['Employment', 'Evaluation', 'Promotion', 'Travel', 'Board Exam'].map(purpose => option(`Transcript of Records for ${purpose}`, 100, 'per_page')),
  option('Copy of Grades', 100, 'per_page'),
  option('Permanent Records', 50),
  option('Authentication of Documents (CTC)', 100, 'per_page'),
  option('CHED-CAV', 80, 'flat', { fee_items: [pageFee('CTC Attachment', 100)], catalog_description: 'CHED-CAV with CTC attachment' }),
  ...['Enrollment', 'Enrolled Subject', 'Non-Record', 'Year-Level', 'English as a Medium of Instruction', 'Non-Credited Courses', 'Remaining Units', 'Units Earned', 'Completion of Cross-Enrolled Subject', 'Completion of Academic Requirements', 'Specialization-Units Earned', 'Graduation', 'Honor', 'General Weighted Average (GWA)', 'College Ranking', 'Issuance Deferral'].map(label => option(`Certificate of ${label}`, 50, label === 'English as a Medium of Instruction' ? 'per_page' : 'flat')),
  ...['Application for Graduation', 'Claim Stub/Receiving Copy', 'Certificate of Registration (COR)', 'Report of Official Grade (ROG)'].map(label => option(`Second Copy of ${label}`, 100)),
  option('NSTP Serial Number', 50),
  option('Diploma 2nd Copy', 250),
  option('Course Description', 50, 'per_page'),
  option('Certificate of Underload Units', 0, 'flat', { fee_pending: true }),
];
const DISMISSAL_NAMES = ['Honorable Dismissal', ...SET_NAMES];
const normalizeName = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const includesDismissal = name => DISMISSAL_NAMES.some(type => normalizeName(type) === normalizeName(name));
const needsStudyYears = name => /^Transcript of Records(?:\b|\s*\()/i.test(name) || SET_NAMES.includes(name);
const needsGraduationYear = name => ['Diploma', 'Diploma 2nd Copy', 'Graduation Clearance'].includes(name);
const needsRequestingSchool = name => SET_NAMES.includes(name) || ['Transcript of Records', 'Honorable Dismissal'].includes(name);
module.exports = { REQUEST_CATALOG, SET_NAMES, DISMISSAL_NAMES, includesDismissal, needsStudyYears, needsGraduationYear, needsRequestingSchool };
