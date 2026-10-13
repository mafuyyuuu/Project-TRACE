export const sameDayWalkInTypes = ['CTC', '2nd Copy of COR', '2nd Copy of OGR', 'CAV'];
const normalized = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
export const dismissalSetNames = ['For Second Course (Bachelor Degree)', 'For Graduate School', 'For Masters', 'For CTP', 'Transfer Credentials'];
export const isHonorableDismissal = name => ['Honorable Dismissal', ...dismissalSetNames].some(type => normalized(type) === normalized(name));
export const needsStudyYears = name => /^Transcript of Records(?:\b|\s*\()/i.test(name) || dismissalSetNames.includes(name);
export const needsGraduationYear = name => ['Diploma', 'Diploma 2nd Copy', 'Graduation Clearance'].includes(name);
export const needsRequestingSchool = name => dismissalSetNames.includes(name) || ['Transcript of Records', 'Honorable Dismissal'].includes(name);
export const isSameDayWalkInType = name => sameDayWalkInTypes.some(type => normalized(type) === normalized(name));
