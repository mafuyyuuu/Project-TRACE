const { pool } = require('../config/db');
const { STATUS } = require('../utils/documentStatus');
const { FIRST_DELAY_MS, REPEAT_MS } = require('../utils/pickupReminderSchedule');

async function acquire(executor) {
  const [rows] = await executor.query("SELECT GET_LOCK('trace_pickup_sms_reminders', 0) AS acquired");
  return Number(rows[0]?.acquired) === 1;
}
function release(executor) {
  return executor.query("SELECT RELEASE_LOCK('trace_pickup_sms_reminders')");
}

async function candidates(executor = pool) {
  const delay = FIRST_DELAY_MS / 1000, repeat = REPEAT_MS / 1000;
  const [rows] = await executor.query(`
    SELECT d.id AS document_id, d.tracking_number, d.document_type, u.id AS user_id,
      u.phone_number, sl.id AS ready_step_id,
      UNIX_TIMESTAMP(sl.timestamp_started) * 1000 AS ready_at_ms,
      UNIX_TIMESTAMP(CURRENT_TIMESTAMP(3)) * 1000 AS now_ms
    FROM documents d
    JOIN users u ON u.student_id = d.student_id
    JOIN step_logs sl ON sl.id = (
      SELECT MAX(entry.id) FROM step_logs entry WHERE entry.document_id = d.id
        AND entry.to_status = ? AND entry.from_status <> ?
    )
    LEFT JOIN pickup_sms_reminders reminder ON reminder.document_id = d.id
      AND reminder.ready_step_id = sl.id
      AND reminder.period_no = FLOOR((TIMESTAMPDIFF(SECOND, sl.timestamp_started, CURRENT_TIMESTAMP) - ?) / ?)
    WHERE d.current_status = ? AND u.role = 'student' AND u.is_active = 1
      AND u.verification_status = 'verified'
      AND u.phone_number REGEXP '^(09[0-9]{9}|[+]639[0-9]{9})$'
      AND TIMESTAMPDIFF(SECOND, sl.timestamp_started, CURRENT_TIMESTAMP) >= ?
      AND reminder.id IS NULL
      AND NOT EXISTS (SELECT 1 FROM pickup_sms_reminders recent
        WHERE recent.document_id = d.id AND recent.ready_step_id = sl.id
          AND recent.attempted_at > CURRENT_TIMESTAMP - INTERVAL 7 DAY)
    ORDER BY sl.timestamp_started, d.id LIMIT 100`,
  [STATUS.READY_FOR_RELEASE, STATUS.READY_FOR_RELEASE, delay, repeat, STATUS.READY_FOR_RELEASE, delay]);
  return rows;
}

async function stillEligible(row, executor = pool) {
  const [rows] = await executor.query(`SELECT u.phone_number FROM documents d
    JOIN users u ON u.student_id = d.student_id
    WHERE d.id = ? AND d.current_status = ? AND u.id = ? AND u.is_active = 1
      AND u.role = 'student' AND u.verification_status = 'verified'
      AND ? = (SELECT MAX(id) FROM step_logs WHERE document_id = d.id
        AND to_status = ? AND from_status <> ?)`,
  [row.document_id, STATUS.READY_FOR_RELEASE, row.user_id, row.ready_step_id, STATUS.READY_FOR_RELEASE, STATUS.READY_FOR_RELEASE]);
  return rows[0] || null;
}

async function reserve(row, schedule, executor = pool) {
  try {
    const [result] = await executor.query(`INSERT INTO pickup_sms_reminders
      (document_id, ready_step_id, period_no, due_at_ms, state) VALUES (?, ?, ?, ?, 'dispatching')`,
    [row.document_id, row.ready_step_id, schedule.period, schedule.dueAt]);
    return result.insertId;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return null;
    throw error;
  }
}

function finish(id, state, code, executor = pool) {
  return executor.query(`UPDATE pickup_sms_reminders SET state = ?, error_code = ?,
    finished_at = CURRENT_TIMESTAMP WHERE id = ? AND state = 'dispatching'`, [state, code, id]);
}

function markAbandoned(executor = pool) {
  return executor.query(`UPDATE pickup_sms_reminders SET state = 'unknown', error_code = 'INTERRUPTED',
    finished_at = CURRENT_TIMESTAMP WHERE state = 'dispatching'
    AND attempted_at < CURRENT_TIMESTAMP - INTERVAL 1 HOUR`);
}

module.exports = { acquire, release, candidates, stillEligible, reserve, finish, markAbandoned };
