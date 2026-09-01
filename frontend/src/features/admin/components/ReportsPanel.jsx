import useReports from '@/features/admin/useReports';
import DashboardLoading from '@/components/DashboardLoading';
import DashboardAlerts from '@/components/DashboardAlerts';
import { getStatusLabel, PIPELINE, LEGACY_STATUS } from '@/utils/documentStatus';
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
  'w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white transition-all';

function StatCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'text-gray-900',
    good: 'text-[#15803d]',
    warn: 'text-amber-600',
    bad: 'text-red-600',
  };
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{label}</span>
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
  const r = useReports(user, currentTab);

  if (r.loading) return <DashboardLoading />;

  const summary = r.report?.summary;

  return (
    <>
      <DashboardAlerts success={r.success} error={r.error} />

      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
            Reports & <span className="text-[#15803d]">Export</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-semibold">
            Filter records, review the totals, and export to CSV.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">From</label>
              <input type="date" className={inputClass} value={r.filters.dateFrom}
                onChange={(e) => r.updateFilter('dateFrom', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">To</label>
              <input type="date" className={inputClass} value={r.filters.dateTo}
                onChange={(e) => r.updateFilter('dateTo', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</label>
              <select className={`${inputClass} cursor-pointer`} value={r.filters.status}
                onChange={(e) => r.updateFilter('status', e.target.value)}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Document Type</label>
              <input className={inputClass} placeholder="e.g. Diploma" value={r.filters.documentType}
                onChange={(e) => r.updateFilter('documentType', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Payment</label>
              <select className={`${inputClass} cursor-pointer`} value={r.filters.paymentStatus}
                onChange={(e) => r.updateFilter('paymentStatus', e.target.value)}>
                <option value="">Any</option>
                <option value="PAID">Paid</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
            <button onClick={r.applyFilters}
              className="px-6 py-2.5 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold uppercase tracking-wider">
              Apply Filters
            </button>
            <button onClick={r.resetFilters}
              className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50">
              Reset
            </button>
            <button onClick={r.downloadDocuments} disabled={r.exporting === 'documents'}
              className="px-6 py-2.5 border border-[#15803d] text-[#15803d] rounded-xl text-xs font-bold hover:bg-emerald-50 disabled:opacity-50 ml-auto">
              {r.exporting === 'documents' ? 'Exporting...' : 'Export These Records (CSV)'}
            </button>
          </div>
        </div>

        {/* Summary for the current filter slice */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Records" value={summary.total.toLocaleString()} />
            <StatCard label="Completed" value={summary.completed.toLocaleString()} tone="good" />
            <StatCard label="Rejected" value={summary.rejected.toLocaleString()} tone="bad" />
            <StatCard label="Paid" value={summary.paid.toLocaleString()} />
            <StatCard label="Revenue" value={formatPeso(summary.revenue)} tone="good" />
          </div>
        )}

        {/* Student export by category */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900">Export Student Records</h3>
          <p className="text-[10px] text-gray-400 mt-1 mb-4">
            Downloads a CSV of student details with their request counts.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {EXPORT_CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => r.downloadStudents(c.key)} disabled={Boolean(r.exporting)}
                className="text-left border border-gray-200 rounded-2xl p-4 hover:border-[#15803d] hover:bg-emerald-50/40 transition-all disabled:opacity-50">
                <span className="text-xs font-bold text-gray-900 block">
                  {r.exporting === c.key ? 'Exporting...' : c.label}
                </span>
                <span className="text-[10px] text-gray-400">{c.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filtered records */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Records</h3>
            {r.report && (
              <span className="text-[10px] font-bold text-gray-400">
                Page {r.report.page} of {r.report.totalPages || 1}
              </span>
            )}
          </div>

          <div className="max-h-[30rem] overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <th className="py-3 px-5">Tracking</th>
                  <th className="py-3">Student</th>
                  <th className="py-3">Document</th>
                  <th className="py-3">Status</th>
                  <th className="py-3">Payment</th>
                  <th className="py-3 pr-5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(r.report?.documents || []).map((d) => (
                  <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-5 text-[11px] font-mono text-gray-700">{d.tracking_number}</td>
                    <td className="py-3">
                      <div className="text-xs font-bold text-gray-900">{d.student_name || '—'}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{d.student_id || '—'}</div>
                    </td>
                    <td className="py-3 text-xs text-gray-600">{d.document_type || '—'}</td>
                    <td className="py-3 text-xs text-gray-600">{getStatusLabel(d.current_status)}</td>
                    <td className="py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        d.payment_status === 'PAID'
                          ? 'bg-emerald-50 text-[#15803d]'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {d.payment_status}
                      </span>
                    </td>
                    <td className="py-3 pr-5 text-right text-xs font-bold text-gray-900">
                      {formatPeso(d.amount)}
                    </td>
                  </tr>
                ))}
                {(r.report?.documents || []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-gray-400 font-semibold">
                      No records match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {r.report && r.report.totalPages > 1 && (
            <div className="p-4 border-t border-gray-100 flex justify-center gap-2">
              <button onClick={() => r.goToPage(r.page - 1)} disabled={r.page <= 1}
                className="px-4 py-2 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Previous
              </button>
              <button onClick={() => r.goToPage(r.page + 1)} disabled={r.page >= r.report.totalPages}
                className="px-4 py-2 text-xs font-bold border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
