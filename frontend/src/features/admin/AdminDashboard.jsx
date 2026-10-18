import AdminTimestamp from './components/AdminTimestamp';
import PaginatedTable from '@/components/PaginatedTable';
import EmailText from '@/components/EmailText';
import FilterSelect from '@/components/FilterSelect';
import AdminAuditLog from './components/AdminAuditLog';
import AdminIcon from './components/AdminIcon';
import AdminMetricCard from '@/features/admin/components/AdminMetricCard';
import ScanFieldDetectionCard from '@/features/admin/components/ScanFieldDetectionCard';
import RequestAssignmentModal from '@/features/admin/components/RequestAssignmentModal';
import RequestStaff from '@/components/RequestStaff';
import Button from '@/components/Button';
import StudyYearsCorrectionModal from '@/features/admin/components/StudyYearsCorrectionModal';
import ForecastChart from './components/ForecastChart';
import ForecastDays from './components/ForecastDays';
import ForecastEvidence from './components/ForecastEvidence';
import { USER_TYPE_LABELS } from '@/utils/userLabels';
import AdminTemplatesPanel from './components/AdminTemplatesPanel';
import AdminSecurityPanel from './components/AdminSecurityPanel';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import { useState } from 'react';
import MiniSparkline from '@/components/MiniSparkline';
import useAdminDashboard from '@/features/admin/useAdminDashboard';
import { todayLongDate, formatDuration, formatDateTime } from '@/utils/formatters';
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
  const [assignmentTarget, setAssignmentTarget] = useState(null);
  const [studyCorrectionTarget, setStudyCorrectionTarget] = useState(null);
  const [viewProfileId, setViewProfileId] = useState(null);

  const {
    loading,
    success,
    dismissNotification,
    error,
    documents,
    loadDashboardData,
    dashStats, statsAvailable,
    forecastData, forecast,
    aiInsights, insightsLoading, refreshInsights,
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
      {assignmentTarget && <RequestAssignmentModal key={assignmentTarget.id} document={assignmentTarget} onClose={() => setAssignmentTarget(null)} onSaved={() => { setAssignmentTarget(null); void loadDashboardData(); }} />}
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} />
            {currentTab === 'dashboard' && (
              <div className="trace-page trace-admin-dashboard">
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
                    <img src="/admin-figma/dashboard-calendar.png" alt="" aria-hidden="true" width="30" height="30" className="shrink-0" />
                  </div>
                </div>

                <div className="trace-admin-kpis">
                  <AdminMetricCard label="System Throughput" value={!analyticsSummary ? 'Throughput unavailable' : analyticsSummary.end_to_end?.completed_count > 0 ? formatDuration(analyticsSummary.end_to_end.avg_minutes) : 'No completed requests yet'} icon="throughput" helper="Average document processing time across all completed requests">
                    {analyticsSummary?.end_to_end?.completed_count > 0 && analyticsSummary?.throughput?.length > 0 && <MiniSparkline data={analyticsSummary.throughput.map(t => ({ v: t.completed, label: t.date }))} unit="docs" className="w-full h-12" />}
                    {analyticsSummary?.end_to_end?.completed_count > 0 && <p className="mt-1 text-[0.625rem] text-trace-ink dark:text-gray-300">Daily completed documents</p>}
                  </AdminMetricCard>
                  <ScanFieldDetectionCard available={statsAvailable} measurement={dashStats.ocr_field_detection} />
                  <AdminMetricCard label="Real-time Backlog" value={statsAvailable ? dashStats.backlog_count : 'Unavailable'} icon="backlog" helper="Documents currently pending across all desks">
                    <p className="mt-1 text-[0.625rem] text-trace-ink dark:text-gray-300">Current saved pipeline counts</p>
                  </AdminMetricCard>
                </div>

                <div className="trace-admin-chart-row">
                  {/* volume forecast chart */}
                  <div className="trace-section trace-section-body flex flex-col min-h-[335px]">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-6">
                      <div>
                        <div className="flex items-center gap-1"><h3 className="trace-section-title">7-Day Volume Forecast</h3><ForecastEvidence forecast={forecast}/></div>
                        <p className="text-xs text-gray-400 dark:text-gray-400 font-medium">Recorded request history · {forecast.source === 'prophet' ? 'Prophet estimate' : forecast.source === 'historical_weekday_average' ? 'Historical weekday average' : 'Estimate availability'}</p>
                      </div>
                      <div className="flex min-w-0 max-w-full items-center gap-2">
                        <FilterSelect aria-label="Forecast document type"
                          value={forecastFilter}
                          onChange={(e) => setForecastFilter(e.target.value)}
                          className="trace-control cursor-pointer"
                        >
                          <option value="All">All Documents</option>
                          {(forecast.document_types || []).map(type=><option key={type} value={type}>{type}</option>)}
                        </FilterSelect>
                        <Button type="button" onClick={forecast.refresh} disabled={forecast.loading} aria-label="Refresh forecast" className="trace-icon-button"><AdminIcon name="refresh" /></Button>
                        <Button
                          onClick={() => setActiveModal('forecast-detail')}
                          aria-label="Expand 7-day volume forecast"
                          title="Expand"
                          className="trace-button-lift trace-action shrink-0 rounded-lg focus-visible:ring-2 focus-visible:ring-green-600"
                        >
                          <AdminIcon name="expand-chart" />
                        </Button>
                      </div>
                    </div>
                    {forecastData?.length>0?<><ForecastChart forecastData={forecastData} forecast={forecast}/><ForecastDays forecastData={forecastData}/></>:<p role="status" className="trace-page-description py-8">{forecast.loading?'Loading forecast data…':forecast.error || forecast.message || 'Not enough recorded request history for an estimate.'}</p>}
                  </div>

                  {/* Admin Insights Panel */}
                  <section aria-labelledby="ai-insights-heading" className="trace-section trace-section-body trace-admin-insights flex flex-col h-[335px]">
                    <div>
                      <div className="flex items-center justify-between gap-3"><h3 id="ai-insights-heading" className="trace-section-title">AI INSIGHTS</h3><Button type="button" onClick={refreshInsights} disabled={insightsLoading} aria-label={insightsLoading ? 'Refreshing insights…' : 'Refresh insights'} className="trace-icon-button h-8 w-8"><AdminIcon name="refresh" className="h-4 w-4" /></Button></div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Queue-based suggested actions and measured support trends. Workflow rules support staff review.</p>
                    </div>

                    {insightsLoading && aiInsights.length > 0 && <p role="status" className="mt-2 text-xs text-gray-600 dark:text-gray-300">Refreshing; cards below show the previous snapshot.</p>}
                    <div className="flex min-h-0 flex-1 flex-col gap-2 mt-4 overflow-y-auto">
                      {aiInsights && aiInsights.length > 0 ? (
                        aiInsights.map((insight, idx) => (
                          <article key={idx} data-insight-tone={insight.type} className={`${insight.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200' : 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950 dark:border-green-800 dark:text-green-200'} min-w-0 border rounded-2xl p-4 select-text [overflow-wrap:anywhere]`}>
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
                              {insight.as_of && <p className="mt-2">Snapshot: {formatDateTime(insight.as_of)} Manila · {insight.method === 'random_forest_prototype' ? 'Experimental classification; unvalidated' : insight.method==='queue_rules'?'Workflow rules; suggested next step':'Observed queue counts; not a performance forecast'}</p>}
                              {insight.period && <p className="mt-2">{new Date(insight.period.from).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}–{new Date(insight.period.to_exclusive).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})} · {insight.sample_size} observations · {insight.method==='aggregate_rules' ? 'Aggregate rules; descriptive, not a forecast' : 'Advisory'}</p>}
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
                <div className="trace-section trace-admin-verifications overflow-hidden">
                  <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex-wrap">
                    <div><h3 id="tutorial-account-review" className="trace-section-title max-w-full">Account Verification</h3><p className="trace-admin-caption">Student registration requests waiting for your review</p></div>
                    <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {pendingStudents.length} pending {pendingStudents.length === 1 ? 'request' : 'requests'}
                    </span>
                  </div>
                  <div>
                    <div role="region" aria-label="Account verification table" tabIndex={0} className="trace-table-scroll max-h-[calc(100vh-280px)]">
                      {pendingStudents.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">No pending student accounts requiring manual validation.</div>
                      ) : (
                        <PaginatedTable label="verification requests" aria-label="Account verification requests" className="trace-data-table min-w-[62rem]">
                          <colgroup>{['w-[12%]','w-[13%]','w-[16%]','w-[25%]','w-[24%]','w-[8rem]'].map((width,index)=><col key={index} className={width}/>)}</colgroup>
                          <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                              <th className="pb-4 font-bold pl-4 font-mono">Student ID</th>
                              <th className="pb-4 font-bold">Applicant Type</th>
                              <th className="pb-4 font-bold">Registered</th>
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
                                <td className="py-4"><span className="trace-admin-badge trace-admin-badge-blue"><AdminIcon name="applicant" />{USER_TYPE_LABELS[student.user_type] || 'Student'}</span></td>
                                <td className="py-4 text-xs"><AdminTimestamp value={student.created_at} /></td>
                                <td className="py-4 text-sm font-bold text-gray-900 dark:text-gray-100">{student.full_name}</td>
                                <td className="py-4 text-sm text-gray-600 dark:text-gray-300"><EmailText value={student.email} /></td>
                                <td className="py-4">
                                  {student.id_proof_path ? (
                                    <Button
                                      onClick={() => setViewImageUrl(student.id_proof_path)}
                                      className="trace-action text-xs text-indigo-600 dark:text-indigo-300 font-bold hover:underline flex items-center gap-1"
                                    >
                                      <AdminIcon name="paperclip" />View proof of ID attachment
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-gray-400 dark:text-gray-400 italic">No proof uploaded</span>
                                  )}
                                </td>
                                <td className="py-4">
                                  <Button onClick={() => handleAdminVerifyStudent(student, 'review')} disabled={actionLoading} className="trace-button trace-button-primary min-w-max max-w-none whitespace-nowrap"><img src="/admin-figma/review-eye.png" alt="" aria-hidden="true" width="15" height="13" className="shrink-0" />Review</Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </PaginatedTable>
                      )}

                    </div>
                  </div>
                </div>
              </div>
            )}
            {currentTab === 'admin-tracker' && (
              <div className="trace-page trace-admin-tracker">
                {/* Header */}
                <div className="trace-page-header trace-standard-heading">
                  <div>
                    <h2 className="trace-page-title">
                      System-Wide Tracker
                    </h2>
                    <p className="trace-page-description">Monitor document requests, assignments and processing stages across the system.</p>
                  </div>
                </div>

                {/* All Documents Tracker */}
                <div className="trace-section overflow-hidden">
                  <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <h3 className="trace-section-title">System-Wide Document Tracker</h3>
                    <div className="trace-actions">
                      <label htmlFor="admin-document-filter" className="sr-only">Filter:</label>
                      <FilterSelect
                        id="admin-document-filter"
                        value={adminDocFilter}
                        onChange={(e) => setAdminDocFilter(e.target.value)}
                        className="trace-control min-w-0 max-w-full"
                      >
                        <option value="All">All Documents</option>
                        <option value="Transcript of Records">Transcript of Records</option>
                        <option value="Honorable Dismissal">Honorable Dismissal</option>
                        <option value="Clearance">Clearance</option>
                        <option value="Certificate of Good Moral">Certificate of Good Moral</option>
                        <option value="Diploma">Diploma</option>
                        <option value="Certification">Certification</option>
                      </FilterSelect>
                    </div>
                  </div>
                  <div className="p-4 sm:p-6">
                    <div ref={tableRef} role="region" aria-label="System-wide document tracker table" tabIndex={0} className="trace-table-scroll max-h-[calc(100vh-280px)]">
                      {documents.filter(doc => adminDocFilter === 'All' || doc.document_type === adminDocFilter).length === 0 ? (
                        <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">No documents match the current filter.</div>
                      ) : (
                        <table aria-label="System-wide document tracker" className="trace-data-table min-w-[64rem]">
                          <colgroup>{['w-[13%]','w-[14%]','w-[14%]','w-[15%]','w-[18%]','w-[18%]','w-[7rem]'].map((width,index)=><col key={index} className={width}/>)}</colgroup>
                          <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                              <th className="pb-4 font-bold pl-4">Tracking ID</th>
                              <th className="pb-4 font-bold">Student</th>
                              <th className="pb-4 font-bold">Document Type</th>
                              <th className="pb-4 font-bold">Status</th>
                              <th className="pb-4 font-bold">Staff / Handoff</th>
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
                                    #{doc.tracking_number ? doc.tracking_number : doc.id}
                                  </td>
                                  <td className="py-4 text-sm font-bold"><Button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="trace-action block min-w-0 max-w-full text-blue-700 dark:text-blue-300 hover:underline text-left [overflow-wrap:anywhere] focus-visible:ring-2 focus-visible:ring-blue-500 disabled:text-gray-500">{doc.student_name || doc.student_id || 'Unknown'}</Button></td>
                                  <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_sequence_number || doc.document_type}</td>
                                  <td className="py-4">
                                    <span className={`inline-flex max-w-full whitespace-normal break-words px-3 py-1 text-[10px] leading-normal font-medium rounded-full uppercase ${
                                      getStatusTone(doc.current_status)
                                    }`}>
                                      {getStatusLabel(doc.current_status)}
                                    </span>
                                  </td>
                                  <td className="py-4"><RequestStaff document={doc} compact /><Button type="button" onClick={() => setAssignmentTarget(doc)} className="trace-button trace-button-primary mt-2">Assign staff</Button></td>
                                  <td className="py-4 text-xs font-semibold text-gray-400 dark:text-gray-400">
                                    {new Date(doc.updated_at).toLocaleDateString()} {new Date(doc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </td>
                                  <td className="py-4 text-right pr-4">
                                    {doc.file_path ? (
                                      <Button
                                        type="button"
                                        onClick={() => setViewImageUrl(doc.file_path)}
                                        className="trace-button trace-button-primary inline-flex min-w-max max-w-none items-center gap-1 whitespace-nowrap"
                                        title="View Attached File"
                                      >
                                        <img src="/admin-figma/review-eye.png" alt="" aria-hidden="true" width="15" height="13" />
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
                  onCorrectStudyYears={user.role === 'admin' && selectedUser?.role === 'student' ? () => setStudyCorrectionTarget(selectedUser) : undefined}
                />
              </div>
            )}
            {currentTab === 'admin-logs' && (
              <section className="trace-page">
                <header className="trace-standard-heading"><h2 className="trace-page-title">Activity Logs</h2><p className="trace-page-description">Review document actions and workflow updates across all desks.</p></header>
                <AdminAuditLog logs={adminLogs} />
              </section>
            )}

      <ForecastModal
        open={activeModal === 'forecast-detail'}
        onClose={() => setActiveModal(null)}
        forecastData={forecastData}
        forecast={forecast}
        forecastFilter={forecastFilter}
        setForecastFilter={setForecastFilter}
      />

      {studyCorrectionTarget && <StudyYearsCorrectionModal key={studyCorrectionTarget.id} target={studyCorrectionTarget}
        onClose={() => setStudyCorrectionTarget(null)} onSaved={() => { setStudyCorrectionTarget(null); setSelectedUser(null); }} />}

      <AccountVerificationModal key={studentVerifyToConfirm?.student?.id || 'none'}
        studentVerifyToConfirm={studentVerifyToConfirm}
        reviewTotal={pendingStudents.length}
        reviewPosition={Math.max(1, pendingStudents.findIndex(student => student.id === studentVerifyToConfirm?.student?.id) + 1)}
        cancelAdminVerifyStudent={cancelAdminVerifyStudent}
        confirmAdminVerifyStudent={confirmAdminVerifyStudent}
        actionLoading={actionLoading}
        setViewImageUrl={setViewImageUrl}
      />
      <StudentProfileModal
        viewerRole="admin"
        open={!!viewProfileId}
        onClose={() => setViewProfileId(null)}
        studentId={viewProfileId}
      />
    </>
  );
}
