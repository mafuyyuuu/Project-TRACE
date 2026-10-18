const { measureIntakeFields, METHOD } = require('../ocrFieldDetection');
const fields = { student_id: '23-00001', last_name: 'SAMPLE', form_type: 'Diploma' };
it('calculates field presence independently of provider confidence and overwrites forged metadata', () => {
  const result = measureIntakeFields({ success: true, extracted_data: { ...fields, confidence: 45,
    field_detection: { method: 'forged', detected_fields: 1 } } });
  expect(result.score).toBe(100);
  expect(result.extracted_data).toMatchObject({ confidence: 100,
    field_detection: { method: METHOD, expected_fields: 3, detected_fields: 3 } });
});
it('counts only nonempty strings and normalizes blank parsed values', () => {
  const result = measureIntakeFields({ success: true, extracted_data: { ...fields, last_name: '   ', confidence: 99 } });
  expect(result.score).toBeCloseTo(200 / 3);
  expect(result.extracted_data.last_name).toBeNull();
});
it('records genuine completed zero-field scans but not an ambiguous old failure', () => {
  const extracted_data = { student_id: null, last_name: null, form_type: null, confidence: 0 };
  const result = measureIntakeFields({ success: false, processing_status: 'completed', extracted_data });
  expect(result.score).toBe(0);
  expect(result.extracted_data.field_detection.detected_fields).toBe(0);
  expect(measureIntakeFields({ success: false, extracted_data })).toBeNull();
});
it.each([null, { success: false }, { success: true, processing_status: 'failed', extracted_data: fields },
  { success: true, extracted_data: { student_id: '23-00001', form_type: 'Diploma' } },
  { success: true, extracted_data: { ...fields, last_name: 5 } },
  { success: true, extracted_data: { ...fields, form_type: {} } }])('leaves invalid/unavailable results unmeasured', result => {
  expect(measureIntakeFields(result)).toBeNull();
});
