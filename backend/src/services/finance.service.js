const model = require('../models/finance.model');
const { pool } = require('../config/db');
const { forbidden, badRequest } = require('../utils/AppError');
const { validReceiptDate } = require('../utils/receiptTiming');
const { csvFilename } = require('../utils/csv');
const { documentCsv } = require('../utils/reportCsv');
const filterService = require('./reportFilters.service');
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
  const selection = { ...filters(query), ...Object.fromEntries(Object.entries(await filterService.identity(user,query)).filter(([,value])=>value !== undefined)) };
  const page = Number(query.page || 1);
  if (!Number.isInteger(page) || page < 1 || page > 100000) throw badRequest('Invalid page.');
  const connection = await pool.getConnection();
  let rows, totals;
  try {
    await connection.beginTransaction();
    totals = await model.summary(selection, connection);
    if (exporting && Number(totals.total) > 10000) throw badRequest('More than 10,000 transactions match. Narrow the date range before exporting.');
    rows = exporting ? await model.exportDocuments(selection,connection) : await model.list(selection,25,(page-1)*25,connection);
    if (exporting && rows.length > 10000) throw badRequest('More than 10,000 documents match. Narrow the filters before exporting.');
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  if (!exporting) return { transactions: rows, total: Number(totals.total), amount: Number(totals.amount), page, limit: 25, server_now: new Date().toISOString() };
  return { filename: csvFilename('finance-transactions'), csv: documentCsv(rows), rowCount: rows.length };
}
module.exports = { transactions, filters };
