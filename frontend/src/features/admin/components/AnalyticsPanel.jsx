import FilterSelect from '@/components/FilterSelect';
import Button from '@/components/Button';
import AdminIcon from './AdminIcon';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import useReports from '@/features/admin/useReports';
import DashboardLoading from '@/components/DashboardLoading';
import DashboardAlerts from '@/components/DashboardAlerts';
import SupportAnalytics from '@/components/SupportAnalytics';
import ProgressFill from '@/components/ProgressFill';
import { formatDuration } from '@/utils/formatters';
import { getWorkloadShares } from '@/utils/workloadShare';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import QueueTabs from '@/components/QueueTabs';

function MetricCard({ label, value, sub, tone = 'default', icon }) {
  const tones = { default: 'text-gray-900 dark:text-gray-100', good: 'text-[#15803d] dark:text-green-300', warn: 'text-amber-600 dark:text-amber-300' };
  return (
    <div className="trace-section trace-card-info trace-section-body trace-admin-analytics-metric">
      {icon && <span className={'trace-admin-analytics-metric-icon ' + (tone === 'warn' ? 'trace-admin-analytics-icon-warn' : '')}><AdminIcon name={icon} /></span>}
      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">{label}</span>
      <span className={`text-2xl font-display font-black mt-1 block ${tones[tone]}`}>{value}</span>
      {sub && <span className="text-[10px] text-gray-400 dark:text-gray-400 mt-1 block">{sub}</span>}
    </div>
  );
}

/**
 * Efficiency analytics.
 *
 * Every figure derives from the `step_logs` audit trail, so anything shown here
 * can be traced back to a recorded desk action.
 */
function DocumentAnalytics({ user, currentTab }) {
  const r = useReports(user, currentTab);
  const [staffQuery, setStaffQuery] = useState('');
  const [staffDesk, setStaffDesk] = useState('all');
  const [staffPage, setStaffPage] = useState(0);

  if (r.loading) return <DashboardLoading />;

  const a = r.analytics;
  if (!a) {
    return <p className="text-xs text-gray-400 dark:text-gray-400 py-10 text-center">Analytics are unavailable right now.</p>;
  }

  // The slowest desk is the bottleneck worth acting on.
  const slowest = a.turnaround_by_desk.length ? a.turnaround_by_desk[0] : null;
  const workload = getWorkloadShares(a.workload_by_clerk);
  const matchingStaff = workload.filter(row => (row.full_name || '').toLowerCase().includes(staffQuery.trim().toLowerCase()) && (staffDesk === 'all' || row.desk_assignment === staffDesk)).sort((left, right) => Number(right.documents_handled || 0) - Number(left.documents_handled || 0));
  const lastStaffPage = Math.max(0, Math.ceil(matchingStaff.length / 7) - 1);
  const currentStaffPage = Math.min(staffPage, lastStaffPage);
  const visibleStaff = matchingStaff.slice(currentStaffPage * 7, (currentStaffPage + 1) * 7);
  const released = a.throughput || [];
  const totalReleased = released.reduce((sum, day) => sum + Number(day.completed || 0), 0);
  const peak = released.reduce((best, day) => !best || Number(day.completed) > Number(best.completed) ? day : best, null);
  const latest = released.reduce((best, day) => !best || day.date > best.date ? day : best, null);

  return (
    <>
      <DashboardAlerts success={r.success} error={r.error} onDismiss={r.dismissNotification} />

      <div className="trace-page trace-admin-document-analytics">

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Avg. End-to-End" icon="analytics-clock"
            value={formatDuration(a.end_to_end.avg_minutes)}
            sub={`Across ${a.end_to_end.completed_count} completed documents`}
            tone="good"
          />
          <MetricCard
            label="Fastest Completion" icon="analytics-zap"
            value={formatDuration(a.end_to_end.min_minutes)}
            sub="Best observed turnaround"
          />
          <MetricCard
            label="Slowest Completion" icon="analytics-trend"
            value={formatDuration(a.end_to_end.max_minutes)}
            sub="Worst observed turnaround"
            tone="warn"
          />
          <MetricCard
            label="Main Bottleneck" icon="analytics-alert"
            value={slowest ? formatDuration(slowest.avg_minutes) : '—'}
            sub={slowest ? slowest.label : 'No data yet'}
            tone="warn"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Where documents actually wait */}
          <div className="trace-section trace-section-body">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Turnaround by Desk</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1 mb-4">
              Average time a document waits at each stage before moving on.
            </p>

            {a.turnaround_by_desk.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-400 py-10 text-center">Not enough history yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto"><div className="h-56" style={{ minWidth: `${Math.max(20, a.turnaround_by_desk.length * 8)}rem` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={a.turnaround_by_desk.map((d) => ({ name: d.label, hours: d.avg_hours }))}>
                      <XAxis dataKey="name" tick={{ fontSize: '0.5625rem' }} interval={0} angle={-15} textAnchor="end" height={60} />
                      <YAxis tick={{ fontSize: '0.625rem' }} unit="h" />
                      <Tooltip formatter={(v) => [`${v} hours`, 'Average wait']} />
                      <Bar isAnimationActive={false} dataKey="hours" fill="#15803d" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div></div>

                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {a.turnaround_by_desk.map((d) => (
                    <div key={d.stage} className="flex flex-wrap gap-2 items-center justify-between text-[11px] border-b border-gray-50 dark:border-gray-700 pb-2">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{d.label}</span>
                      <span className="text-gray-500 dark:text-gray-400">
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
          <div className="trace-section trace-section-body">
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Documents Released</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1 mb-4">
              Completed documents per day over the recent period.
            </p>

            {a.throughput.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-400 py-10 text-center">No completed documents in this period.</p>
            ) : (
              <div className="overflow-x-auto"><div className="h-56 min-w-[20rem]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={a.throughput}>
                    <defs>
                      <linearGradient id="throughputFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#15803d" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#15803d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: '0.5625rem' }} />
                    <YAxis tick={{ fontSize: '0.625rem' }} allowDecimals={false} />
                    <Tooltip formatter={(v) => [v, 'Released']} />
                    <Area isAnimationActive={false} type="monotone" dataKey="completed" stroke="#15803d" strokeWidth={2} fill="url(#throughputFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div></div>
            )}
            <dl className="trace-admin-release-summary">{[['Total released', String(totalReleased)], ['Peak day', peak ? peak.completed + ' · ' + peak.date : '—'], ['Latest', latest ? latest.completed + ' · ' + latest.date : '—']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </div>
        </div>

        {/* Workload distribution */}
        <div className="trace-section overflow-hidden">
          <div className="trace-section-header trace-admin-workload-toolbar">
            <div><h3 className="trace-section-title">Workload by Staff</h3><p className="trace-admin-caption">Documents handled per staff member in this period.</p></div>
            <div className="trace-actions"><label className="trace-admin-search"><AdminIcon name="search" /><input type="search" aria-label="Search staff workload" placeholder="Search staff" value={staffQuery} onChange={event => { setStaffQuery(event.target.value); setStaffPage(0); }} /></label>
              <FilterSelect aria-label="Workload desk" className="trace-control" value={staffDesk} onChange={event => { setStaffDesk(event.target.value); setStaffPage(0); }}><option value="all">All desks</option>{[...new Set(workload.map(row => row.desk_assignment).filter(Boolean))].map(desk => <option key={desk} value={desk}>{desk}</option>)}</FilterSelect></div>
          </div>
          <p className="trace-admin-workload-notice"><AdminIcon name="analytics-info" /><span>Desks differ in difficulty, so these are volume figures, not a performance ranking. Share is each staff member’s documents handled divided by the total handled across all staff in this period.</span></p>

          <div className="max-h-80 overflow-auto">
            <table aria-label="Workload by Staff" className="w-full text-left min-w-[36rem]">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
                <tr className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  <th className="py-3 px-5">Staff</th>
                  <th className="py-3">Desk</th>
                  <th className="py-3 text-right">Documents Handled</th>
                  <th className="py-3 pr-5 text-right">Share of total</th>
                </tr>
              </thead>
              <tbody>
                {visibleStaff.map((c) => {
                  const share = c.share;
                  return (
                    <tr key={c.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-5 text-xs font-bold text-gray-900 dark:text-gray-100"><span className="flex items-center gap-3"><span className={'trace-admin-staff-avatar ' + (c.desk_assignment === 'Finance' ? 'trace-admin-staff-avatar-finance' : '')}><AdminIcon name={c.desk_assignment === 'Finance' ? 'analytics-finance-user' : 'analytics-user'} /></span>{c.full_name}</span></td>
                      <td className="py-3 text-xs text-gray-600 dark:text-gray-300"><span className={'trace-admin-desk-badge ' + (c.desk_assignment === 'Finance' ? 'trace-admin-desk-finance' : '')}>{c.desk_assignment || '—'}</span></td>
                      <td className="py-3 text-xs text-gray-700 dark:text-gray-300 text-right font-semibold">
                        {c.documents_handled.toLocaleString()}
                      </td>
                      <td className="py-3 pr-5">
                        <div className="flex items-center gap-2 justify-end">
                          <div role="meter" aria-label={`${c.full_name} workload share`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={share} aria-valuetext={`${share}% of total staff documents handled`} className="w-24 shrink-0 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <ProgressFill value={share} className="bg-[#15803d] dark:bg-green-400" />
                          </div>
                          <span className="min-w-[3.5rem] text-right text-xs font-semibold tabular-nums text-gray-700 dark:text-gray-300">{share}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {matchingStaff.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-gray-400 dark:text-gray-400 font-semibold">
                      {workload.length ? 'No staff match these filters.' : 'No recorded desk activity yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <footer className="trace-admin-directory-footer border-t border-gray-100 dark:border-gray-700"><p className="trace-admin-caption">Showing {visibleStaff.length} of {matchingStaff.length} staff · highest volume first</p><div className="trace-actions"><Button type="button" className="trace-button trace-button-secondary" disabled={currentStaffPage === 0} onClick={() => setStaffPage(currentStaffPage - 1)}>Previous</Button><Button type="button" className="trace-button trace-button-secondary" disabled={currentStaffPage >= lastStaffPage} onClick={() => setStaffPage(currentStaffPage + 1)}>Next</Button></div></footer>
        </div>
      </div>
    </>
  );
}

export default function AnalyticsPanel({user,currentTab}) {
  const [params,setParams]=useSearchParams();
  const active=params.get('analytics')==='support'?'support':'documents';
  const [visited,setVisited]=useState(()=>new Set([active]));
  useEffect(()=>{queueMicrotask(()=>setVisited(previous=>previous.has(active)?previous:new Set([...previous,active])));},[active]);
  const change=next=>{
    setVisited(previous=>new Set([...previous,next]));
    const query=new URLSearchParams(params);query.set('analytics',next);setParams(query);
  };
  return <section className="trace-page trace-admin-more-page trace-admin-efficiency min-w-0">
    <header><h2 className="trace-page-title">Efficiency Analytics</h2>
      <p className="trace-page-description">{active==='support'?'Ticket service and support workload, measured separately from document processing.':'Processing times and turnaround from the document audit trail.'}</p>
    </header>
    <QueueTabs idPrefix="admin-analytics-view" label="Analytics views" activeKey={active} onChange={change} tabs={[{key:'documents',label:'Document Efficiency'},{key:'support',label:'Support Analytics'}]}/>
    <div id="admin-analytics-view-panel" role="tabpanel" aria-labelledby={`admin-analytics-view-${active}`} className="min-w-0">
      <div hidden={active!=='documents'}>{(active==='documents'||visited.has('documents'))&&<DocumentAnalytics user={user} currentTab={active==='documents'?currentTab:''}/>}</div>
      <div hidden={active!=='support'}>{(active==='support'||visited.has('support'))&&<SupportAnalytics admin={user?.role === 'admin'}/>}</div>
    </div>
  </section>;
}
