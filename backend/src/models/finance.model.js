const { pool } = require('../config/db');
const grouped = `SELECT COALESCE(d.request_group_id, d.tracking_number) AS request_group_id,
  MIN(d.id) AS id, MIN(d.tracking_number) AS tracking_number, MIN(d.student_id) AS student_id,
  MIN(d.student_name) AS student_name, GROUP_CONCAT(DISTINCT d.document_type ORDER BY d.document_type SEPARATOR ', ') AS document_type,
  COUNT(*) AS documents_covered, SUM(d.amount) AS amount, MIN(d.payment_cleared_at) AS payment_cleared_at, UNIX_TIMESTAMP(MIN(d.payment_cleared_at)) AS cleared_epoch,
  MIN(d.or_number) AS or_number, DATE_FORMAT(MIN(d.or_date), '%Y-%m-%d') AS or_date,
  DATE_FORMAT(MAX(d.or_earliest_issue_date), '%Y-%m-%d') AS or_earliest_issue_date,
  MIN(d.official_receipt_path) AS official_receipt_path, MIN(d.payment_channel) AS payment_channel
  FROM documents d WHERE d.payment_status = 'PAID'
  GROUP BY COALESCE(d.request_group_id, d.tracking_number)`;
function where(filters) {
  const conditions = [], params = [];
  if (filters.from) { conditions.push('cleared_epoch >= ?'); params.push(Date.parse(`${filters.from}T00:00:00+08:00`) / 1000); }
  if (filters.to) { conditions.push('cleared_epoch < ?'); params.push(Date.parse(`${filters.to}T00:00:00+08:00`) / 1000 + 86400); }
  if (filters.receipt === 'pending') conditions.push('or_number IS NULL');
  if (filters.receipt === 'copy-pending') conditions.push('or_number IS NOT NULL AND official_receipt_path IS NULL');
  if (filters.receipt === 'issued') conditions.push('or_number IS NOT NULL');
  return { sql: conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '', params };
}
async function list(filters, limit, offset, executor = pool) {
  const clause = where(filters);
  const [rows] = await executor.query(`SELECT * FROM (${grouped}) payments${clause.sql} ORDER BY payment_cleared_at DESC, id DESC LIMIT ? OFFSET ?`, [...clause.params, limit, offset]);
  return rows.map(row => ({ ...row, payment_cleared_at: row.cleared_epoch == null ? null : new Date(Number(row.cleared_epoch) * 1000).toISOString() }));
}
async function summary(filters, executor = pool) {
  const clause = where(filters);
  const [rows] = await executor.query(`SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount FROM (${grouped}) payments${clause.sql}`, clause.params);
  return rows[0];
}
module.exports = { list, summary };
