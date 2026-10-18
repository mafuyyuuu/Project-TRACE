const { pool } = require('../config/db');

// Only the generator's explicit marker is recognized. Unmarked is not proof of real provenance.
const MOCK = "tracking_number LIKE 'TRC-MOCK-%'";
const scope = cohort => cohort === 'synthetic' ? ` AND ${MOCK}` : cohort === 'unmarked' ? ` AND NOT (${MOCK})` : '';

async function summary(cohort = 'all', executor = pool) {
  const [rows] = await executor.query(`SELECT COUNT(*) AS total,
    COALESCE(SUM(${MOCK}),0) AS synthetic,
    MIN(UNIX_TIMESTAMP(created_at)) AS first_epoch, MAX(UNIX_TIMESTAMP(created_at)) AS last_epoch,
    COUNT(ocr_confidence_score) AS ocr_samples, AVG(ocr_confidence_score) AS ocr_field_detection
    FROM documents WHERE 1=1${scope(cohort)}`);
  return rows[0];
}

async function daily(start, end, cohort = 'all', executor = pool) {
  const [rows] = await executor.query(`SELECT FLOOR((UNIX_TIMESTAMP(created_at)+28800)/86400) AS day_number,
    COUNT(*) AS volume, COALESCE(SUM(${MOCK}),0) AS synthetic
    FROM documents WHERE UNIX_TIMESTAMP(created_at) >= ? AND UNIX_TIMESTAMP(created_at) < ?${scope(cohort)}
    GROUP BY day_number ORDER BY day_number`, [start, end]);
  return rows;
}

async function logCounts(executor = pool) {
  const [rows] = await executor.query('SELECT COUNT(*) AS total FROM step_logs');
  return { activity_events: Number(rows[0].total), displayed_activity_limit: 100 };
}

module.exports = { summary, daily, logCounts };
