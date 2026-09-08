import NewRequestModal from '@/features/student/components/NewRequestModal';
import LiveTrackingModal from '@/features/student/components/LiveTrackingModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import MiniSparkline from '@/components/MiniSparkline';
import { createPortal } from 'react-dom';
import {
  STATUS,
  PIPELINE,
  getAttachmentHelper,
  getAttachmentLabel,
  getProgressVal,
  getStatusLabel,
  isAwaitingStudent,
  isCancellable,
  requiresAttachment,
} from '@/utils/documentStatus';
import { formatPeso } from '@/utils/pricing';
import useStudentDashboard from '@/features/student/useStudentDashboard';
import { todayLongDate } from '@/utils/formatters';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';

/**
 * Student portal: request KPIs, history, GCash checkout, and live tracking.
 */
export default function StudentDashboard({ user, currentTab, setViewImageUrl }) {
  const {
    loading,
    success,
    error,
    documents,
    billableGroups,
    groupTotalFor,
    actionLoading,
    documentTypes,
    documentTypesLoading,
    selections,
    toggleDocumentType,
    updateSelection,
    paymentRef,
    setPaymentRef,
    paymentFile,
    setPaymentFile,
    paymentMethods,
    selectedMethod,
    setSelectedMethod,
    activeModal,
    setActiveModal,
    selectedDoc,
    setSelectedDoc,
    trackerProgress,
    loadDashboardData,
    handleStudentSubmitRequest,
    handleStudentSubmitPayment,
    handleStudentCancelRequest,
    cancelRequestIdToConfirm,
    confirmStudentCancelRequest,
    cancelStudentCancelConfirm,
  } = useStudentDashboard(user);

  const todayFormatted = todayLongDate();
  const selectedPaymentMethod = paymentMethods.find((m) => m.code === selectedMethod);

  if (loading) return <DashboardLoading />;

  return (
    <>
      <DashboardAlerts success={success} error={error} />
      <div className="space-y-8 animate-fade-in">
        {/* 1.1. STUDENT PORTAL - WORKSPACE DASHBOARD */}
        {currentTab === 'dashboard' && (
          <>
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
                  Welcome back, <span className="text-[#15803d] font-bold">{user.full_name || 'Student'}</span>
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
                  <span className="text-xs font-semibold text-gray-500">Today:</span>
                  <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
                  <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <button 
                  onClick={() => setActiveModal('new-request')}
                  className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 hover:border-gray-400 text-gray-800 text-xs font-bold rounded-full shadow-sm transition-all"
                >
                  <span>New Request</span>
                  <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">TOTAL REQUESTS</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 mt-2 block">{documents.length} <span className="text-sm text-gray-400 font-medium font-sans">Documents</span></span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  All requests submitted across your account
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">IN PROGRESS</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 mt-2 block">
                      {documents.filter(d => PIPELINE.includes(d.current_status) && d.current_status !== STATUS.COMPLETED).length} <span className="text-sm text-gray-400 font-medium font-sans">in progress</span>
                    </span>
                  </div>
                  <MiniSparkline trend="down" />
                </div>
                <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                  Your documents are currently being processed
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">READY / COMPLETED</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 mt-2 block">
                      {documents.filter(d => d.current_status === STATUS.COMPLETED).length} <span className="text-sm text-gray-400 font-medium font-sans">Completed</span>
                    </span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  Available for pickup at Window 1
                </div>
              </div>
            </div>

            {/* Action Required — the one state where nothing moves until the
                student does something. Everything else is somebody else's move,
                so this earns a banner rather than a row in the table.
                One card per request group, not per document — billing happens
                once for the whole request, so several of its documents can be
                awaiting payment together, and one receipt settles all of them. */}
            {billableGroups.length > 0 && (
              <div className="bg-white rounded-3xl shadow-sm border-2 border-[#15803d] overflow-hidden mt-8">
                <div className="bg-[#15803d] px-6 py-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 005 19z"/></svg>
                  <h3 className="font-black text-white text-sm uppercase tracking-wider">Action Required — Payment</h3>
                </div>
                <div className="p-6">
                  <p className="text-xs text-gray-600 leading-relaxed mb-5">
                    Your documents are ready. Pay online here, or bring your payment slip to the Finance Office.
                  </p>
                  <div className="space-y-4">
                    {billableGroups.map((group) => (
                      <div key={group.groupId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        <div className="space-y-1.5">
                          {group.docs.map((doc) => (
                            <div key={doc.id} className="flex items-baseline justify-between gap-4 text-sm">
                              <span className="font-bold text-gray-900">{doc.document_type}</span>
                              <span className="font-mono text-xs text-gray-400 select-text">{formatPeso(doc.amount)}</span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => { setSelectedDoc({ ...group.docs[0], group_total: group.total }); setActiveModal('pay'); }}
                          className="px-6 py-3 bg-[#15803d] hover:bg-[#166534] text-white rounded-2xl text-xs font-bold shadow-sm transition-all whitespace-nowrap shrink-0"
                        >
                          Pay {formatPeso(group.total)}{group.docs.length > 1 ? ` (${group.docs.length} documents)` : ''}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Active Requests Card Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-lg">ACTIVE REQUESTS</h3>
                <button onClick={loadDashboardData} className="text-xs text-[#15803d] font-bold hover:underline inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg> Refresh</button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-medium">No active request records. Submit one at the top!</div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[720px]">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                          <th className="pb-4 font-bold pl-4 min-w-[90px]">Date</th>
                          <th className="pb-4 font-bold px-3 min-w-[160px]">Document /Type</th>
                          <th className="pb-4 font-bold px-3 min-w-[140px]">Progress</th>
                          <th className="pb-4 font-bold px-3 min-w-[110px]">Status</th>
                          <th className="pb-4 font-bold text-right pr-4 min-w-[150px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {documents.map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pl-4 text-xs font-semibold text-gray-400">{new Date(doc.created_at).toLocaleDateString()} {new Date(doc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="py-4 px-3">
                              <div className="text-sm font-bold text-gray-900">{doc.document_type}</div>
                              <div className="text-xs font-mono text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                            </td>
                            <td className="py-4 px-3">
                              <div className="flex items-center gap-3">
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                  <div className="bg-[#15803d] h-2 rounded-full transition-all duration-500" style={{ width: `${getProgressVal(doc.current_status)}%` }}></div>
                                </div>
                                <span className="text-[11px] font-bold text-gray-600 font-mono">{getProgressVal(doc.current_status)}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-3">
                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${doc.current_status === STATUS.COMPLETED ? 'bg-emerald-50 text-[#15803d]' : isAwaitingStudent(doc.current_status) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                                {getStatusLabel(doc.current_status)}
                              </span>
                            </td>
                            <td className="py-4 text-right pr-4 relative min-w-[150px]">
                              <div className="flex justify-end gap-2">
                                {isAwaitingStudent(doc.current_status) ? (
                                  <button
                                    onClick={() => { setSelectedDoc({ ...doc, group_total: groupTotalFor(doc) }); setActiveModal('pay'); }}
                                    className="px-4 py-1.5 bg-[#15803d] text-white rounded-xl text-xs font-bold hover:bg-[#166534] transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    Pay {formatPeso(groupTotalFor(doc))}
                                  </button>
                                ) : isCancellable(doc.current_status) ? (
                                  <button
                                    onClick={() => handleStudentCancelRequest(doc.id)}
                                    className="px-4 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                    Cancel
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => { setSelectedDoc(doc); setActiveModal('tracking'); }}
                                    className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all border border-blue-200 flex items-center gap-1.5 whitespace-nowrap shrink-0"
                                    title="Track Document"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                                    Live Track
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              
                </div>
              </div>
            </div>
          </>
        )}

        {/* 1.2. STUDENT PORTAL - REQUEST HISTORY */}
        {currentTab === 'request-history' && (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
                  Request History
                </h2>
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-lg">Your request history</h3>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-[#15803d] border border-emerald-100 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                  Filters
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-medium">No request history found.</div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[560px]">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                          <th className="pb-4 font-bold pl-4 min-w-[160px]">Docuement</th>
                          <th className="pb-4 font-bold min-w-[110px]">Date Requested</th>
                          <th className="pb-4 font-bold min-w-[110px]">Tracking ID</th>
                          <th className="pb-4 font-bold min-w-[110px]">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {documents.map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pl-4 text-sm font-bold text-gray-900">{doc.document_type}</td>
                            <td className="py-4 text-xs font-semibold text-gray-400">{new Date(doc.created_at).toLocaleDateString()} {new Date(doc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="py-4 font-mono text-xs text-gray-800 font-bold">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                            <td className="py-4">
                              <span className="px-3 py-1 bg-emerald-50 text-[#15803d] text-[10px] font-black rounded-full uppercase tracking-wider">
                                {doc.current_status === STATUS.COMPLETED ? 'Released' : 'Processing'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              
                </div>
              </div>
            </div>
          </>
        )}

        {/* 1.3. STUDENT PORTAL - PAYMENT HISTORY */}
        {currentTab === 'payment-history' && (
          <>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
                  Payment History
                </h2>
              </div>
            </div>

            {/* Payment Card Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <h3 className="font-bold text-gray-900 text-lg">Manage your digital transactions.</h3>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-[#15803d] border border-emerald-100 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                  Filters
                </button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
                  {documents.filter(d => d.payment_status === 'PAID' || d.gcash_reference_no).length === 0 ? (
                    <div className="text-center py-12 text-gray-400 font-medium">No transaction payments detected.</div>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[620px]">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                          <th className="pb-4 font-bold pl-4 min-w-[90px]">Date</th>
                          <th className="pb-4 font-bold min-w-[130px]">Reference Number</th>
                          <th className="pb-4 font-bold min-w-[140px]">Document</th>
                          <th className="pb-4 font-bold min-w-[90px]">Amount</th>
                          <th className="pb-4 font-bold min-w-[100px]">Status</th>
                          <th className="pb-4 font-bold text-right pr-4 min-w-[70px]">Receipt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {documents.filter(d => d.payment_status === 'PAID' || d.gcash_reference_no).map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 pl-4 text-xs font-semibold text-gray-400">{new Date(doc.updated_at).toLocaleDateString()} {new Date(doc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                            <td className="py-4 font-mono text-xs text-gray-800 font-black">GC-{doc.gcash_reference_no ? doc.gcash_reference_no.slice(0, 8).toUpperCase() : '992139'}</td>
                            <td className="py-4 text-sm font-bold text-gray-700">{doc.document_type}</td>
                            <td className="py-4 text-xs font-bold text-gray-800 font-mono">P {parseFloat(doc.amount || 150).toFixed(2)}</td>
                            <td className="py-4">
                              {doc.payment_status === 'PAID' ? (
                                <span className="px-3 py-1 bg-emerald-50 text-[#15803d] text-[10px] font-black rounded-full uppercase tracking-wider">PAID</span>
                              ) : (
                                <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-full uppercase tracking-wider">VERIFYING</span>
                              )}
                            </td>
                            <td className="py-4 text-right pr-4">
                              {doc.official_receipt_path ? (
                                <button 
                                  onClick={() => setViewImageUrl(doc.official_receipt_path)}
                                  className="p-2 text-[#15803d] hover:bg-emerald-50 rounded-xl transition-colors"
                                  title="View Official Finance Receipt"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                </button>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pending</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
              
                </div>
              </div>
            </div>
          </>
        )}

        {/* 1.4. NEW REQUEST MODAL */}
        {activeModal === 'new-request' && (
          <NewRequestModal 
            user={user}
            setActiveModal={setActiveModal}
            handleStudentSubmitRequest={handleStudentSubmitRequest}
            documentTypes={documentTypes}
            documentTypesLoading={documentTypesLoading}
            selections={selections}
            toggleDocumentType={toggleDocumentType}
            updateSelection={updateSelection}
            actionLoading={actionLoading}
            requiresAttachment={requiresAttachment}
            getAttachmentLabel={getAttachmentLabel}
            getAttachmentHelper={getAttachmentHelper}
          />
        )}

        {/* 1.5. COMPLETE YOUR GCASH PAYMENT MODAL */}
        {activeModal === 'pay' && selectedDoc && createPortal(
          <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 z-10 border border-gray-100 relative">

              <button 
                onClick={() => handleStudentCancelRequest(selectedDoc.id, true)}
                className="absolute top-4 left-4 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back to Form
              </button>
              <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>

              <div className="mt-8 pb-5 mb-6 text-center border-b border-gray-100">
                <h3 className="text-xl font-black text-gray-900">Complete your Payment</h3>
                <p className="text-xs text-gray-400 mt-1 font-semibold">Add Payment</p>
              </div>

              {/* Payment method picker */}
              <div className="flex flex-wrap gap-2 mb-6">
                {paymentMethods.map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    onClick={() => setSelectedMethod(m.code)}
                    className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                      selectedMethod === m.code
                        ? 'bg-[#15803d] border-[#15803d] text-white shadow-sm'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {m.name}
                  </button>
                ))}
              </div>

              <div className="border-2 border-dashed border-[#15803d]/40 bg-gray-50/50 p-6 rounded-2xl flex flex-col items-center gap-4 mb-6 text-center">
                {selectedMethod === 'gcash' ? (
                  <>
                    <span className="text-xs font-bold text-gray-800">Scan this QR code using your GCash app to pay.</span>
                    <img src="/gcash-qr.jpg" alt="GCash QR Code" className="w-50 h-60 rounded-xl shadow-sm object-cover border border-gray-200" />
                  </>
                ) : (
                  <span className="text-xs font-semibold text-gray-700 leading-relaxed">
                    {selectedPaymentMethod?.instructions || 'Complete your payment, then submit proof below.'}
                  </span>
                )}
              </div>

              <form onSubmit={handleStudentSubmitPayment} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Document</label>
                    <input 
                      type="text" 
                      disabled 
                      value={selectedDoc.document_type} 
                      className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Tracking ID</label>
                    <input 
                      type="text" 
                      disabled 
                      value={`TRC - ${selectedDoc.tracking_number ? selectedDoc.tracking_number.slice(0, 6).toUpperCase() : selectedDoc.id}`} 
                      className="p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500"
                    />
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm text-emerald-900">
                    <span className="font-bold">Total Amount Due</span>
                    <span className="font-black text-lg">{formatPeso(selectedDoc.group_total)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedPaymentMethod?.requires_reference !== false && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">
                        {selectedPaymentMethod?.reference_label || 'Reference Number'}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 5001 0293 8472"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
                      />
                    </div>
                  )}
                  {selectedPaymentMethod?.requires_proof !== false && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Upload Receipt</label>
                      <div className="relative">
                        <input
                          type="file"
                          required
                          accept="image/*"
                          onChange={(e) => setPaymentFile(e.target.files[0])}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 flex justify-between items-center pointer-events-none">
                          <span className="truncate">{paymentFile ? paymentFile.name : 'Upload your receipt...'}</span>
                          <svg className="w-4 h-4 text-[#15803d]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit" 
                  disabled={actionLoading} 
                  className="w-full bg-[#15803d] hover:bg-[#166534] disabled:opacity-70 text-white font-bold py-3.5 rounded-xl transition-all shadow-md uppercase tracking-wider text-xs flex justify-center items-center"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Payment'}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* 1.6. PAYMENT SUCCESS SCREEN MODAL */}
        {activeModal === 'pay-success' && createPortal(
          <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 z-10 border border-gray-100 relative text-center">
              <h3 className="text-xl font-black text-gray-900 mb-6">Payment Submitted</h3>

              <div className="border-2 border-dashed border-[#15803d]/40 bg-gray-50/50 p-8 rounded-2xl flex flex-col items-center gap-6 mb-6">
                <p className="text-xs font-semibold text-gray-600 leading-relaxed max-w-xs">
                  Your reference number and uploaded receipt have been securely routed to Finance Office for verification. Once cleared, your Transcript of Record will be proceed to processing.
                </p>

                {/* Large Green Check Circle */}
                <div className="w-16 h-16 rounded-full bg-[#15803d] text-white flex items-center justify-center shadow-md">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                </div>
              </div>

              <button 
                onClick={() => setActiveModal(null)}
                className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-bold py-3.5 rounded-xl transition-all shadow-md uppercase tracking-wider text-xs"
              >
                Return to Dashboard
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* 1.7. LIVE TRACKING MODAL */}
        {activeModal === 'tracking' && selectedDoc && (
          <LiveTrackingModal 
            selectedDoc={selectedDoc}
            setActiveModal={setActiveModal}
            trackerProgress={trackerProgress}
            getStatusLabel={getStatusLabel}
          />
        )}

        <ConfirmDialog
          open={!!cancelRequestIdToConfirm}
          title="Cancel Request"
          message="Are you sure you want to cancel this request? This action cannot be undone."
          variant="destructive"
          confirmLabel="Cancel Request"
          cancelLabel="Keep Request"
          loadingLabel="Cancelling…"
          loading={actionLoading}
          onConfirm={confirmStudentCancelRequest}
          onCancel={cancelStudentCancelConfirm}
        />
      </div>
    </>
  );
}
