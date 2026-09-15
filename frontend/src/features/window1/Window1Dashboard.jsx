import HardwareScannerModal from '@/features/window1/components/HardwareScannerModal';
import IntakeReviewModal from '@/features/window1/components/IntakeReviewModal';
import ManualInputModal from '@/features/window1/components/ManualInputModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import MiniSparkline from '@/components/MiniSparkline';
import { STATUS, getProgressVal, getStatusLabel, requiresAttachment } from '@/utils/documentStatus';
import { formatFileSize, getWaitTime, todayLongDate } from '@/utils/formatters';
import useWindow1Dashboard from '@/features/window1/useWindow1Dashboard';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';

/**
 * Window 1 clerk: the counter at both ends of the pipeline.
 *
 * Two working queues — Intake at the front, Release at the back — plus a
 * Tracking Desk that shows every document in the system, because this is the
 * window a student walks up to and asks "where is mine?".
 */
export default function Window1Dashboard({ user, currentTab, setViewImageUrl }) {
  const {
    loading,
    success,
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
    w1IntakePage,
    setW1IntakePage,
    scanDocType,
    setScanDocType,
    activeModal,
    setActiveModal,
    scanFile,
    setScanFile,
    scanProgress,
    fileInputRef,
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
  } = useWindow1Dashboard(user);

  const todayFormatted = todayLongDate();

  if (loading) return <DashboardLoading />;

  return (
    <>
      <DashboardAlerts success={success} error={error} />
      <div className="space-y-8 animate-fade-in">
        {/* 3.1. WORKSPACE DASHBOARD VIEW */}
        {currentTab === 'dashboard' && (
          <>
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
                  Welcome back, <span className="text-[#15803d]">Window 1 Clerk</span>
                </h2>
              </div>
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-gray-500">Today:</span>
                <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
                <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
            </div>

            {/* Top KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">PROCESSED MANUAL DOCUMENT TODAY</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 mt-2 block">{dashStats.processed_today} <span className="text-sm text-gray-400 font-medium font-sans">Documents</span></span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  Documents scanned and routed today
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">AWAITING SECRETARY</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 mt-2 block">
                      {dashStats.pending_secretary_count} <span className="text-sm text-gray-400 font-medium font-sans">Pending</span>
                    </span>
                  </div>
                  <MiniSparkline trend="down" />
                </div>
                <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                  Documents at the Secretary desk awaiting evaluation
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">COMPLETED TODAY</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 mt-2 block">
                      {dashStats.completed_today_count} <span className="text-sm text-gray-400 font-medium font-sans">Completed</span>
                    </span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  Documents released to students today
                </div>
              </div>
            </div>

            {/* Upload Document Dropzone */}
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-200 flex flex-col justify-between mt-8">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">UPLOAD DOCUMENT</h3>
                  <p className="text-xs text-gray-400 mt-1">Upload physical papers to extract data via AI Engine.</p>
                </div>
                <button
                  onClick={() => setActiveModal('manual-input')}
                  className="shrink-0 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#15803d]/40"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                  Manual Entry
                </button>
              </div>

              <div className="flex-1 mt-6 border-2 border-dashed border-[#15803d]/40 rounded-3xl p-8 bg-gray-50/50 flex flex-col items-center justify-center relative min-h-[250px]">
                <span className="text-xs font-bold text-gray-900 mb-6 flex items-center gap-1">
                  <span className="text-[#15803d]">AI OCR Engine Ready</span>
                </span>

                <div className="flex items-center justify-center w-full">
                  <button 
                    onClick={() => fileInputRef.current?.click()} 
                    className="flex flex-col items-center gap-3 group focus:outline-none"
                  >
                    <div className="w-20 h-20 bg-[#15803d] text-white rounded-3xl flex items-center justify-center shadow-lg hover:bg-[#166534] transition-all transform group-hover:scale-105 border-4 border-emerald-200">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                      </svg>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-black text-gray-900 block">UPLOAD FILE</span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Select image from your computer</span>
                    </div>
                  </button>
                </div>

                <span className="text-[10px] text-gray-400 mt-6 absolute bottom-4">System will automatically route uploaded document to AI Engine</span>
                <input 
                  type="file" 
                  accept="image/*"
                  capture="environment"
                  id="mobile-camera-input"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      simulateHardwareScan(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      simulateHardwareScan(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>
            {/* Intake queue — the first human look at every request, online or walk-in */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wider">INTAKE QUEUE</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-medium">
                    <span>Awaiting Intake Check: <strong className="text-gray-900">{intakeQueue.length}</strong></span>
                    <span className="hidden sm:inline text-gray-400">Check the paperwork, then route to the College Secretary.</span>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                  {intakeQueue.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 font-medium">Nothing waiting for intake.</div>
                  ) : (
                    <>
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                            <th className="pb-4 font-bold pl-4">Tracking Hash</th>
                            <th className="pb-4 font-bold">Student</th>
                            <th className="pb-4 font-bold">Document Type</th>
                            <th className="pb-4 font-bold">Attachment</th>
                            <th className="pb-4 font-bold">Waiting</th>
                            <th className="pb-4 font-bold text-right pr-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {intakeQueue
                            .slice((w1IntakePage - 1) * itemsPerPage, w1IntakePage * itemsPerPage)
                            .map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50/50 group">
                              <td className="py-4 pl-4 font-mono text-xs text-gray-500">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                              <td className="py-4">
                                <div className="text-sm font-bold text-gray-900">{doc.student_name || 'Name Unresolved'}</div>
                                <div className="text-xs font-mono text-gray-400 mt-0.5">{doc.student_id || 'ID Pending'}</div>
                              </td>
                              <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type}</td>
                              <td className="py-4 text-xs font-semibold">
                                {doc.file_path
                                  ? <span className="text-[#15803d]">Attached</span>
                                  : requiresAttachment(doc.document_type)
                                    ? <span className="text-amber-600">Needs scan</span>
                                    : <span className="text-gray-400">None</span>}
                              </td>
                              <td className="py-4 text-xs font-bold text-gray-500 font-mono">{getWaitTime(doc.created_at)}</td>
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
                        <div className="flex justify-between items-center mt-6 border-t border-gray-100 pt-4">
                          <button
                            disabled={w1IntakePage === 1}
                            onClick={() => setW1IntakePage(p => p - 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Previous
                          </button>
                          <span className="text-xs font-bold text-gray-500">
                            Page {w1IntakePage} of {Math.ceil(intakeQueue.length / itemsPerPage)}
                          </span>
                          <button
                            disabled={w1IntakePage >= Math.ceil(intakeQueue.length / itemsPerPage)}
                            onClick={() => setW1IntakePage(p => p + 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
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

            {/* Active release queue card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wider">RELEASE DESK</h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 font-medium">
                    <span>Pending Student Pick-up: <strong className="text-gray-900">{dashStats.ready_window_1_count}</strong></span>
                    <span>Cleared by Secretary Today: <strong className="text-gray-900">{dashStats.cleared_by_secretary_today}</strong></span>
                  </div>
                </div>
                <button onClick={loadDashboardData} className="text-xs text-[#15803d] font-bold hover:underline inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg> Refresh</button>
              </div>

              <div className="p-4 sm:p-6">
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                  {releaseQueue.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 font-medium">No documents waiting for release.</div>
                  ) : (
                    <>
                      <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                            <th className="pb-4 font-bold pl-4">Tracking Hash</th>
                            <th className="pb-4 font-bold">Student</th>
                            <th className="pb-4 font-bold">Document Type</th>
                            <th className="pb-4 font-bold">Official Receipt</th>
                            <th className="pb-4 font-bold">Wait Time</th>
                            <th className="pb-4 font-bold text-right pr-4">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {releaseQueue
                            .slice((w1ReleasePage - 1) * itemsPerPage, w1ReleasePage * itemsPerPage)
                            .map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50/50 group">
                              <td className="py-4 pl-4 font-mono text-xs text-gray-500">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                              <td className="py-4">
                                <div className="text-sm font-bold text-gray-900">{doc.student_name || 'Name Unresolved'}</div>
                                <div className="text-xs font-mono text-gray-400 mt-0.5">{doc.student_id || 'ID Pending'}</div>
                              </td>
                              <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type}</td>
                              <td className="py-4 text-xs font-mono">
                                {doc.or_number
                                  ? <span className="font-bold text-gray-700">{doc.or_number}</span>
                                  : <span className="text-gray-400">paid online</span>}
                                {doc.official_receipt_path && (
                                  <button
                                    onClick={() => setViewImageUrl(doc.official_receipt_path)}
                                    className="ml-2 text-[#15803d] hover:underline font-sans font-bold"
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

                      {releaseQueue.length > itemsPerPage && (
                        <div className="flex justify-between items-center mt-6 border-t border-gray-100 pt-4">
                          <button 
                            disabled={w1ReleasePage === 1} 
                            onClick={() => setW1ReleasePage(p => p - 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
                          >
                            Previous
                          </button>
                          <span className="text-xs font-bold text-gray-500">
                            Page {w1ReleasePage} of {Math.ceil(releaseQueue.length / itemsPerPage)}
                          </span>
                          <button 
                            disabled={w1ReleasePage >= Math.ceil(releaseQueue.length / itemsPerPage)} 
                            onClick={() => setW1ReleasePage(p => p + 1)}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
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
          </>
        )}

        {/* 3.2. TRACKING DESK VIEW */}
        {currentTab === 'tracking-desk' && (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
                  Tracking Desk
                </h2>
              </div>
              <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                <span className="text-xs font-semibold text-gray-500">Today:</span>
                <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
                <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
            </div>
            {/* System Documents Progress Queue */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg uppercase tracking-wider">SYSTEM DOCUMENTS PROGRESS</h3>
                  <p className="text-xs text-gray-400 mt-1">Live tracking of all active requested documents in the system.</p>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                {documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 font-medium">No active document requests.</div>
                ) : (
                  <>
                    <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                            <th className="pb-4 font-bold pl-4">Date Requested</th>
                            <th className="pb-4 font-bold">Document</th>
                            <th className="pb-4 font-bold">Progress</th>
                            <th className="pb-4 font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {documents.slice((w1ProgressPage - 1) * itemsPerPage, w1ProgressPage * itemsPerPage).map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="py-4 pl-4 text-xs font-semibold text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                              <td className="py-4">
                                <div className="text-sm font-bold text-gray-900">{doc.document_type}</div>
                                <div className="text-xs font-mono text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                              </td>
                              <td className="py-4 w-1/3">
                                <div className="flex items-center gap-3">
                                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div className="bg-[#15803d] h-2 rounded-full transition-all duration-500" style={{ width: `${getProgressVal(doc.current_status)}%` }}></div>
                                  </div>
                                  <span className="text-[11px] font-bold text-gray-600 font-mono">{getProgressVal(doc.current_status)}%</span>
                                </div>
                              </td>
                              <td className="py-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${doc.current_status === STATUS.COMPLETED ? 'bg-emerald-50 text-[#15803d]' : 'bg-amber-50 text-amber-700'}`}>
                                  {getStatusLabel(doc.current_status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {documents.length > itemsPerPage && (
                      <div className="flex justify-between items-center mt-6 border-t border-gray-100 pt-4">
                        <button 
                          disabled={w1ProgressPage === 1} 
                          onClick={() => setW1ProgressPage(p => p - 1)}
                          className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
                        >
                          Previous
                        </button>
                        <span className="text-xs font-bold text-gray-500">
                          Page {w1ProgressPage} of {Math.ceil(documents.length / itemsPerPage)}
                        </span>
                        <button 
                          disabled={w1ProgressPage >= Math.ceil(documents.length / itemsPerPage)} 
                          onClick={() => setW1ProgressPage(p => p + 1)}
                          className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50 transition-colors"
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
          <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-100 relative flex flex-col h-[70vh] max-h-[calc(100dvh-2rem)] overflow-y-auto justify-between">
              <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>

              <div className="pb-5 mb-4 border-b border-gray-100">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Scan Document</h3>
              </div>

              {/* Mock Camera Preview Box */}
              <div className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden my-4 relative flex flex-col items-center justify-center shadow-inner">
                <span className="absolute top-4 px-4 py-1.5 bg-[#15803d]/90 text-white text-[10px] font-bold tracking-widest uppercase rounded-full shadow-sm animate-pulse">
                  Document Detected
                </span>

                <div className="w-48 h-64 border-2 border-dashed border-[#15803d] rounded-xl flex items-center justify-center bg-white/20 select-none shadow-sm">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                </div>

                <span className="absolute bottom-4 text-[10px] font-bold text-gray-400 tracking-wide uppercase">
                  Align document within frame
                </span>
              </div>

              <div className="flex items-center justify-center gap-8 pt-2">
                <button className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-500 shadow-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </button>
                <button 
                  onClick={() => {
                    setScanFile({ name: 'scan_doc_00129.jpg', size: 245800 });
                    setScanDocType('Transcript of Records');
                    setActiveModal('scan-confirm');
                  }}
                  className="w-16 h-16 rounded-full bg-white border-8 border-gray-200 flex items-center justify-center hover:border-gray-300 transition-all shadow-md focus:outline-none"
                >
                  <div className="w-10 h-10 rounded-full bg-[#15803d] hover:bg-[#166534] transition-all"></div>
                </button>
                <div className="w-12 h-12"></div> {/* spacer */}
              </div>
            </div>
          </div>
        )}

        {/* 3.5. INTAKE SCAN CONFIRMATION MODAL */}
        {activeModal === 'scan-confirm' && scanFile && (
          <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 sm:p-8 z-10 border border-gray-100 relative flex flex-col h-[75vh] max-h-[calc(100dvh-2rem)] overflow-y-auto justify-between">
              <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>

              <div className="pb-5 mb-4 border-b border-gray-100">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Confirm Information</h3>
              </div>

              <div className="flex flex-col gap-2 my-4">
                <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Document Type</label>
                <select 
                  value={scanDocType}
                  onChange={(e) => setScanDocType(e.target.value)}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer"
                >
                  <option>Transcript of Records</option>
                  <option>Clearance</option>
                  <option>Certification</option>
                  <option>Diploma</option>
                </select>
              </div>

              {/* Scanned Image Preview Container */}
              <div className="flex-1 bg-gray-100 border border-gray-200 rounded-2xl overflow-hidden mb-6 flex items-center justify-center shadow-inner relative">
                <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-200/50">
                  <svg className="w-8 h-8 text-gray-400 block mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  <span className="text-xs font-bold text-gray-800 block truncate max-w-xs">{scanFile.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">{formatFileSize(scanFile.size)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => {
                    setActiveModal(null);
                    handleWindow1ScanUpload(scanDocType);
                  }}
                  disabled={actionLoading}
                  className="px-8 py-3.5 bg-[#15803d] hover:bg-[#166534] disabled:opacity-75 text-white font-bold rounded-xl text-xs shadow-md transition-all uppercase tracking-wider w-full text-center"
                >
                  {actionLoading ? 'Uploading...' : 'Create Request'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <HardwareScannerModal
        open={activeModal === 'hardware-scanner' && !!scanFile}
        scanFile={scanFile}
        scanProgress={scanProgress}
      />

      {activeModal === 'intake-review' && selectedDoc && (
        <IntakeReviewModal
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
        open={activeModal === 'manual-input'}
        onClose={() => setActiveModal(null)}
        handleManualInputSubmit={handleManualInputSubmit}
        handleFetchStudent={handleFetchStudent}
        actionLoading={actionLoading}
      />

      <ConfirmDialog
        open={!!releaseToConfirm}
        title="Release Document"
        message={
          releaseToConfirm
            ? [
                `Release ${releaseToConfirm.document_type} to ${releaseToConfirm.student_name || releaseToConfirm.student_id}?`,
                releaseToConfirm.or_number ? `Official Receipt on file: ${releaseToConfirm.or_number}` : null,
                releaseToConfirm.official_receipt_path ? (
                  <button
                    key="view-receipt"
                    type="button"
                    onClick={() => setViewImageUrl(releaseToConfirm.official_receipt_path)}
                    className="text-[#15803d] font-bold hover:underline"
                  >
                    View Official Receipt
                  </button>
                ) : null,
              ]
            : ''
        }
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
    </>
  );
}
