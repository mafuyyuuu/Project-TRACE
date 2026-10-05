import Button from '@/components/Button';
import { forecastCeiling } from '@/utils/forecastScale';
import { USER_TYPE_LABELS } from '@/utils/userLabels';
import AdminTemplatesPanel from './components/AdminTemplatesPanel';
import AdminSecurityPanel from './components/AdminSecurityPanel';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import MiniSparkline from '@/components/MiniSparkline';
import useAdminDashboard from '@/features/admin/useAdminDashboard';
import { todayLongDate, formatDuration } from '@/utils/formatters';
import { getStatusTone, getStatusLabel } from '@/utils/documentStatus';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';
import StudentProfileModal from '@/components/StudentProfileModal';
import MaintenancePanel from '@/features/admin/components/MaintenancePanel';
import ReportsPanel from '@/features/admin/components/ReportsPanel';
import AnalyticsPanel from '@/features/admin/components/AnalyticsPanel';
import ForecastModal from '@/features/admin/components/ForecastModal';
import GradApplicationReviewPanel from '@/features/graduate/components/GradApplicationReviewPanel';
import UserGrid from '@/features/admin/components/UserGrid';
import UserDetailModal from '@/features/admin/components/UserDetailModal';
import AccountVerificationModal from './components/AccountVerificationModal';

/**
 * Registrar admin: ML forecasts, AI insights, account verification, users, and audit logs.
 */
export default function AdminDashboard({ user, currentTab, setViewImageUrl, reviewAccountId, reviewNavigationKey }) {
  const [viewProfileId, setViewProfileId] = useState(null);

  const {
    loading,
    success,
    dismissNotification,
    error,
    documents,
    dashStats,
    forecastData,
    aiInsights,
    pendingStudents,
    analyticsSummary,
    activeModal,
    setActiveModal,
    actionLoading,
    handleAdminVerifyStudent,
    studentVerifyToConfirm,
    confirmAdminVerifyStudent,
    cancelAdminVerifyStudent,
    adminDocPage,
    setAdminDocPage,
    itemsPerPage,
    tableRef,
    adminDocFilter,
    setAdminDocFilter,
    forecastFilter,
    setForecastFilter,
    adminUsersFilter,
    setAdminUsersFilter,
    adminUsersRoleFilter,
    setAdminUsersRoleFilter,
    filteredAdminUsers,
    selectedUser,
    setSelectedUser,
    adminLogs,
  } = useAdminDashboard(user, currentTab, reviewAccountId, reviewNavigationKey);

  const todayFormatted = todayLongDate();

  // These three own their data via their own hooks and replace the default view.
  if (['admin-maintenance', 'admin-users'].includes(currentTab)) return <MaintenancePanel user={user} currentTab={currentTab} />;
  if (currentTab === 'admin-reports') return <ReportsPanel user={user} currentTab={currentTab} />;
  if (currentTab === 'admin-analytics') return <AnalyticsPanel user={user} currentTab={currentTab} />;
  if (currentTab === 'admin-grad-applications') return <GradApplicationReviewPanel user={user} currentTab={currentTab} />;
  if (currentTab === 'admin-security') return <AdminSecurityPanel />;
  if (currentTab === 'admin-templates') return <AdminTemplatesPanel />;
  if (currentTab === 'messages') return <RequestMessagesPanel user={user} initialDocumentId={new URLSearchParams(window.location.search).get('document')} />;

  if (loading) return <DashboardLoading />;

  return (
    <>
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} />
            {currentTab === 'dashboard' && (
              <div className="trace-page">
                {/* Welcome Header */}
                <div className="trace-page-header">
                  <div>
                    <h2 className="trace-page-title">
                      Welcome back, <span className="text-slate-400 dark:text-slate-400 font-medium">Registrar Admin</span>
                    </h2>
                  </div>
                  <div className="trace-date">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Today:</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{todayFormatted}</span>
                    <svg className="w-4 h-4 text-gray-400 dark:text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  </div>
                </div>

                {/* Shared tracks keep KPI labels, values and chart slots aligned. */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-y-3">
                  <section aria-label="System throughput" className="trace-section trace-card-info trace-section-body grid gap-3 lg:row-span-4 lg:grid-rows-subgrid">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">System Throughput</span>
                    {analyticsSummary?.end_to_end?.completed_count > 0 ? (
                      <span className="min-w-0 break-words text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 block">
                        {formatDuration(analyticsSummary.end_to_end.avg_minutes)}
                      </span>
                    ) : (
                      <span className="text-sm font-bold text-gray-400 dark:text-gray-400 block">No completed requests yet</span>
                    )}
                    <div className="min-w-0">
                      {analyticsSummary?.end_to_end?.completed_count > 0 && analyticsSummary?.throughput?.length > 0 ? (
                        <>
                          <MiniSparkline
                            data={analyticsSummary.throughput.map((t) => ({ v: t.completed, label: t.date }))}
                            unit="docs"
                            className="trace-kpi-sparkline"
                          />
                          <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-2">Daily completed documents</p>
                        </>
                      ) : <div aria-hidden="true" className="trace-kpi-sparkline" />}
                    </div>
                    <div className="self-start bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] dark:text-green-300 w-fit max-w-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 shrink-0 bg-[#15803d] rounded-full"></span>
                      Average document processing time across all completed requests
                    </div>
                  </section>

                  <section aria-label="AI confidence average" className="trace-section trace-card-info trace-section-body grid gap-3 lg:row-span-4 lg:grid-rows-subgrid">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">AI Confidence Avg</span>
                    <span className="min-w-0 break-words text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 block">{dashStats.avg_ocr_confidence > 0 ? dashStats.avg_ocr_confidence.toFixed(1) + '%' : '—'}</span>
                    <div className="min-w-0">
                      <MiniSparkline trend="down" className="trace-kpi-sparkline" />
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-2">Illustrative trend</p>
                    </div>
                    <div className="self-start bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full leading-snug">
                      Average extraction accuracy across all scans
                    </div>
                  </section>

                  <section aria-label="Real-time backlog" className="trace-section trace-card-info trace-section-body grid gap-3 lg:row-span-4 lg:grid-rows-subgrid">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">Real-time Backlog</span>
                    <span className="min-w-0 break-words text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 block">
                      {dashStats.backlog_count}
                    </span>
                    <div className="min-w-0">
                      <MiniSparkline trend="up" className="trace-kpi-sparkline" />
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 mt-2">Illustrative trend</p>
                    </div>
                    <div className="self-start bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] dark:text-green-300 w-fit max-w-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 shrink-0 bg-[#15803d] rounded-full"></span>
                      Documents currently pending across all desks
                    </div>
                  </section>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* volume forecast chart */}
                  <div className="trace-section trace-section-body lg:col-span-2 md:flex flex-col min-h-[380px]">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">7-Day Volume Forecast</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-400 font-medium">Predicted incoming document volume via Prophet ML.</p>
                      </div>
                      <div className="flex min-w-0 max-w-full items-center gap-2">
                        <select
                          value={forecastFilter}
                          onChange={(e) => setForecastFilter(e.target.value)}
                          className="trace-control cursor-pointer"
                        >
                          <option value="All">All Documents</option>
                          <option value="Transcript of Records">Transcript of Records</option>
                          <option value="Clearance">Clearance</option>
                          <option value="Diploma">Diploma</option>
                        </select>
                        <Button
                          onClick={() => setActiveModal('forecast-detail')}
                          aria-label="Expand 7-day volume forecast"
                          title="Expand"
                          className="trace-button-lift trace-action p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 enabled:hover:bg-gray-100 dark:enabled:hover:bg-gray-800 enabled:hover:text-gray-700 dark:enabled:hover:text-gray-300 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d]/40"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
                        </Button>
                      </div>
                    </div>
                    {/* Dynamic Recharts line graph */}
                    <div className="flex-1 mt-6 relative h-64 overflow-x-auto">
                      {forecastData && forecastData.length > 0 ? (
                        <div className="h-64 min-w-[20rem]"><ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={forecastData.slice(-5).map(f => {
                              let multiplier = 1;
                              if (forecastFilter === 'Transcript of Records') multiplier = 0.4;
                              if (forecastFilter === 'Clearance') multiplier = 0.3;
                              if (forecastFilter === 'Diploma') multiplier = 0.2;
                              return {
                                day: f.day,
                                volume: Math.max(1, Math.floor(f.predicted_volume * multiplier))
                              };
                            })}
                            margin={{ top: 20, right: 15, left: 15, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#15803d" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#15803d" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis
                              dataKey="day"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#9ca3af', fontSize: '0.625rem', fontWeight: 'bold' }}
                              dy={10}
                            />
                            <YAxis domain={[0, forecastCeiling(forecastData)]}
                              allowDecimals={false}
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#9ca3af', fontSize: '0.625rem', fontWeight: 'bold' }}
                              width={30}

                            />
                            <Tooltip
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                              itemStyle={{ color: 'var(--trace-chart-accent)', fontWeight: 'bold' }}
                              labelStyle={{ color: 'var(--trace-chart-text)', fontWeight: 'bold', marginBottom: '4px' }}
                            />
                            <Area
                              isAnimationActive={false}
                              type="monotone"
                              dataKey="volume"
                              stroke="var(--trace-chart-line)"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#colorVolume)"
                              activeDot={{ r: 6, fill: '#15803d', stroke: '#fff', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        </ResponsiveContainer></div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-400 font-medium text-xs">Loading forecast data...</div>
                      )}
                    </div>
                  </div>

                  {/* Admin Insights Panel */}
                  <section aria-labelledby="ai-insights-heading" className="trace-section trace-section-body lg:col-span-1 flex flex-col justify-between h-full min-h-[380px]">
                    <div>
                      <h3 id="ai-insights-heading" className="text-lg font-bold text-gray-900 dark:text-gray-100">AI INSIGHTS</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 font-mono">Prescriptive actions from Random Forest model.</p>
                    </div>

                    <div className="flex flex-col gap-4 mt-6">
                      {aiInsights && aiInsights.length > 0 ? (
                        aiInsights.map((insight, idx) => (
                          <article key={idx} className={`${insight.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200' : 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-200'} min-w-0 border rounded-2xl p-4 select-text [overflow-wrap:anywhere]`}>
                            <h4 className="text-sm font-bold mb-1 flex items-start gap-2">
                              <span className="sr-only">{insight.type === 'warning' ? 'Warning: ' : 'Information: '}</span>
                              <svg aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                {insight.type === 'warning'
                                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                  : <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01M12 11v5m9-4a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />}
                              </svg>
                              <span className="min-w-0">{insight.title}</span>
                            </h4>
                            <div className="text-xs leading-relaxed font-medium">
                              {insight.message}
                            </div>
                          </article>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 leading-relaxed font-medium">
                          Loading insights...
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Student Account Verification dashboard */}
                <div className="trace-section overflow-hidden">
                  <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex-wrap">
                    <h3 id="tutorial-account-review" className="min-w-0 max-w-full font-bold text-gray-900 dark:text-gray-100 text-lg">Account Verification</h3>
                    <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {pendingStudents.length} Account Verification Requests
                    </span>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                      {pendingStudents.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">No pending student accounts requiring manual validation.</div>
                      ) : (
                        <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
                          <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                              <th className="pb-4 font-bold pl-4 font-mono">Student ID</th>
                              <th className="pb-4 font-bold">Applicant Type</th>
                              <th className="pb-4 font-bold">Full Name</th>
                              <th className="pb-4 font-bold">Email</th>
                              <th className="pb-4 font-bold">Proof of Registration</th>
                              <th className="pb-4 font-bold text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {pendingStudents.map(student => (
                              <tr key={student.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30">
                                <td className="py-4 pl-4 font-mono text-sm font-semibold text-gray-800 dark:text-gray-100">{student.student_id}</td>
                                <td className="py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{USER_TYPE_LABELS[student.user_type] || 'Student'}</td>
                                <td className="py-4 text-sm font-bold text-gray-900 dark:text-gray-100">{student.full_name}</td>
                                <td className="py-4 text-sm text-gray-600 dark:text-gray-300">{student.email || '—'}</td>
                                <td className="py-4">
                                  {student.id_proof_path ? (
                                    <Button
                                      onClick={() => setViewImageUrl(student.id_proof_path)}
                                      className="trace-action text-xs text-indigo-600 dark:text-indigo-300 font-bold hover:underline flex items-center gap-1"
                                    >
                                      <svg className="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>View ID / Diploma Attachment
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-400 dark:text-gray-400 italic">No proof uploaded</span>
                                  )}
                                </td>
                                <td className="py-4">
                                  <Button onClick={() => handleAdminVerifyStudent(student, 'review')} disabled={actionLoading} className="trace-button trace-button-primary">Review</Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}
            {currentTab === 'admin-tracker' && (
              <div className="trace-page">
                {/* Header */}
                <div className="trace-page-header">
                  <div>
                    <h2 className="trace-page-title">
                      System-Wide Tracker
                    </h2>
                  </div>
                </div>

                {/* All Documents Tracker */}
                <div className="trace-section overflow-hidden">
                  <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">System-Wide Document Tracker</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Filter:</span>
                      <select
                        value={adminDocFilter}
                        onChange={(e) => setAdminDocFilter(e.target.value)}
                        className="trace-control"
                      >
                        <option value="All">All Documents</option>
                        <option value="Transcript of Records">Transcript of Records</option>
                        <option value="Honorable Dismissal">Honorable Dismissal</option>
                        <option value="Clearance">Clearance</option>
                        <option value="Certificate of Good Moral">Certificate of Good Moral</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Certification">Certification</option>
                      </select>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div ref={tableRef} className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                      {documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">No documents match the current filter.</div>
                      ) : (
                        <table className="w-full text-left border-collapse table-fixed min-w-[42.5rem]">
                          <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                              <th className="pb-4 font-bold pl-4">Tracking ID</th>
                              <th className="pb-4 font-bold">Student</th>
                              <th className="pb-4 font-bold">Document Type</th>
                              <th className="pb-4 font-bold">Status</th>
                              <th className="pb-4 font-bold">Date Updated</th>
                              <th className="pb-4 font-bold text-right pr-4">Attachment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {documents
                              .filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter)
                              .slice((adminDocPage - 1) * itemsPerPage, adminDocPage * itemsPerPage)
                              .map(doc => (
                                <tr key={doc.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30">
                                  <td className="py-4 pl-4 font-mono text-xs font-bold text-gray-900 dark:text-gray-100">
                                    #{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}
                                  </td>
                                  <td className="py-4 text-sm font-bold"><Button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="trace-action text-blue-700 dark:text-blue-300 hover:underline text-left break-words focus-visible:ring-2 focus-visible:ring-blue-500 disabled:text-gray-500">{doc.student_name || doc.student_id || 'Unknown'}</Button></td>
                                  <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_sequence_number || doc.document_type}</td>
                                  <td className="py-4">
                                    <span className={`inline-flex max-w-full px-3 py-1 text-[10px] leading-normal font-black rounded-full uppercase tracking-wider ${
                                      getStatusTone(doc.current_status)
                                    }`}>
                                      {getStatusLabel(doc.current_status)}
                                    </span>
                                  </td>
                                  <td className="py-4 text-xs font-semibold text-gray-400 dark:text-gray-400">
                                    {new Date(doc.updated_at).toLocaleDateString()} {new Date(doc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </td>
                                  <td className="py-4 text-right pr-4">
                                    {doc.file_path ? (
                                      <Button
                                        onClick={() => setViewImageUrl(doc.file_path)}
                                        className="trace-button trace-button-primary inline-flex items-center gap-1"
                                        title="View Attached File"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                        View
                                      </Button>
                                    ) : (
                                      <span className="text-[10px] text-gray-400 dark:text-gray-400 font-bold uppercase tracking-widest">No File</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      )}

                    </div>
                  </div>
                  {/* Pagination Controls */}
                  {documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length > itemsPerPage && (
                    <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Showing Page {adminDocPage} of {Math.ceil(documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length / itemsPerPage)}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => setAdminDocPage(p => Math.max(1, p - 1))}
                          disabled={adminDocPage === 1}
                          className="trace-button trace-button-secondary"
                        >
                          Previous
                        </Button>
                        <Button
                          onClick={() => setAdminDocPage(p => Math.min(Math.ceil(documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length / itemsPerPage), p + 1))}
                          disabled={adminDocPage === Math.ceil(documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length / itemsPerPage)}
                          className="trace-button trace-button-secondary"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            {currentTab === 'admin-users' && (
              <div className="trace-page">
                <div className="trace-page-header">
                  <div>
                    <h2 className="trace-page-title">Registered Users</h2>
                  </div>
                </div>
                <UserGrid
                  users={filteredAdminUsers}
                  onSelectUser={setSelectedUser}
                  searchValue={adminUsersFilter}
                  onSearchChange={setAdminUsersFilter}
                  roleFilter={adminUsersRoleFilter}
                  onRoleFilterChange={setAdminUsersRoleFilter}
                  roleOptions={[
                    { value: 'All', label: 'All Roles' },
                    { value: 'student', label: 'Student' },
                    { value: 'clerk', label: 'Clerk' },
                    { value: 'admin', label: 'Administrator' },
                  ]}
                />
                <UserDetailModal
                  open={!!selectedUser}
                  onClose={() => setSelectedUser(null)}
                  user={selectedUser}
                  viewerId={user.id}
                />
              </div>
            )}
            {currentTab === 'admin-logs' && (
              <div className="trace-page">
                <div className="trace-page-header">
                  <div>
                    <h2 className="trace-page-title">Activity Logs</h2>
                  </div>
                </div>
                <div className="trace-section overflow-hidden">
                  <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">System-Wide Audit Log</h3>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left border-collapse table-fixed whitespace-nowrap min-w-[42.5rem]">
                        <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                          <tr className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                            <th className="pb-4 font-bold pl-4">Timestamp</th>
                            <th className="pb-4 font-bold">Document</th>
                            <th className="pb-4 font-bold">Action</th>
                            <th className="pb-4 font-bold">User</th>
                            <th className="pb-4 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                          {adminLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30">
                              <td className="py-4 pl-4 text-xs font-semibold text-gray-500 dark:text-gray-400">{new Date(log.timestamp_started).toLocaleString()}</td>
                              <td className="py-4 text-sm font-bold text-gray-900 dark:text-gray-100">{log.document_type || 'Unknown'} <span className="text-gray-400 dark:text-gray-400 font-mono text-xs">#{log.tracking_number || 'N/A'}</span></td>
                              <td className="py-4 text-sm text-gray-600 dark:text-gray-300 capitalize">{log.step_name ? log.step_name.replace(/_/g, ' ') : 'System Action'}</td>
                              <td className="py-4 text-sm text-gray-600 dark:text-gray-300">{log.user_name || 'System'}</td>
                              <td className="py-4">
                                <span className={`inline-flex max-w-full px-3 py-1 rounded-full text-xs font-bold whitespace-normal break-words ${getStatusTone(log.status)}`}>
                                  {getStatusLabel(log.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                    </div>
                  </div>
                </div>
              </div>
            )}

      <ForecastModal
        open={activeModal === 'forecast-detail'}
        onClose={() => setActiveModal(null)}
        forecastData={forecastData}
        forecastFilter={forecastFilter}
        setForecastFilter={setForecastFilter}
      />

      <AccountVerificationModal key={studentVerifyToConfirm?.student?.id || 'none'}
        studentVerifyToConfirm={studentVerifyToConfirm}
        cancelAdminVerifyStudent={cancelAdminVerifyStudent}
        confirmAdminVerifyStudent={confirmAdminVerifyStudent}
        actionLoading={actionLoading}
        setViewImageUrl={setViewImageUrl}
      />
      <StudentProfileModal
        open={!!viewProfileId}
        onClose={() => setViewProfileId(null)}
        studentId={viewProfileId}
      />
    </>
  );
}
