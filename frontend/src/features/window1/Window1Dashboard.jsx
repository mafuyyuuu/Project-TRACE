import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import FileUploadField from '@/components/FileUploadField';
import QueueTabs from '@/components/QueueTabs';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import { useState } from 'react';
import HardwareScannerModal from '@/features/window1/components/HardwareScannerModal';
import IntakeReviewModal from '@/features/window1/components/IntakeReviewModal';
import ManualInputModal from '@/features/window1/components/ManualInputModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import ModalShell from '@/components/ModalShell';
import MiniSparkline from '@/components/MiniSparkline';
import { getProgressVal, getStatusLabel, getStatusTone, requiresAttachment } from '@/utils/documentStatus';
import { getWaitTime, todayLongDate } from '@/utils/formatters';
import useWindow1Dashboard from '@/features/window1/useWindow1Dashboard';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';
import StudentProfileModal from '@/components/StudentProfileModal';
import ReportsPanel from '@/features/admin/components/ReportsPanel';

/**
 * Window 1 clerk: the counter at both ends of the pipeline.
 *
 * Two working queues — Intake at the front, Release at the back — plus a
 * Tracking Desk that shows every document in the system, because this is the
 * window a student walks up to and asks "where is mine?".
 */
export default function Window1Dashboard({ user, currentTab, setViewImageUrl }) {
  const [queueTab, setQueueTab] = useState('intake');
  const [viewProfileId, setViewProfileId] = useState(null);

  const {
    loading,
    success,
    dismissNotification,
    error,
    documents,
    intakeQueue,
    releaseQueue,
    dashStats,
    actionLoading,
    selectedDoc,
    setSelectedDoc,
    intakeNotes,
    setIntakeNotes,
    intakeFile,
    setIntakeFile,
    handleIntake,
    intakeActionToConfirm,
    confirmIntake,
    cancelIntake,
    submissionToConfirm,
    confirmWindow1Submission,
    cancelWindow1Submission,
    w1IntakePage,
    setW1IntakePage,
    scanDocType,
    documentTypes = [], documentTypesLoading,
    setScanDocType,
    activeModal,
    setActiveModal,
    scanFile,
    setScanFile,
    scanProgress,
    loadDashboardData,
    handleWindow1Release,
    releaseToConfirm,
    confirmWindow1Release,
    cancelWindow1ReleaseConfirm,
    simulateHardwareScan,
    handleWindow1ScanUpload,
    handleManualInputSubmit,
    handleFetchStudent,
    w1ReleasePage,
    setW1ReleasePage,
    w1ProgressPage,
    setW1ProgressPage,
    itemsPerPage,
    intakePagination, releasePagination, progressPagination,
  } = useWindow1Dashboard(user, currentTab, queueTab);

  const todayFormatted = todayLongDate();

  if (currentTab === 'messages') return <RequestMessagesPanel user={user} initialDocumentId={new URLSearchParams(window.location.search).get('document')} />;
  if (loading) return <DashboardLoading />;
  if (currentTab === 'reports') return <ReportsPanel user={user} currentTab={currentTab} />;

  return (
    <>
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} dismissalKey={`${currentTab}:${queueTab}`} />
      <div className="space-y-8 animate-fade-in">
        {/* 3.1. WORKSPACE DASHBOARD VIEW */}
        {currentTab === 'dashboard' && (
          <>
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 tracking-tight">
                  Welcome back, <span className="text-[#15803d] dark:text-green-300">Window 1 Clerk</span>
                </h2>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Today:</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{todayFormatted}</span>
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
            </div>

            {/* Top KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">PROCESSED MANUAL DOCUMENT TODAY</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 mt-2 block">{dashStats.processed_today} <span className="text-sm text-gray-400 dark:text-gray-400 font-medium font-sans">Documents</span></span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] dark:text-green-300 w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  Documents scanned and routed today
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">AWAITING SECRETARY</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 mt-2 block">
                      {dashStats.pending_secretary_count} <span className="text-sm text-gray-400 dark:text-gray-400 font-medium font-sans">Pending</span>
                    </span>
                  </div>
                  <MiniSparkline trend="down" />
                </div>
                <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                  Documents at the Secretary desk awaiting evaluation
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">COMPLETED TODAY</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 mt-2 block">
                      {dashStats.completed_today_count} <span className="text-sm text-gray-400 dark:text-gray-400 font-medium font-sans">Completed</span>
                    </span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] dark:text-green-300 w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  Documents released to students today
                </div>
              </div>
            </div>

            {/* Upload Document Dropzone */}
            <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-6 mt-8 items-start">
              <aside className="min-w-0">            <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
              <div className="flex flex-col items-start gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">UPLOAD DOCUMENT</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">Upload physical papers to extract data via AI Engine.</p>
                </div>
                <button
                  onClick={() => setActiveModal('manual-input')}
                  className="shrink-0 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d]/40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Manual Entry
                </button>
              </div>

              <div className="mt-4">
                <FileUploadField label="Scan or upload a document" file={scanFile} onChange={simulateHardwareScan} disabled={actionLoading} />
              </div>
            </div>
              </aside>
              <section className="min-w-0">
                <QueueTabs tabs={[{ key: 'intake', label: 'Intake', count: intakeQueue.length }, { key: 'release', label: 'Release', count: releaseQueue.length }]} activeKey={queueTab} onChange={setQueueTab} />
                {queueTab === 'intake' && <>            {/* Intake queue — the first human look at every request, online or walk-in */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg uppercase tracking-wider">INTAKE QUEUE</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <span>Awaiting Intake Check: <strong className="text-gray-900 dark:text-gray-100">{intakeQueue.length}</strong></span>
                    <span className="hidden sm:inline text-gray-400 dark:text-gray-400">Check the paperwork, then route to the College Secretary.</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div ref={intakePagination?.containerRef} className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                  {intakeQueue.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-400 font-medium">Nothing waiting for intake.</div>
                  ) : (
                    <>
                      <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
                        <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                          <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                            <th className="pb-4 font-bold pl-4">Tracking Hash</th>
                            <th className="pb-4 font-bold">Student</th>
                            <th className="pb-4 font-bold">Document Type</th>
                            <th className="pb-4 font-bold">Attachment</th>
                            <th className="pb-4 font-bold">Waiting</th>
                            <th className="pb-4 font-bold text-right pr-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                          {intakeQueue
                            .slice((w1IntakePage - 1) * itemsPerPage, w1IntakePage * itemsPerPage)
                            .map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 group">
                              <td className="py-4 pl-4 font-mono text-xs text-gray-500 dark:text-gray-400">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                              <td className="py-4">
                                <button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="text-sm font-bold text-blue-700 dark:text-blue-300 hover:underline text-left focus-visible:ring-2 focus-visible:ring-blue-500">{doc.student_name || 'Name Unresolved'}</button>
                                <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5 select-text break-words">{doc.student_id || 'ID Pending'}</div>
                              </td>
                              <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_type}</td>
                              <td className="py-4 text-xs font-semibold">
                                {doc.file_path
                                  ? <span className="text-[#15803d] dark:text-green-300">Attached</span>
                                  : requiresAttachment(doc.document_type)
                                    ? <span className="text-amber-600 dark:text-amber-300">Needs scan</span>
                                    : <span className="text-gray-400 dark:text-gray-400">None</span>}
                              </td>
                              <td className="py-4 text-xs font-bold text-gray-500 dark:text-gray-400 font-mono">{getWaitTime(doc.created_at)}</td>
                              <td className="py-4 text-right pr-4">
                                <button
                                  onClick={() => { setSelectedDoc(doc); setActiveModal('intake-review'); }}
                                  className="px-5 py-2.5 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                  Check
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {intakeQueue.length > itemsPerPage && (
                        <div className="flex justify-between items-center mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                          <button
                            disabled={w1IntakePage === 1}
                            onClick={() => setW1IntakePage(p => p - 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Previous
                          </button>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            Page {w1IntakePage} of {Math.ceil(intakeQueue.length / itemsPerPage)}
                          </span>
                          <button
                            disabled={w1IntakePage >= Math.ceil(intakeQueue.length / itemsPerPage)}
                            onClick={() => setW1IntakePage(p => p + 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>

</>}
                {queueTab === 'release' && <>            {/* Active release queue card */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg uppercase tracking-wider">RELEASE DESK</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <span>Pending Student Pick-up: <strong className="text-gray-900 dark:text-gray-100">{dashStats.ready_window_1_count}</strong></span>
                    <span>Cleared by Secretary Today: <strong className="text-gray-900 dark:text-gray-100">{dashStats.cleared_by_secretary_today}</strong></span>
                  </div>
                </div>
                <button onClick={loadDashboardData} className="text-xs text-[#15803d] dark:text-green-300 font-bold hover:underline inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg> Refresh</button>
              </div>

              <div className="p-4 sm:p-6">
                <div ref={releasePagination?.containerRef} className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                  {releaseQueue.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-400 font-medium">No documents waiting for release.</div>
                  ) : (
                    <>
                      <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
                        <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                          <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                            <th className="pb-4 font-bold pl-4">Tracking Hash</th>
                            <th className="pb-4 font-bold">Student</th>
                            <th className="pb-4 font-bold">Document Type</th>
                            <th className="pb-4 font-bold">Official Receipt</th>
                            <th className="pb-4 font-bold">Wait Time</th>
                            <th className="pb-4 font-bold text-right pr-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                          {releaseQueue
                            .slice((w1ReleasePage - 1) * (releasePagination?.pageSize || itemsPerPage), w1ReleasePage * (releasePagination?.pageSize || itemsPerPage))
                            .map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 group">
                              <td className="py-4 pl-4 font-mono text-xs text-gray-500 dark:text-gray-400">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                              <td className="py-4">
                                <button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="text-sm font-bold text-blue-700 dark:text-blue-300 hover:underline text-left focus-visible:ring-2 focus-visible:ring-blue-500">{doc.student_name || 'Name Unresolved'}</button>
                                <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5 select-text break-words">{doc.student_id || 'ID Pending'}</div>
                              </td>
                              <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_type}</td>
                              <td className="py-4 text-xs font-mono">
                                {doc.or_number
                                  ? <span className="font-bold text-gray-700 dark:text-gray-300">{doc.or_number}</span>
                                  : <span className="text-gray-400 dark:text-gray-400">OR number not recorded</span>}
                                {!doc.official_receipt_path && <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-sans">Digital copy pending upload</span>}
                                {doc.official_receipt_path && (
                                  <button
                                    onClick={() => setViewImageUrl(doc.official_receipt_path)}
                                    className="ml-2 text-[#15803d] dark:text-green-300 hover:underline font-sans font-bold"
                                  >
                                    View
                                  </button>
                                )}
                              </td>
                              <td className="py-4 text-xs font-bold text-gray-505 font-mono">{getWaitTime(doc.updated_at)}</td>
                              <td className="py-4 text-right pr-4">
                                <button 
                                  onClick={() => handleWindow1Release(doc)}
                                  disabled={actionLoading}
                                  className="px-5 py-2.5 bg-[#15803d] hover:bg-[#166534] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                                  Release Doc
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {releaseQueue.length > (releasePagination?.pageSize || itemsPerPage) && (
                        <div className="flex justify-between items-center mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                          <button 
                            disabled={w1ReleasePage === 1}
                            onClick={() => setW1ReleasePage(p => p - 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Previous
                          </button>
                          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                            Page {w1ReleasePage} of {Math.ceil(releaseQueue.length / (releasePagination?.pageSize || itemsPerPage))}
                          </span>
                          <button 
                            disabled={w1ReleasePage >= Math.ceil(releaseQueue.length / (releasePagination?.pageSize || itemsPerPage))}
                            onClick={() => setW1ReleasePage(p => p + 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
              
                </div>
              </div>
            </div></>}
              </section>
            </div>
          </>
        )}

        {/* 3.2. TRACKING DESK VIEW */}
        {currentTab === 'tracking-desk' && (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 tracking-tight">
                  Tracking Desk
                </h2>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Today:</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{todayFormatted}</span>
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
            </div>
            {/* System Documents Progress Queue */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mt-8">
              <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg uppercase tracking-wider">SYSTEM DOCUMENTS PROGRESS</h3>
                  <p className="text-xs text-gray-400 dark:text-gray-400 mt-1">Live tracking of all active requested documents in the system.</p>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">No active document requests.</div>
                ) : (
                  <>
                    <div ref={progressPagination?.containerRef} className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                        <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                          <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                            <th className="pb-4 font-bold pl-4">Date Requested</th>
                            <th className="pb-4 font-bold">Document</th>
                            <th className="pb-4 font-bold">Progress</th>
                            <th className="pb-4 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                          {documents.slice((w1ProgressPage - 1) * (progressPagination?.pageSize || itemsPerPage), w1ProgressPage * (progressPagination?.pageSize || itemsPerPage)).map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="py-4 pl-4 text-xs font-semibold text-gray-400 dark:text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                              <td className="py-4">
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{doc.document_type}</div>
                                <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                              </td>
                              <td className="py-4 w-1/3">
                                <div className="flex items-center gap-3">
                                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                    <div className="bg-[#15803d] h-2 rounded-full transition-all duration-200" style={{ width: `${getProgressVal(doc.current_status)}%` }}></div>
                                  </div>
                                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 font-mono">{getProgressVal(doc.current_status)}%</span>
                                </div>
                              </td>
                              <td className="py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusTone(doc.current_status)}`}>
                                  {getStatusLabel(doc.current_status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {documents.length > (progressPagination?.pageSize || itemsPerPage) && (
                      <div className="flex justify-between items-center mt-6 border-t border-gray-100 dark:border-gray-700 pt-4">
                        <button 
                          disabled={w1ProgressPage === 1}
                          onClick={() => setW1ProgressPage(p => p - 1)}
                          className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                          Page {w1ProgressPage} of {Math.ceil(documents.length / (progressPagination?.pageSize || itemsPerPage))}
                        </span>
                        <button 
                          disabled={w1ProgressPage >= Math.ceil(documents.length / (progressPagination?.pageSize || itemsPerPage))}
                          onClick={() => setW1ProgressPage(p => p + 1)}
                          className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}



        {/* 3.4. CAMERA SCANNING MODAL */}
        {activeModal === 'scanning' && (
          <ModalShell open onClose={() => setActiveModal(null)} title="Scan Document" footer={<div className="flex items-center justify-center gap-8 pt-2">
                <button type="button" aria-label="Flash" className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </button>
                <button type="button" aria-label="Capture document"
                  onClick={() => {
                    setScanFile({ name: 'scan_doc_00129.jpg', size: 245800 });
                    setScanDocType('Transcript of Records');
                    setActiveModal('scan-confirm');
                  }}
                  className="w-16 h-16 rounded-full bg-white dark:bg-gray-900 border-8 border-gray-200 dark:border-gray-700 flex items-center justify-center hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
                >
                  <div className="w-10 h-10 rounded-full bg-[#15803d] hover:bg-[#166534] transition-all"></div>
                </button>
                <div className="w-12 h-12"></div> {/* spacer */}
              </div>}>
              {/* Mock Camera Preview Box */}
              <div className="min-h-80 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden my-4 relative flex flex-col items-center justify-center shadow-inner">
                <span className="absolute top-4 px-4 py-1.5 bg-[#15803d]/90 text-white text-[10px] font-bold tracking-widest uppercase rounded-full shadow-sm animate-pulse">
                  Document Detected
                </span>

                <div className="w-48 h-64 border-2 border-dashed border-[#15803d] rounded-xl flex items-center justify-center bg-white/20 dark:bg-gray-900/20 select-none shadow-sm">
                  <svg className="w-10 h-10 text-gray-400 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>

                <span className="absolute bottom-4 text-[10px] font-bold text-gray-400 dark:text-gray-400 tracking-wide uppercase">
                  Align document within frame
                </span>
              </div>

          </ModalShell>
        )}

        {/* 3.5. INTAKE SCAN CONFIRMATION MODAL */}
        {activeModal === 'scan-confirm' && scanFile && (
          <ModalShell open onClose={() => setActiveModal(null)} title="Confirm Information" footer={<div className="flex justify-end pt-2">
                <button 
                  onClick={() => {
                    handleWindow1ScanUpload(scanDocType);
                  }}
                  disabled={actionLoading || documentTypesLoading || !documentTypes.some(type => type.name === scanDocType)}
                  className="px-8 py-3.5 bg-[#15803d] hover:bg-[#166534] disabled:opacity-75 text-white font-bold rounded-xl text-xs shadow-md transition-all uppercase tracking-wider w-full text-center"
                >
                  {actionLoading ? 'Uploading...' : 'Create Request'}
                </button>
              </div>}>
              <div className="flex flex-col gap-2 my-4">
                <label className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">Document Type</label>
                <select 
                  value={scanDocType}
                  onChange={(e) => setScanDocType(e.target.value)}
                  className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer"
                >
                  <option value="">Choose a document type</option>
                  {documentTypes.map(type => <option key={type.id || type.name} value={type.name}>{type.name}</option>)}
                </select>
              </div>

              <FileUploadField label="Selected document" file={scanFile} onChange={setScanFile} disabled={actionLoading} />

          </ModalShell>
        )}
      </div>

      <HardwareScannerModal
        open={activeModal === 'hardware-scanner' && !!scanFile}
        scanFile={scanFile}
        scanProgress={scanProgress}
      />

      {activeModal === 'intake-review' && selectedDoc && (
        <IntakeReviewModal
          documentTypes={documentTypes} documentTypesLoading={documentTypesLoading}
          selectedDoc={selectedDoc}
          setActiveModal={setActiveModal}
          setViewImageUrl={setViewImageUrl}
          handleIntake={handleIntake}
          actionLoading={actionLoading}
          intakeNotes={intakeNotes}
          setIntakeNotes={setIntakeNotes}
          intakeFile={intakeFile}
          setIntakeFile={setIntakeFile}
        />
      )}

      <ManualInputModal
        documentTypes={documentTypes} documentTypesLoading={documentTypesLoading}
        open={activeModal === 'manual-input'}
        onClose={() => setActiveModal(null)}
        handleManualInputSubmit={handleManualInputSubmit}
        handleFetchStudent={handleFetchStudent}
        actionLoading={actionLoading}
      />

      <ConfirmDialog open={!!submissionToConfirm} title="Confirm Request Submission"
        message={submissionToConfirm ? `File ${submissionToConfirm.documentType}${submissionToConfirm.studentName ? ` for ${submissionToConfirm.studentName}` : ' from this scan'}?` : ''}
        confirmLabel="Submit Request" loadingLabel="Submitting…" loading={actionLoading}
        onConfirm={confirmWindow1Submission} onCancel={cancelWindow1Submission} />

      <ConfirmDialog
        open={!!releaseToConfirm}
        title="Release Document"
        message="Confirm the request information before releasing the document."
        maxWidth="max-w-4xl"
        children={releaseToConfirm && <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <div className="min-h-56 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
            <h4 className="text-sm font-bold mb-3">{releaseToConfirm.official_receipt_path ? 'Official Receipt copy' : 'Supporting attachment'}</h4>
            {releaseToConfirm.official_receipt_path || releaseToConfirm.file_path ? <AuthedFilePreview path={releaseToConfirm.official_receipt_path || releaseToConfirm.file_path} alt="Release supporting record" iframeTitle="Release supporting record" className="w-full max-h-80 object-contain" /> : <p className="text-sm text-gray-500 dark:text-gray-400">No digital copy on file. The Secretary’s physical receipt check remains valid.</p>}
          </div>
          <dl className="text-sm space-y-3 select-text">
            <div><dt className="font-bold">Document</dt><dd>{releaseToConfirm.document_type}</dd></div>
            <div><dt className="font-bold">Applicant</dt><dd>{releaseToConfirm.student_name || releaseToConfirm.student_id}</dd></div>
            <div><dt className="font-bold">Tracking number</dt><dd className="break-all">{releaseToConfirm.tracking_number}</dd></div>
            <div><dt className="font-bold">Official Receipt number</dt><dd>{releaseToConfirm.or_number || 'Recorded physical receipt'}</dd></div>
          </dl>
        </div>}
        variant="neutral"
        confirmLabel="Release"
        loadingLabel="Releasing…"
        loading={actionLoading}
        onConfirm={confirmWindow1Release}
        onCancel={cancelWindow1ReleaseConfirm}
      />

      <ConfirmDialog
        open={!!intakeActionToConfirm}
        title={intakeActionToConfirm === 'approve' ? 'Route to Secretary' : 'Return to Student'}
        message={
          selectedDoc
            ? intakeActionToConfirm === 'approve'
              ? `Route ${selectedDoc.document_type} to the College Secretary?`
              : `Return ${selectedDoc.document_type} to the student with your notes?`
            : ''
        }
        variant="neutral"
        confirmLabel={intakeActionToConfirm === 'approve' ? 'Route to Secretary' : 'Return to Student'}
        loadingLabel={intakeActionToConfirm === 'approve' ? 'Routing…' : 'Saving…'}
        loading={actionLoading}
        onConfirm={confirmIntake}
        onCancel={cancelIntake}
      />
      <StudentProfileModal
        open={!!viewProfileId}
        onClose={() => setViewProfileId(null)}
        studentId={viewProfileId}
      />
    </>
  );
}
