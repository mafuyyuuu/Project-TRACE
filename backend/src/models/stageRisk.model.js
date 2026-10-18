const { pool } = require('../config/db');

// Consecutive same-status notes do not restart a wait. Only recorded changes
// establish entry/exit; legacy stages are never silently remapped.
const EPISODES = `WITH events AS (
  SELECT id, document_id, UPPER(to_status) AS stage,
    UNIX_TIMESTAMP(COALESCE(timestamp_completed,timestamp_started)) AS entered
  FROM step_logs WHERE to_status IS NOT NULL AND to_status <> ''
    AND (timestamp_completed IS NULL OR timestamp_started IS NULL OR timestamp_completed >= timestamp_started)
    AND UNIX_TIMESTAMP(COALESCE(timestamp_completed,timestamp_started)) <= ?
), ordered AS (
  SELECT *, LAG(stage) OVER (PARTITION BY document_id ORDER BY entered,id) AS previous_stage FROM events
), changes AS (
  SELECT * FROM ordered WHERE previous_stage IS NULL OR previous_stage <> stage
), episodes AS (
  SELECT *, LEAD(entered) OVER (PARTITION BY document_id ORDER BY entered,id) AS exited,
    LEAD(stage) OVER (PARTITION BY document_id ORDER BY entered,id) AS next_stage FROM changes
)`;

async function intervals(asOf, executor = pool) {
  const [rows] = await executor.query(`${EPISODES}
    SELECT e.document_id, e.stage, e.next_stage, e.entered, e.exited,
      CASE WHEN d.tracking_number LIKE 'TRC-MOCK-%' THEN 'marked_synthetic' ELSE 'unmarked_unverified' END AS origin
    FROM episodes e JOIN documents d ON d.id=e.document_id
    WHERE e.exited IS NOT NULL ORDER BY e.entered DESC,e.id DESC LIMIT 3000`, [asOf]);
  return rows;
}

async function oldestCases(asOf, executor = pool) {
  const [rows] = await executor.query(`${EPISODES}
    SELECT e.stage, MIN(e.entered) AS entered FROM episodes e JOIN documents d ON d.id=e.document_id
    WHERE e.exited IS NULL AND UPPER(d.current_status)=e.stage GROUP BY e.stage`, [asOf]);
  return rows;
}

module.exports = { intervals, oldestCases };
