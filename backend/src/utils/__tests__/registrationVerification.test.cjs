const { registrationVerification } = require('../registrationVerification');
it.each([null, {}, { verified: false }, { verified: 'true' }, { verified: 1 }])('requires a boolean positive check and keeps uncertainty pending: %j', result => {
  expect(registrationVerification(result)).toMatchObject({ verification_status: 'pending', verification_reason: expect.stringContaining('Manual review') });
});
it('does not persist arbitrary OCR text, IDs or engine errors', () => {
  const result = registrationVerification({ verified: false, reason: 'raw-private-ID /app/uploads/private.jpg' });
  expect(result.verification_reason).not.toMatch(/raw-private|uploads|private/);
});
it('provides fixed explanations for each supported failure', () => {
  for (const reason of ['No text could be extracted from the image.', 'School name and Student ID found, but College did not match.',
    'School name and College found, but Student ID did not match.', 'Student ID and College matched, but School name not found.',
    'Could not verify all required fields (School name, Student ID, College).']) {
    const result = registrationVerification({ verified: false, reason });
    expect(result.verification_reason).toContain('Manual review is required');
    expect(result.verification_reason).not.toContain('unavailable');
    expect(result.verification_reason.length).toBeLessThanOrEqual(300);
  }
});
it('leaves a positive match verified without a pending reason', () => {
  expect(registrationVerification({ verified: true })).toEqual({ verification_status: 'verified', verification_reason: null });
});
