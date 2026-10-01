const model = require('../models/finance.model');
const { pool } = require('../config/db');
const { forbidden, badRequest } = require('../utils/AppError');
const { validReceiptDate } = require('../utils/receiptTiming');
const { toCsv, csvFilename } = require('../utils/csv');
function authorize(user) {
  if (user?.role !== 'clerk' || user.desk_assignment !== 'Finance') throw forbidden('Only Finance can view or export payment transactions.');
}
function filters(query) {
  const result = { from: query.from || '', to: query.to || '', receipt: query.receipt || 'all' };
  if ((result.from && !validReceiptDate(result.from)) || (result.to && !validReceiptDate(result.to)) || (result.from && result.to && result.from > result.to)) throw badRequest('Choose a valid payment date range.');
  if (!['all', 'pending', 'copy-pending', 'issued'].includes(result.receipt)) throw badRequest('Invalid OR filter.');
  return result;
}
async function transactions(user, query = {}, exporting = false) {
  authorize(user);
  const selection = filters(query);
  const page = Number(query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw badRequest('Invalid page.');
  const connection = await pool.getConnection();
  let rows, totals;
  try {
    await connection.beginTransaction();
    totals = await model.summary(selection, connection);
    if (exporting && Number(totals.total) > 10000) throw badRequest('More than 10,000 transactions match. Narrow the date range before exporting.');
    rows = await model.list(selection, exporting ? 10000 : 25, exporting ? 0 : (page - 1) * 25, connection);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  if (!exporting) return { transactions: rows, total: Number(totals.total), amount: Number(totals.amount), page, limit: 25, server_now: new Date().toISOString() };
  const date = value => value ? new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Historical date not recorded';
  const output = rows.map(row => ({ ...row, payment_cleared_at: date(row.payment_cleared_at), amount: `₱${Number(row.amount).toFixed(2)}`, receipt_status: !row.or_number ? 'Issuance pending' : !row.official_receipt_path ? 'Issued; digital copy pending' : 'Digital OR available' }));
  const columns = [['request_group_id', 'Request'], ['student_id', 'Student ID'], ['student_name', 'Student'], ['document_type', 'Documents'], ['documents_covered', 'Document count'], ['payment_cleared_at', 'Payment cleared (Manila)'], ['amount', 'Paid amount'], ['or_number', 'OR number'], ['or_date', 'OR date'], ['receipt_status', 'OR status']].map(([key, label]) => ({ key, label }));
  return { filename: csvFilename('finance-transactions'), csv: toCsv(columns, output) };
}
module.exports = { transactions, filters };
