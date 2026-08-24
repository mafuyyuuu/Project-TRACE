const { pool } = require('../config/db');

/**
 * Read-only SQL for reporting, exports and efficiency analytics.
 *
 * Every query here is derived from `documents` and the `step_logs` audit trail,
 * so the numbers can always be traced back to a recorded desk action.
 */

// ---------------------------------------------------------------------------
// Filtered reporting
// ---------------------------------------------------------------------------

/**
 * Translate report filters into a WHERE clause.
 *
 * Column names are fixed strings; only values are parameterised, so no user
 * input ever reaches the SQL text.
 */
function buildDocumentFilters({ dateFrom, dateTo, status, documentType, paymentStatus, studentId } = {}) {
  const conditions = [];
  const params = [];

  if (dateFrom) {
    conditions.push('d.created_at >= ?');
    params.push(dateFrom);
  }
  if (dateTo) {
    // Inclusive of the whole end day, which is what a user picking a date means.
    conditions.push('d.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(dateTo);
  }
  if (status) {
    conditions.push('d.current_status = ?');
    params.push(status);
  }
  if (documentType) {
    conditions.push('d.document_type = ?');
    params.push(documentType);
  }
  if (paymentStatus) {
    conditions.push('d.payment_status = ?');
    params.push(paymentStatus);
  }
  if (studentId) {
    conditions.push('d.student_id = ?');
    params.push(studentId);
  }

  return { where: conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '', params };
}

function listDocumentsForReport(filters, { limit = 1000, offset = 0 } = {}, executor = pool) {
  const { where, params } = buildDocumentFilters(filters);
  return executor
    .query(
      `SELECT d.id, d.tracking_number, d.request_group_id, d.student_id, d.student_name,
              d.document_type, d.current_status, d.payment_status, d.amount, d.copies,
              d.created_at, d.updated_at, u.course
       FROM documents d
       LEFT JOIN users u ON u.student_id = d.student_id${where}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )
    .then(([rows]) => rows);
}

function countDocumentsForReport(filters, executor = pool) {
  const { where, params } = buildDocumentFilters(filters);
  return executor
    .query(`SELECT COUNT(*) AS total FROM documents d${where}`, params)
    .then(([rows]) => rows[0].total);
}

/** Headline figures for whatever slice the filters describe. */
function summariseDocuments(filters, executor = pool) {
  const { where, params } = buildDocumentFilters(filters);
  return executor
    .query(
      `SELECT COUNT(*) AS total,
              SUM(d.current_status IN ('completed', 'released')) AS completed,
              SUM(d.current_status = 'rejected') AS rejected,
              SUM(d.payment_status = 'PAID') AS paid,
              COALESCE(SUM(CASE WHEN d.payment_status = 'PAID' THEN d.amount ELSE 0 END), 0) AS revenue
       FROM documents d${where}`,
      params
    )
    .then(([rows]) => rows[0]);
}

function groupDocumentsBy(column, filters, executor = pool) {
  // Whitelisted: the column is interpolated, so it must never come from input.
  const ALLOWED = { document_type: 'd.document_type', current_status: 'd.current_status', course: 'u.course' };
  const col = ALLOWED[column];
  if (!col) throw new Error(`Unsupported grouping: ${column}`);

  const { where, params } = buildDocumentFilters(filters);
  return executor
    .query(
      `SELECT ${col} AS label, COUNT(*) AS count
       FROM documents d
       LEFT JOIN users u ON u.student_id = d.student_id${where}
       GROUP BY ${col} ORDER BY count DESC`,
      params
    )
    .then(([rows]) => rows);
}

// ---------------------------------------------------------------------------
// Student export
// ---------------------------------------------------------------------------

/**
 * Students in one of the three export buckets.
 *  - active    : currently enrolled
 *  - alumni    : graduated
 *  - others    : dropped out or transferred (former students)
 */
function listStudentsForExport(bucket, executor = pool) {
  const BUCKETS = {
    active: "u.enrollment_status = 'active'",
    alumni: "u.enrollment_status = 'graduated'",
    others: "u.enrollment_status IN ('dropout', 'transferred')",
    all: '1 = 1',
  };
  const clause = BUCKETS[bucket];
  if (!clause) throw new Error(`Unknown export bucket: ${bucket}`);

  return executor
    .query(
      `SELECT u.student_id, u.full_name, u.email, u.phone_number, u.course,
              u.enrollment_status, u.study_load, u.user_type, u.verification_status,
              u.created_at,
              COUNT(d.id) AS total_requests,
              SUM(d.current_status IN ('completed', 'released')) AS completed_requests
       FROM users u
       LEFT JOIN documents d ON d.student_id = u.student_id
       WHERE u.role = 'student' AND ${clause}
       GROUP BY u.id
       ORDER BY u.full_name`
    )
    .then(([rows]) => rows);
}

// ---------------------------------------------------------------------------
// Efficiency analytics
// ---------------------------------------------------------------------------

/**
 * How long documents wait at each desk.
 *
 * Measured as the gap between the step that *put* a document at a desk and the
 * step that moved it on, so it reflects real queue time rather than how long a
 * clerk had the record open.
 */
function turnaroundByDesk({ dateFrom, dateTo } = {}, executor = pool) {
  const params = [];
  let dateFilter = '';
  if (dateFrom) {
    dateFilter += ' AND sl.timestamp_started >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    dateFilter += ' AND sl.timestamp_started < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(dateTo);
  }

  return executor
    .query(
      `SELECT sl.from_status AS stage,
              COUNT(*) AS transitions,
              AVG(TIMESTAMPDIFF(MINUTE, prev.timestamp_started, sl.timestamp_started)) AS avg_minutes,
              MAX(TIMESTAMPDIFF(MINUTE, prev.timestamp_started, sl.timestamp_started)) AS max_minutes
       FROM step_logs sl
       JOIN step_logs prev
         ON prev.document_id = sl.document_id
        AND prev.timestamp_started = (
              SELECT MAX(p2.timestamp_started) FROM step_logs p2
              WHERE p2.document_id = sl.document_id AND p2.timestamp_started < sl.timestamp_started
            )
       WHERE sl.from_status IS NOT NULL
         AND sl.from_status <> sl.to_status${dateFilter}
       GROUP BY sl.from_status
       ORDER BY avg_minutes DESC`,
      params
    )
    .then(([rows]) => rows);
}

/** Submission-to-release time for documents that actually finished. */
function endToEndCompletion({ dateFrom, dateTo } = {}, executor = pool) {
  const { where, params } = buildDocumentFilters({ dateFrom, dateTo });
  const scoped = where ? `${where} AND` : ' WHERE';
  return executor
    .query(
      `SELECT COUNT(*) AS completed_count,
              AVG(TIMESTAMPDIFF(MINUTE, first.started, last.started)) AS avg_minutes,
              MIN(TIMESTAMPDIFF(MINUTE, first.started, last.started)) AS min_minutes,
              MAX(TIMESTAMPDIFF(MINUTE, first.started, last.started)) AS max_minutes
       FROM documents d
       JOIN (SELECT document_id, MIN(timestamp_started) AS started FROM step_logs GROUP BY document_id) first
         ON first.document_id = d.id
       JOIN (SELECT document_id, MAX(timestamp_started) AS started FROM step_logs GROUP BY document_id) last
         ON last.document_id = d.id
       ${scoped} d.current_status IN ('completed', 'released')`,
      params
    )
    .then(([rows]) => rows[0]);
}

/** Completed documents per day, for the throughput trend. */
function throughputByDay({ days = 30 } = {}, executor = pool) {
  return executor
    .query(
      `SELECT DATE(sl.timestamp_started) AS date, COUNT(DISTINCT sl.document_id) AS completed
       FROM step_logs sl
       WHERE sl.action_taken = 'released'
         AND sl.timestamp_started >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(sl.timestamp_started)
       ORDER BY date`,
      [days]
    )
    .then(([rows]) => rows);
}

/**
 * Per-clerk workload.
 *
 * Deliberately reported as volume and average handling time, not as a ranking —
 * desks differ in difficulty, so these figures describe workload distribution
 * rather than individual performance.
 */
function workloadByClerk({ dateFrom, dateTo } = {}, executor = pool) {
  const params = [];
  let dateFilter = '';
  if (dateFrom) {
    dateFilter += ' AND sl.timestamp_started >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    dateFilter += ' AND sl.timestamp_started < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(dateTo);
  }

  return executor
    .query(
      `SELECT u.id, u.full_name, u.desk_assignment,
              COUNT(DISTINCT sl.document_id) AS documents_handled,
              COUNT(*) AS actions_taken
       FROM step_logs sl
       JOIN users u ON u.id = sl.clerk_id
       WHERE u.role IN ('clerk', 'admin')${dateFilter}
       GROUP BY u.id
       ORDER BY documents_handled DESC`,
      params
    )
    .then(([rows]) => rows);
}

module.exports = {
  buildDocumentFilters,
  listDocumentsForReport,
  countDocumentsForReport,
  summariseDocuments,
  groupDocumentsBy,
  listStudentsForExport,
  turnaroundByDesk,
  endToEndCompletion,
  throughputByDay,
  workloadByClerk,
};
