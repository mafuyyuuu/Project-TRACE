const { pool } = require('../config/db');
const reports = require('./report.model');
const grouped = `SELECT COALESCE(d.request_group_id, d.tracking_number) AS request_group_id,
  MIN(d.id) AS id, MIN(d.tracking_number) AS tracking_number, MIN(d.student_id) AS student_id,
  MIN(d.student_name) AS student_name, MIN(student.program) AS program, GROUP_CONCAT(DISTINCT d.document_type ORDER BY d.document_type SEPARATOR ', ') AS document_type,
  COUNT(*) AS documents_covered, SUM(d.amount) AS amount, MIN(d.payment_cleared_at) AS payment_cleared_at, UNIX_TIMESTAMP(MIN(d.payment_cleared_at)) AS cleared_epoch,
  MIN(d.or_number) AS or_number, DATE_FORMAT(MIN(d.or_date), '%Y-%m-%d') AS or_date,
  DATE_FORMAT(MAX(d.or_earliest_issue_date), '%Y-%m-%d') AS or_earliest_issue_date,
  MIN(d.official_receipt_path) AS official_receipt_path, MIN(d.payment_channel) AS payment_channel, MIN(receipt.id) AS receipt_id, MIN(receipt.snapshot->>'$.cashier_name') AS cashier_name
  FROM documents d LEFT JOIN users student ON student.student_id = d.student_id AND student.role = 'student' LEFT JOIN finance_issued_receipts receipt ON receipt.active_group=COALESCE(d.request_group_id,d.tracking_number) WHERE d.payment_status = 'PAID'
  GROUP BY COALESCE(d.request_group_id, d.tracking_number)`;
function groupQuery(filters) {
  const {where: match,params} = reports.buildDocumentFilters({studentId:filters.studentId,studentName:filters.studentName,documentType:filters.documentType,collegeId:filters.collegeId,collegeName:filters.collegeName});
  // Match a complete paid request group; never display a partial payment.
  return {sql: !match ? grouped : grouped.replace("WHERE d.payment_status = 'PAID'", `WHERE d.payment_status = 'PAID' AND COALESCE(d.request_group_id,d.tracking_number) IN (SELECT COALESCE(d.request_group_id,d.tracking_number) FROM documents d ${match} AND d.payment_status='PAID')`),params};
}
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
  const clause = where(filters), group = groupQuery(filters);
  const [rows] = await executor.query(`SELECT * FROM (${group.sql}) payments${clause.sql} ORDER BY payment_cleared_at DESC, id DESC LIMIT ? OFFSET ?`, [...group.params,...clause.params, limit, offset]);
  return rows.map(row => ({ ...row, payment_cleared_at: row.cleared_epoch == null ? null : new Date(Number(row.cleared_epoch) * 1000).toISOString() }));
}
async function summary(filters, executor = pool) {
  const clause = where(filters), group = groupQuery(filters);
  const [rows] = await executor.query(`SELECT COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount FROM (${group.sql}) payments${clause.sql}`, [...group.params,...clause.params]);
  return rows[0];
}
async function exportDocuments(filters,executor=pool) {
  const clause=where(filters),group=groupQuery(filters);
  const [rows]=await executor.query(`SELECT ${reports.DOCUMENT_REPORT_SELECT} FROM documents d ${reports.REPORT_JOINS}
    WHERE d.payment_status='PAID' AND COALESCE(d.request_group_id,d.tracking_number) IN (SELECT request_group_id FROM (${group.sql}) payments${clause.sql})
    ORDER BY d.payment_cleared_at DESC,d.id DESC LIMIT 10001`,[...group.params,...clause.params]);
  return rows;
}
module.exports = { list, summary, exportDocuments };
