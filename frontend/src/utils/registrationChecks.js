// Only the backend's fixed saved explanations provide individual check results.
// Unrecognized or unavailable results stay unknown rather than inventing checks.
const RECORDED_RESULTS = new Map([
  ['OCR read the school and student ID, but could not confirm the selected college. Manual review is required.', [true, true, false]],
  ['OCR read the school and college, but could not confirm the entered student ID. Manual review is required.', [true, false, true]],
  ['OCR read the student ID and college, but could not confirm the school name. Manual review is required.', [false, true, true]],
]);

export function registrationChecks(reason) {
  const values = RECORDED_RESULTS.get(reason) || [null, null, null];
  return ['School', 'Student ID', 'College'].map((label, index) => ({ label, read: values[index] }));
}
