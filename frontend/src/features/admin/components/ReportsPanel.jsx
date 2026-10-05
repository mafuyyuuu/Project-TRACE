import Button from '@/components/Button';
import ExportDropdown from '@/components/ExportDropdown';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { useId, useState } from 'react';
import StudentProfileModal from '@/components/StudentProfileModal';
import { formatDateTime } from '@/utils/formatters';
import useReports from '@/features/admin/useReports';
import DashboardLoading from '@/components/DashboardLoading';
import DashboardAlerts from '@/components/DashboardAlerts';
import { getStatusLabel, getStatusTone, PIPELINE, LEGACY_STATUS } from '@/utils/documentStatus';
import { formatPeso } from '@/utils/pricing';

// The live pipeline, plus the terminals only pre-refactor records can hold —
// those rows still exist and an admin filtering reports has to be able to
// reach them.
const STATUSES = [...PIPELINE, LEGACY_STATUS.REJECTED, LEGACY_STATUS.APPROVED];

const EXPORT_CATEGORIES = [
  { key: 'active', label: 'Active Students', hint: 'Currently enrolled' },
  { key: 'alumni', label: 'Graduates / Alumni', hint: 'Enrollment status: graduated' },
  { key: 'others', label: 'Others', hint: 'Dropouts and transferees' },
  { key: 'all', label: 'All Students', hint: 'Every student record' },
];

const inputClass =
  "trace-control w-full";

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-gray-900 dark:text-gray-100',
    good: 'text-[#15803d] dark:text-green-300',
    warn: 'text-amber-600 dark:text-amber-300',
    bad: 'text-red-600 dark:text-red-300',
  };
  return (
    <div className="trace-section trace-section-body">
      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">{label}</span>
      <span className={`text-2xl font-display font-black mt-1 block ${tones[tone]}`}>{value}</span>
    </div>
  );
}

/**
 * Report generation and CSV export.
 *
 * The same filters drive the on-screen table, its summary, and the document
 * export — so what the Registrar downloads always matches what they are looking
 * at.
 */
export default function ReportsPanel({ user, currentTab }) {
  const { tableRef, ...r } = useReports(user, currentTab);
  const [viewProfileId, setViewProfileId] = useState(null);
  const filtersId = useId();
  const recordsId = useId();

  if (r.loading) return <DashboardLoading />;

  const report = r.refreshing ? null : r.report;
  const summary = report?.summary;

  return (
    <>
      <StudentProfileModal open={!!viewProfileId} studentId={viewProfileId} onClose={() => setViewProfileId(null)} />
      <DashboardAlerts success={r.success} error={r.error} onDismiss={r.dismissNotification} />

      <div className="trace-page">
        <div className="trace-page-header">
          <div className="flex-1">
            <h2 className="trace-page-title">
              Reports & <span className="text-[#15803d] dark:text-green-300">Export</span>
            </h2>
            <p className="trace-page-description">
              Filter records, review the totals, and export to CSV.
            </p>
          </div>
          <div className="ml-auto">
            <ExportDropdown exporting={r.exporting}
              options={[{ key: 'documents', label: 'Filtered document records (CSV)' }, ...EXPORT_CATEGORIES.map(c => ({ key: c.key, label: `${c.label} (CSV)` }))]}
              onSelect={key => key === 'documents' ? r.downloadDocuments() : r.downloadStudents(key)} />
          </div>
        </div>

        {/* Filters */}
        <section className="trace-section trace-section-body" aria-labelledby={filtersId}>
          <h3 id={filtersId} className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="trace-label">From</label>
              <input type="date" className={inputClass} value={r.filters.dateFrom}
                onChange={(e) => r.updateFilter('dateFrom', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="trace-label">To</label>
              <input type="date" className={inputClass} value={r.filters.dateTo}
                onChange={(e) => r.updateFilter('dateTo', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="trace-label">Status</label>
              <select className={`${inputClass} cursor-pointer`} value={r.filters.status}
                onChange={(e) => r.updateFilter('status', e.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="trace-label">Document Type</label>
              <input maxLength={INPUT_LIMITS.referenceName} className={inputClass} placeholder="e.g. Diploma" value={r.filters.documentType}
                onChange={(e) => r.updateFilter('documentType', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="trace-label">Payment</label>
              <select className={`${inputClass} cursor-pointer`} value={r.filters.paymentStatus}
                onChange={(e) => r.updateFilter('paymentStatus', e.target.value)}>
                <option value="">Any</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <Button onClick={r.applyFilters}
              className="trace-button trace-button-primary">
              Apply Filters
            </Button>
            <Button onClick={r.resetFilters}
              className="trace-button trace-button-secondary">
              Reset
            </Button>

          </div>
        </section>

        {/* Summary for the current filter slice */}
        <section aria-label="Report summary" aria-busy={r.refreshing} className="grid [grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-4">
          <StatCard label="Records" value={summary ? summary.total.toLocaleString() : '—'} />
          <StatCard label="Completed" value={summary ? summary.completed.toLocaleString() : '—'} tone="good" />
          <StatCard label="Rejected" value={summary ? summary.rejected.toLocaleString() : '—'} tone="bad" />
          <StatCard label="Paid" value={summary ? summary.paid.toLocaleString() : '—'} />
          <StatCard label="Revenue" value={summary ? formatPeso(summary.revenue) : '—'} tone="good" />
        </section>

        {/* Filtered records */}
        <section className="trace-section overflow-hidden" aria-labelledby={recordsId} aria-busy={r.refreshing}>
          <div className="trace-section-header border-gray-100 dark:border-gray-700">
            <h3 id={recordsId} className="text-sm font-bold text-gray-900 dark:text-gray-100">Records</h3>
            {report && (
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400">
                Page {report.page} of {report.totalPages || 1}
              </span>
            )}
          </div>

          <div ref={tableRef} className="max-h-[60vh] overflow-y-auto overflow-x-auto">
            <table className="w-full text-left table-fixed min-w-[1120px]">
              <colgroup>{[180,180,160,180,160,120,90,100].map((width, index) => <col key={index} style={{ width }} />)}</colgroup>
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  <th className="py-3 px-5">Requested On</th>
                  <th className="py-3 px-3">Last Updated</th>
                  <th className="py-3 px-5">Tracking</th>
                  <th className="py-3">Student</th>
                  <th className="py-3">Document</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Payment</th>
                  <th className="py-3 pr-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(report?.documents || []).map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-5 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(d.created_at)}</td>
                    <td className="py-3 px-3 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(d.updated_at)}</td>
                    <td className="py-3 px-5 break-all text-[11px] font-mono text-gray-700 dark:text-gray-300">{d.tracking_number}</td>
                    <td className="py-3">
                      <Button type="button" disabled={!d.student_id} onClick={() => setViewProfileId(d.student_id)} className="trace-action text-xs font-bold text-blue-700 dark:text-blue-300 hover:underline select-text break-words text-left focus-visible:ring-2 focus-visible:ring-blue-500">{d.student_name || '—'}</Button>
                      <div className="text-[10px] text-gray-400 dark:text-gray-400 font-mono select-text break-words">{d.student_id || '—'}</div>
                    </td>
                    <td className="py-3 pr-2 break-words text-xs text-gray-600 dark:text-gray-300">{d.document_type || '—'}</td>
                    <td className="py-3 pr-2 break-words text-xs"><span className={getStatusTone(d.current_status, 'text-gray-600 dark:text-gray-300')}>{getStatusLabel(d.current_status)}</span></td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        d.payment_status === 'PAID'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#15803d] dark:text-green-300'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      }`}>
                        {d.payment_status}
                      </span>
                    </td>
                    <td className="py-3 pr-5 text-right text-xs font-bold text-gray-900 dark:text-gray-100">
                      {formatPeso(d.amount)}
                    </td>
                  </tr>
                ))}
                {(report?.documents || []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-xs text-gray-400 dark:text-gray-400 font-semibold">
                      {r.refreshing ? <span role="status">Updating report…</span> : report ? 'No records match these filters.' : 'Report unavailable. Apply Filters to retry.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {report && report.totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex justify-center gap-2">
              <Button onClick={() => r.goToPage(r.page - 1)} disabled={r.page <= 1}
                className="trace-button trace-button-secondary">
                Previous
              </Button>
              <Button onClick={() => r.goToPage(r.page + 1)} disabled={r.page >= report.totalPages}
                className="trace-button trace-button-secondary">
                Next
              </Button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
