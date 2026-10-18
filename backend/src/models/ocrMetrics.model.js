const { pool } = require('../config/db');
const { METHOD, FIELDS } = require('../utils/ocrFieldDetection');
const json = path => `JSON_EXTRACT(ocr_extracted_data, '$.${path}')`;
const detected = FIELDS.map(key => `(CASE WHEN JSON_TYPE(${json(key)})='STRING' AND LENGTH(TRIM(JSON_UNQUOTE(${json(key)})))>0 THEN 1 ELSE 0 END)`).join('+');
const valid = `COALESCE((JSON_UNQUOTE(${json('field_detection.method')})='${METHOD}'
  AND JSON_TYPE(${json('field_detection.expected_fields')})='INTEGER'
  AND ${json('field_detection.expected_fields')}=3
  AND JSON_TYPE(${json('field_detection.detected_fields')})='INTEGER'
  AND ${json('field_detection.detected_fields')}=(${detected})
  AND ${FIELDS.map(key => `JSON_TYPE(${json(key)}) IN ('STRING','NULL')`).join(' AND ')}
  AND ocr_confidence_score IS NOT NULL
  AND ABS(ocr_confidence_score-100.0*(${detected})/3)<0.011),FALSE)`;
const synthetic = "tracking_number LIKE 'TRC-MOCK-%'";
const eligible = `(NOT (${synthetic}) AND ${valid})`;

// Shared by dashboard stats and the all-record/cohort AI summary.
const SELECT = `COUNT(ocr_confidence_score) AS ocr_total_scored,
  COUNT(CASE WHEN ${eligible} THEN 1 END) AS ocr_samples,
  AVG(CASE WHEN ${eligible} THEN 100.0*(${detected})/3 END) AS ocr_field_detection,
  COUNT(CASE WHEN ocr_confidence_score IS NOT NULL AND NOT (${synthetic}) AND NOT (${valid}) THEN 1 END) AS ocr_unverified_samples,
  COUNT(CASE WHEN ocr_confidence_score IS NOT NULL AND (${synthetic}) THEN 1 END) AS ocr_synthetic_samples`;

async function summary(executor = pool) {
  const [rows] = await executor.query(`SELECT ${SELECT} FROM documents`);
  const row = rows[0];
  return { method: METHOD, score: row.ocr_field_detection == null ? null : Number(row.ocr_field_detection),
    samples: Number(row.ocr_samples), unverified_samples: Number(row.ocr_unverified_samples),
    synthetic_samples: Number(row.ocr_synthetic_samples), total_scored: Number(row.ocr_total_scored) };
}

module.exports = { SELECT, summary };
