const reportModel = require('../models/report.model');
const { toCsv, csvFilename } = require('../utils/csv');
const { badRequest, forbidden } = require('../utils/AppError');

/**
 * Reporting, CSV export and efficiency analytics.
 *
 * Everything here is read-only and derived from `documents` and the `step_logs`
 * audit trail, so any figure shown to the Registrar can be traced back to a
 * recorded desk action.
 */

const EXPORT_BUCKETS = ['active', 'alumni', 'others', 'all'];

/** Staff-only: these views span every student's records. */
function assertStaff(user) {
  if (!user || (user.role !== 'admin' && user.role !== 'clerk')) {
    throw forbidden('Access denied.');
  }
}

/** MySQL returns SUM()/AVG() as strings; the UI wants numbers. */
function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Reject a malformed date rather than silently returning the whole table. */
function validateDates({ dateFrom, dateTo }) {
  for (const [label, value] of [['dateFrom', dateFrom], ['dateTo', dateTo]]) {
    if (value && Number.isNaN(Date.parse(value))) {
      throw badRequest(`Invalid ${label}. Use YYYY-MM-DD.`);
    }
  }
  if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
    throw badRequest('dateFrom must be on or before dateTo.');
  }
}

// ---------------------------------------------------------------------------
// Filtered document report
// ---------------------------------------------------------------------------

/**
 * The main report: a filtered document list plus totals and breakdowns for the
 * same slice, so the summary always matches the rows on screen.
 */
async function getDocumentReport(user, query = {}) {
  assertStaff(user);
  validateDates(query);

  const filters = {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    status: query.status,
    documentType: query.documentType,
    paymentStatus: query.paymentStatus,
    studentId: query.studentId,
  };

  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 100, 1), 1000);
  const offset = (page - 1) * limit;

  const [documents, total, summary, byType, byStatus] = await Promise.all([
    reportModel.listDocumentsForReport(filters, { limit, offset }),
    reportModel.countDocumentsForReport(filters),
    reportModel.summariseDocuments(filters),
    reportModel.groupDocumentsBy('document_type', filters),
    reportModel.groupDocumentsBy('current_status', filters),
  ]);

  return {
    documents,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    summary: {
      total: num(summary.total),
      completed: num(summary.completed),
      rejected: num(summary.rejected),
      paid: num(summary.paid),
      revenue: num(summary.revenue),
    },
    breakdown: {
      by_document_type: byType.map((r) => ({ label: r.label || 'Unspecified', count: num(r.count) })),
      by_status: byStatus.map((r) => ({ label: r.label || 'Unspecified', count: num(r.count) })),
    },
    filters,
  };
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

const STUDENT_COLUMNS = [
  { key: 'student_id', label: 'Student ID' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone_number', label: 'Phone Number' },
  { key: 'course', label: 'College' },
  { key: 'enrollment_status', label: 'Enrollment Status' },
  { key: 'study_load', label: 'Study Load' },
  { key: 'user_type', label: 'User Type' },
  { key: 'verification_status', label: 'Verification' },
  { key: 'total_requests', label: 'Total Requests' },
  { key: 'completed_requests', label: 'Completed Requests' },
  { key: 'created_at', label: 'Registered On' },
];

const DOCUMENT_COLUMNS = [
  { key: 'tracking_number', label: 'Tracking Number' },
  { key: 'request_group_id', label: 'Request Group' },
  { key: 'student_id', label: 'Student ID' },
  { key: 'student_name', label: 'Student Name' },
  { key: 'course', label: 'College' },
  { key: 'document_type', label: 'Document Type' },
  { key: 'current_status', label: 'Status' },
  { key: 'payment_status', label: 'Payment' },
  { key: 'amount', label: 'Amount' },
  { key: 'copies', label: 'Copies' },
  { key: 'created_at', label: 'Requested On' },
  { key: 'updated_at', label: 'Last Updated' },
];

/**
 * Students in one bucket, as CSV.
 *
 * @param {string} bucket 'active' | 'alumni' | 'others' | 'all'
 * @returns {{filename: string, csv: string, rowCount: number}}
 */
async function exportStudentsCsv(user, bucket = 'all') {
  assertStaff(user);
  if (!EXPORT_BUCKETS.includes(bucket)) {
    throw badRequest(`Unknown category. Use one of: ${EXPORT_BUCKETS.join(', ')}.`);
  }

  const rows = await reportModel.listStudentsForExport(bucket);
  return {
    filename: csvFilename(`students-${bucket}`),
    csv: toCsv(STUDENT_COLUMNS, rows),
    rowCount: rows.length,
  };
}

/** The filtered document report, as CSV. Same filters as the on-screen report. */
async function exportDocumentsCsv(user, query = {}) {
  assertStaff(user);
  validateDates(query);

  const filters = {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    status: query.status,
    documentType: query.documentType,
    paymentStatus: query.paymentStatus,
  };

  // Export is capped rather than unbounded, so one click can't try to serialise
  // the entire table into memory.
  const rows = await reportModel.listDocumentsForReport(filters, { limit: 10000, offset: 0 });
  return {
    filename: csvFilename('documents-report'),
    csv: toCsv(DOCUMENT_COLUMNS, rows),
    rowCount: rows.length,
  };
}

// ---------------------------------------------------------------------------
// Efficiency analytics
// ---------------------------------------------------------------------------

// Desk names for the raw status values in step_logs. Shared with the pipeline
// itself so a renamed stage cannot end up labelled one way in the workflow and
// another way in the reports drawn from it.
const { STAGE_LABELS } = require('../utils/documentStatus');

/**
 * The efficiency dashboard.
 *
 * Per-clerk figures are reported as workload (documents handled, actions taken)
 * rather than as a ranking: desks differ in difficulty, so these numbers show
 * how work is distributed, not who is "fastest".
 */
async function getEfficiencyAnalytics(user, query = {}) {
  assertStaff(user);
  validateDates(query);

  const range = { dateFrom: query.dateFrom, dateTo: query.dateTo };
  const days = Math.min(Math.max(parseInt(query.days) || 30, 1), 365);

  const [byDesk, endToEnd, throughput, workload] = await Promise.all([
    reportModel.turnaroundByDesk(range),
    reportModel.endToEndCompletion(range),
    reportModel.throughputByDay({ days }),
    reportModel.workloadByClerk(range),
  ]);

  return {
    turnaround_by_desk: byDesk.map((r) => ({
      stage: r.stage,
      label: STAGE_LABELS[r.stage] || r.stage,
      transitions: num(r.transitions),
      avg_minutes: Math.round(num(r.avg_minutes)),
      avg_hours: Math.round((num(r.avg_minutes) / 60) * 10) / 10,
      max_minutes: num(r.max_minutes),
    })),
    end_to_end: {
      completed_count: num(endToEnd.completed_count),
      avg_minutes: Math.round(num(endToEnd.avg_minutes)),
      avg_hours: Math.round((num(endToEnd.avg_minutes) / 60) * 10) / 10,
      min_minutes: num(endToEnd.min_minutes),
      max_minutes: num(endToEnd.max_minutes),
    },
    throughput: throughput.map((r) => ({
      date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
      completed: num(r.completed),
    })),
    workload_by_clerk: workload.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      desk_assignment: r.desk_assignment,
      documents_handled: num(r.documents_handled),
      actions_taken: num(r.actions_taken),
    })),
    range: { ...range, days },
  };
}

module.exports = {
  EXPORT_BUCKETS,
  getDocumentReport,
  exportStudentsCsv,
  exportDocumentsCsv,
  getEfficiencyAnalytics,
};
