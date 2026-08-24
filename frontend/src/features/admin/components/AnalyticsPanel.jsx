import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import useReports from '@/features/admin/useReports';
import DashboardLoading from '@/components/DashboardLoading';
import DashboardAlerts from '@/components/DashboardAlerts';

/** Minutes → a readable duration, since a desk can hold a document for days. */
function formatDuration(minutes) {
  if (!minutes || minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1)} hrs`;
  return `${(hours / 24).toFixed(1)} days`;
}

function MetricCard({ label, value, sub, tone = 'default' }) {
  const tones = { default: 'text-gray-900', good: 'text-[#15803d]', warn: 'text-amber-600' };
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">{label}</span>
      <span className={`text-2xl font-display font-black mt-1 block ${tones[tone]}`}>{value}</span>
      {sub && <span className="text-[10px] text-gray-400 mt-1 block">{sub}</span>}
    </div>
  );
}

/**
 * Efficiency analytics.
 *
 * Every figure derives from the `step_logs` audit trail, so anything shown here
 * can be traced back to a recorded desk action.
 */
export default function AnalyticsPanel({ user, currentTab }) {
  const r = useReports(user, currentTab);

  if (r.loading) return <DashboardLoading />;

  const a = r.analytics;
  if (!a) {
    return <p className="text-xs text-gray-400 py-10 text-center">Analytics are unavailable right now.</p>;
  }

  // The slowest desk is the bottleneck worth acting on.
  const slowest = a.turnaround_by_desk.length ? a.turnaround_by_desk[0] : null;
  const busiest = a.workload_by_clerk.length ? a.workload_by_clerk[0] : null;

  return (
    <>
      <DashboardAlerts success={r.success} error={r.error} />

      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-display font-black text-gray-900 tracking-tight">
            Efficiency <span className="text-[#15803d]">Analytics</span>
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-semibold">
            Processing times and turnaround, computed from the document audit trail.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Avg. End-to-End"
            value={formatDuration(a.end_to_end.avg_minutes)}
            sub={`${a.end_to_end.completed_count} completed documents`}
            tone="good"
          />
          <MetricCard
            label="Fastest Completion"
            value={formatDuration(a.end_to_end.min_minutes)}
            sub="Best observed turnaround"
          />
          <MetricCard
            label="Slowest Completion"
            value={formatDuration(a.end_to_end.max_minutes)}
            sub="Worst observed turnaround"
            tone="warn"
          />
          <MetricCard
            label="Main Bottleneck"
            value={slowest ? formatDuration(slowest.avg_minutes) : '—'}
            sub={slowest ? slowest.label : 'No data yet'}
            tone="warn"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Where documents actually wait */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900">Turnaround by Desk</h3>
            <p className="text-[10px] text-gray-400 mt-1 mb-4">
              Average time a document waits at each stage before moving on.
            </p>

            {a.turnaround_by_desk.length === 0 ? (
              <p className="text-xs text-gray-400 py-10 text-center">Not enough history yet.</p>
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={a.turnaround_by_desk.map((d) => ({ name: d.label, hours: d.avg_hours }))}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: 10 }} unit="h" />
                      <Tooltip formatter={(v) => [`${v} hours`, 'Average wait']} />
                      <Bar dataKey="hours" fill="#15803d" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {a.turnaround_by_desk.map((d) => (
                    <div key={d.stage} className="flex items-center justify-between text-[11px] border-b border-gray-50 pb-2">
                      <span className="font-semibold text-gray-700">{d.label}</span>
                      <span className="text-gray-500">
                        {formatDuration(d.avg_minutes)}
                        <span className="text-gray-300"> · {d.transitions} moves</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Throughput trend */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900">Documents Released</h3>
            <p className="text-[10px] text-gray-400 mt-1 mb-4">
              Completed documents per day over the recent period.
            </p>

            {a.throughput.length === 0 ? (
              <p className="text-xs text-gray-400 py-10 text-center">No completed documents in this period.</p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={a.throughput}>
                    <defs>
                      <linearGradient id="throughputFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#15803d" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#15803d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, 'Released']} />
                    <Area type="monotone" dataKey="completed" stroke="#15803d" strokeWidth={2} fill="url(#throughputFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Workload distribution */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Workload by Staff</h3>
            <p className="text-[10px] text-gray-400 mt-1">
              How work is distributed across desks. Desks differ in difficulty, so these are volume
              figures &mdash; not a performance ranking.
            </p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <th className="py-3 px-5">Staff</th>
                  <th className="py-3">Desk</th>
                  <th className="py-3 text-right">Documents Handled</th>
                  <th className="py-3 pr-5 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {a.workload_by_clerk.map((c) => {
                  const share = busiest && busiest.documents_handled
                    ? Math.round((c.documents_handled / busiest.documents_handled) * 100)
                    : 0;
                  return (
                    <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-3 px-5 text-xs font-bold text-gray-900">{c.full_name}</td>
                      <td className="py-3 text-xs text-gray-600">{c.desk_assignment || '—'}</td>
                      <td className="py-3 text-xs text-gray-700 text-right font-semibold">
                        {c.documents_handled.toLocaleString()}
                      </td>
                      <td className="py-3 pr-5">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#15803d] rounded-full" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {a.workload_by_clerk.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-gray-400 font-semibold">
                      No recorded desk activity yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
