// Persist only fixed explanations, never arbitrary engine output or raw ID text.
const reasons = new Map([
  ['No text could be extracted from the image.', 'OCR could not read text from the proof. Manual review is required.'],
  ['School name and Student ID found, but College did not match.', 'OCR read the school and student ID, but could not confirm the selected college. Manual review is required.'],
  ['School name and College found, but Student ID did not match.', 'OCR read the school and college, but could not confirm the entered student ID. Manual review is required.'],
  ['Student ID and College matched, but School name not found.', 'OCR read the student ID and college, but could not confirm the school name. Manual review is required.'],
  ['Could not verify all required fields (School name, Student ID, College).', 'OCR could not confirm the school, student ID and college together. Manual review is required.'],
]);
function registrationVerification(result) {
  const verified = result?.verified === true;
  return {
    verification_status: verified ? 'verified' : 'pending',
    verification_reason: verified ? null : reasons.get(result?.reason)
      || 'Automatic text checks were unavailable or inconclusive. Manual review is required.',
  };
}
module.exports = { registrationVerification };
