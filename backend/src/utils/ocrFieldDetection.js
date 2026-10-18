const METHOD = 'intake_fields_v1';
const FIELDS = ['student_id', 'last_name', 'form_type'];

/** Field presence only. Never reuse a provider's unrelated confidence value. */
function measureIntakeFields(result) {
  if (!result || result.processing_status === 'failed' ||
      !(result.success === true || result.processing_status === 'completed')) return null;
  const fields = result.extracted_data;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields) || FIELDS.some(key =>
    !Object.hasOwn(fields, key) || (fields[key] !== null && typeof fields[key] !== 'string'))) return null;
  const normalised = Object.fromEntries(FIELDS.map(key => [key, fields[key]?.trim() || null]));
  const detected = FIELDS.filter(key => normalised[key] !== null).length;
  const score = detected / FIELDS.length * 100;
  return { score, extracted_data: { ...fields, ...normalised, confidence: score,
    field_detection: { method: METHOD, expected_fields: FIELDS.length, detected_fields: detected } } };
}

module.exports = { METHOD, FIELDS, measureIntakeFields };
