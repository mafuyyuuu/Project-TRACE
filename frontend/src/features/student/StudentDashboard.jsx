import Button from '@/components/Button';
import ProgressFill from '@/components/ProgressFill';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import { getProfileCompletion } from '@/utils/profileCompletion';
import FeeBreakdown from '@/components/FeeBreakdown';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import FileUploadField from '@/components/FileUploadField';
import { useState } from 'react';
import NewRequestModal from '@/features/student/components/NewRequestModal';
import LiveTrackingModal from '@/features/student/components/LiveTrackingModal';
import FloatingSupportChat from '@/features/student/components/FloatingSupportChat';
import ConfirmDialog from '@/components/ConfirmDialog';
import MiniSparkline from '@/components/MiniSparkline';
import ModalShell from '@/components/ModalShell';
import {
  STATUS,
  PIPELINE,
  getAttachmentHelper,
  getAttachmentLabel,
  getProgressVal,
  getStatusTone,
  getStatusLabel,
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
  const [historyView, setHistoryView] = useState({ tab: currentTab, filter: currentTab === 'payment-history' ? 'payments' : 'all' });
  const historyFilter = historyView.tab === currentTab ? historyView.filter : currentTab === 'payment-history' ? 'payments' : 'all';
  const [missingProfileFields, setMissingProfileFields] = useState(null);
  const docFilter = 'ALL';
  const {
    loading,
    success,
    dismissNotification,
    error,
    documents,
    billableGroups,
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
    submissionToConfirm,
    confirmStudentSubmission,
    cancelStudentSubmission,
  } = useStudentDashboard(user);

  const todayFormatted = todayLongDate();
  const selectedPaymentMethod = paymentMethods.find((m) => m.code === selectedMethod);
  const selectedPaymentDocuments = selectedDoc
    ? documents.filter((doc) => doc.request_group_id === selectedDoc.request_group_id)
    : [];

  if (currentTab === 'messages') return <RequestMessagesPanel user={user} initialDocumentId={new URLSearchParams(window.location.search).get('document')} />;
  if (loading) return <DashboardLoading />;

  return (
    <>
      <FloatingSupportChat user={user} />
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} />
      <div className="trace-page">
        {/* 1.1. STUDENT PORTAL - WORKSPACE DASHBOARD */}
        {currentTab === 'dashboard' && (
          <>
            {/* Welcome Header */}
            <div className="trace-page-header">
              <div>
                <h2 className="trace-page-title">
                  Welcome back, <span className="text-[#15803d] dark:text-green-300 font-bold select-text break-words">{user.full_name || 'Student'}</span>
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="trace-date">
                  <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">Today:</span>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{todayFormatted}</span>
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <Button id="tutorial-new-request"
                  onClick={() => {
                    const missing = getProfileCompletion(user).missing.map(item => item.label);
                    if (user.email_verified_at === null) missing.push('Email Address verification — choose Verify in Edit Profile');
                    if (missing.length > 0) {
                      setMissingProfileFields(missing);
                      return;
                    }
                    setActiveModal('new-request');
                  }}
                  className="trace-button-lift trace-action flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 enabled:hover:border-gray-400 dark:enabled:hover:border-gray-700 text-gray-800 dark:text-gray-100 text-xs font-bold rounded-full shadow-sm transition-colors"
                >
                  <span>New Request</span>
                  <svg className="w-4 h-4 text-gray-800 dark:text-gray-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </Button>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="trace-section trace-card-info trace-section-body flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">TOTAL REQUESTS</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 mt-2 block">{documents.length} <span className="text-sm text-gray-400 dark:text-gray-400 font-medium font-sans">Documents</span></span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] dark:text-green-300 w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  All requests submitted across your account
                </div>
              </div>

              <div className="trace-section trace-card-info trace-section-body flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">IN PROGRESS</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 mt-2 block">
                      {documents.filter(d => PIPELINE.includes(d.current_status) && d.current_status !== STATUS.COMPLETED).length} <span className="text-sm text-gray-400 dark:text-gray-400 font-medium font-sans">in progress</span>
                    </span>
                  </div>
                  <MiniSparkline trend="down" />
                </div>
                <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                  Your documents are currently being processed
                </div>
              </div>

              <div className="trace-section trace-card-info trace-section-body flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">READY / COMPLETED</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 mt-2 block">
                      {documents.filter(d => d.current_status === STATUS.COMPLETED).length} <span className="text-sm text-gray-400 dark:text-gray-400 font-medium font-sans">Completed</span>
                    </span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] dark:text-green-300 w-fit flex items-center gap-1.5 mt-2">
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
              <div className="trace-section border-2 border-amber-300 dark:border-amber-800 overflow-hidden mt-8">
                <div className="bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-4 sm:px-6 py-3 flex items-center gap-2">
                  <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M5 19h14a2 2 0 001.84-2.75L13.74 4a2 2 0 00-3.48 0l-7.1 12.25A2 2 0 005 19z"/></svg>
                  <h3 className="font-black text-sm uppercase tracking-wider">Action Required — Payment</h3>
                </div>
                <div className="p-4 sm:p-6">
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
                    Your documents are ready. Pay online here, or bring your payment slip to the Finance Office.
                  </p>
                  <div className="space-y-4">
                    {billableGroups.map((group) => (
                      <section key={group.groupId} aria-label={`Payment for request ${group.groupId}`} className="space-y-4 pb-5 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0">
                        <p className="text-xs font-mono text-gray-500 dark:text-gray-400 break-words select-text">Request {group.groupId}</p>
                        <ul className="space-y-2">
                          {group.docs.map((doc) => (
                            <li key={doc.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 text-sm">
                              <span className="min-w-0 font-bold text-gray-900 dark:text-gray-100 break-words select-text">{doc.document_sequence_number || doc.document_type}</span>
                              <span className="shrink-0 font-mono text-xs font-semibold text-gray-900 dark:text-gray-100 select-text">{formatPeso(doc.amount)}</span>
                              <div className="w-full min-w-0"><FeeBreakdown breakdown={doc.fee_breakdown} amount={doc.amount} /></div>
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100 select-text">Total amount due: {formatPeso(group.total)}</p>
                          <Button
                            type="button"
                            onClick={() => { setSelectedDoc({ ...group.docs[0], group_total: group.total }); setActiveModal('pay'); }}
                            className="trace-button trace-button-warning w-full sm:w-auto sm:px-6"
                          >
                            Pay {formatPeso(group.total)} ({group.docs.length} {group.docs.length === 1 ? 'document' : 'documents'})
                          </Button>
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Active Requests Card Table */}
            <div className="trace-section overflow-hidden mt-8">
              <div id="tutorial-requests" className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg">ACTIVE REQUESTS</h3>
                <Button onClick={loadDashboardData} className="trace-action text-xs text-[#15803d] dark:text-green-300 font-bold hover:underline inline-flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg> Refresh</Button>
              </div>
              <div className="p-4 sm:p-6">
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                  {documents.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">No active request records. Submit one at the top!</div>
                  ) : (
                    <table aria-label="Active requests" className="w-full text-left border-collapse table-auto min-w-[800px]">
                      <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                        <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                          <th className="pb-4 px-4 font-bold min-w-[120px]">Date</th>
                          <th className="pb-4 px-4 font-bold min-w-[180px]">Document /Type</th>
                          <th className="pb-4 px-4 font-bold min-w-[160px]">Progress</th>
                          <th className="pb-4 px-4 font-bold min-w-[180px]">Status</th>
                          <th className="pb-4 px-4 font-bold text-right min-w-[140px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {documents.filter(d => docFilter === 'ALL' || (docFilter === 'COMPLETED' ? d.current_status === STATUS.COMPLETED : d.current_status !== STATUS.COMPLETED)).map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="py-4 px-4 align-middle text-xs font-semibold text-gray-400 dark:text-gray-400">
                              <div className="space-y-1 whitespace-nowrap">
                                <span className="block">{new Date(doc.created_at).toLocaleDateString()}</span>
                                <span className="block">{new Date(doc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 align-middle">
                              <div className="max-w-xs space-y-1.5 break-words">
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{doc.document_sequence_number || doc.document_type}</div>
                                {doc.is_same_day ? <span className="inline-block px-1.5 py-0.5 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-[9px] uppercase font-black rounded">Walk-in same-day eligible</span> : null}
                                <div className="text-xs font-mono text-gray-400 dark:text-gray-400">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                              </div>
                            </td>
                            <td className="py-4 px-4 align-middle">
                              <div className="flex items-center gap-3 min-w-32">
                                <div role="progressbar" aria-label={`Progress for ${doc.tracking_number || doc.id}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={getProgressVal(doc.current_status)} className="flex-1 min-w-12 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                                  <ProgressFill value={getProgressVal(doc.current_status)} className="bg-[#15803d]" />
                                </div>
                                <span className="shrink-0 whitespace-nowrap text-[11px] font-bold text-gray-600 dark:text-gray-300 font-mono">{getProgressVal(doc.current_status)}%</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 align-middle">
                              <span className={`inline-flex max-w-48 px-3 py-1 rounded-full text-[10px] leading-relaxed font-black uppercase tracking-wider ${getStatusTone(doc.current_status)}`}>
                                {getStatusLabel(doc.current_status)}
                              </span>
                            </td>
                            <td className="py-4 px-4 align-middle text-right">
                              <div className="flex justify-end gap-2">
                                {isCancellable(doc.current_status) ? (
                                  <Button
                                    onClick={() => handleStudentCancelRequest(doc.id)}
                                    className="trace-button trace-button-danger flex items-center gap-1.5 shrink-0"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                    Cancel
                                  </Button>
                                ) : (
                                  <Button
                                    onClick={() => { setSelectedDoc(doc); setActiveModal('tracking'); }}
                                    className="trace-button trace-button-info flex items-center gap-1.5 shrink-0"
                                    title="Track Document"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
                                    Live Track
                                  </Button>
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
      


      {/* INCOMPLETE PROFILE MODAL */}
      {missingProfileFields && (
        <ModalShell open={true} onClose={() => setMissingProfileFields(null)} title="Profile Incomplete" maxWidth="max-w-sm"
          footer={<Button onClick={() => { setMissingProfileFields(null); window.dispatchEvent(new CustomEvent('open-profile-settings')); }} className="trace-button trace-button-primary w-full">Complete Profile</Button>}>
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-300 flex items-center justify-center mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Missing Information</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You cannot request documents until you complete your profile. Please open your <strong>Edit Profile</strong> and add the missing information below.
            </p>
            <ul className="text-sm text-left list-disc pl-5">{missingProfileFields.map(field => <li key={field}>{field}</li>)}</ul>
          </div>
        </ModalShell>
      )}

    </>
        )}

        {/* 1.2. STUDENT PORTAL - REQUEST HISTORY */}
        {['request-history', 'payment-history', 'history'].includes(currentTab) && <section className="space-y-5">
          <h2 className="trace-page-title">History</h2>
          <div className="flex flex-wrap gap-3" aria-label="History filters">
            {['all', 'payments'].map(filter => <Button key={filter} type="button" aria-pressed={historyFilter === filter} onClick={() => setHistoryView({ tab: currentTab, filter })} className={`trace-tab rounded-xl  ${historyFilter === filter ? 'bg-[#15803d] text-white' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700'}`}>{filter === 'all' ? 'All Requests' : 'Payments'}</Button>)}
          </div>
          <div className="trace-section trace-section-body overflow-x-auto max-h-[60vh]">
            <table className="w-full table-fixed min-w-[61.25rem] text-left text-xs">
              <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10"><tr>{['Requested', 'Tracking', 'Document', 'Request Status', 'Amount', 'Payment Status', 'Payment Reference', 'Receipt'].map(label => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>
              <tbody>{documents.filter(doc => historyFilter === 'all' || doc.payment_status === 'PAID' || doc.gcash_reference_no).map(doc => <tr key={doc.id} className="border-t border-gray-100 dark:border-gray-700">
                <td className="px-3 py-4">{new Date(doc.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-4 break-all">{doc.tracking_number || doc.id}</td>
                <td className="px-3 py-4 break-words font-bold">{doc.document_type}</td>
                <td className="px-3 py-4"><span className={`inline-flex max-w-full px-2 py-1 rounded-xl ${getStatusTone(doc.current_status)}`}>{getStatusLabel(doc.current_status)}</span></td>
                <td className="px-3 py-4">{doc.priced_at || doc.payment_status === 'PAID' || [STATUS.PENDING_STUDENT_PAYMENT, STATUS.PENDING_FINANCE_VERIFICATION, STATUS.PAID_PENDING_SEC_RELEASE, STATUS.SEC_OR_VERIFIED, STATUS.READY_FOR_RELEASE, STATUS.COMPLETED].includes(doc.current_status)
                  ? <details><summary className="cursor-pointer">{formatPeso(doc.amount)}</summary><FeeBreakdown breakdown={doc.fee_breakdown} amount={doc.amount} /></details>
                  : 'Pending Secretary pricing'}</td>
                <td className="px-3 py-4">{doc.payment_status || 'PENDING'}</td>
                <td className="px-3 py-4 break-all">{doc.gcash_reference_no || doc.or_number || '—'}</td>
                <td className="px-3 py-4">{doc.official_receipt_path ? <Button type="button" onClick={() => setViewImageUrl(doc.official_receipt_path)} className="trace-action font-bold text-green-700 dark:text-green-300 underline">View Receipt</Button> : 'No digital copy'}</td>
              </tr>)}</tbody>
            </table>
            {documents.filter(doc => historyFilter === 'all' || doc.payment_status === 'PAID' || doc.gcash_reference_no).length === 0 && <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No records match this filter.</p>}
          </div>
        </section>}

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
        {activeModal === 'pay' && selectedDoc && (
          <ModalShell open onClose={() => setActiveModal(null)} title="Complete your Payment"
            footer={<div><Button
                  type="submit" form="student-payment-form"
                  disabled={actionLoading}
                  className="trace-button trace-button-primary w-full flex justify-center items-center"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Payment'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setActiveModal('payment-stub')}
                  className="trace-button trace-button-secondary w-full mt-3 flex justify-center items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                  Print Payment Slip (Walk-in)
                </Button></div>}>
              <Button
                onClick={() => handleStudentCancelRequest(selectedDoc.id, true)}
                className="trace-button trace-button-secondary mb-4 w-fit flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Back to Form
              </Button>


              <p className="text-xs text-gray-400 dark:text-gray-400 mb-6 font-semibold">One payment for {selectedPaymentDocuments.length} {selectedPaymentDocuments.length === 1 ? 'document' : 'documents'}</p>

              {/* Payment method picker */}
              <div className="flex flex-wrap gap-2 mb-6">
                {paymentMethods.map((m) => (
                  <Button
                    key={m.code}
                    type="button"
                    onClick={() => setSelectedMethod(m.code)}
                    className={`trace-tab rounded-xl border  ${
                      selectedMethod === m.code
                        ? 'bg-[#15803d] border-[#15803d] text-white shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    {m.name}
                  </Button>
                ))}
              </div>

              <div className="border-2 border-dashed border-[#15803d]/40 bg-gray-50/50 dark:bg-gray-800/50 p-6 rounded-2xl flex flex-col items-center gap-4 mb-6 text-center">
                {selectedMethod === 'gcash' ? (
                  <>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100">Scan this QR code using your GCash app to pay.</span>
                    <img src="/gcash-qr.jpg" alt="GCash QR Code" className="w-50 h-60 rounded-xl shadow-sm object-cover border border-gray-200 dark:border-gray-700" />
                  </>
                ) : (
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">
                    {selectedPaymentMethod?.instructions || 'Complete your payment, then submit proof below.'}
                  </span>
                )}
              </div>

              <form id="student-payment-form" onSubmit={handleStudentSubmitPayment} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="student-payment-documents" className="trace-label">Documents</label>
                    <input 
                      id="student-payment-documents"
                      type="text" 
                      readOnly
                      value={selectedPaymentDocuments.length === 1 ? selectedDoc.document_type : `${selectedPaymentDocuments.length} documents`}
                      className="trace-control"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="student-payment-request" className="trace-label">Request</label>
                    <input 
                      id="student-payment-request"
                      type="text" 
                      readOnly
                      value={selectedDoc.request_group_id || selectedDoc.tracking_number || selectedDoc.id}
                      className="trace-control"
                    />
                  </div>
                </div>

                
                
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm text-emerald-900 dark:text-emerald-300 border-b border-emerald-100/50 dark:border-emerald-800/50 pb-2 mb-2">
                    <span className="font-bold">Total Amount Due</span>
                    <span className="font-black text-lg">{formatPeso(selectedDoc.group_total)}</span>
                  </div>
                  <ul aria-label="Payment breakdown" className="text-xs text-emerald-800/80 dark:text-emerald-300/80 space-y-3">
                    {selectedPaymentDocuments.map(doc => (
                      <li key={doc.id} className="space-y-2">
                        <span className="min-w-0 font-bold text-emerald-900 dark:text-emerald-300 break-words select-text">{doc.document_sequence_number || doc.document_type}</span>
                        <span className="shrink-0 font-mono font-semibold select-text">{formatPeso(doc.amount)}</span>
                        <FeeBreakdown breakdown={doc.fee_breakdown} amount={doc.amount} />
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {selectedPaymentMethod?.requires_reference !== false && (
                    <div className="flex flex-col gap-1.5">
                      <label className="trace-label">
                        {selectedPaymentMethod?.reference_label || 'Reference Number'}
                      </label>
                      <input maxLength={INPUT_LIMITS.shortText}
                        type="text"
                        required
                        placeholder="e.g. 5001 0293 8472"
                        value={paymentRef}
                        onChange={(e) => setPaymentRef(e.target.value)}
                        className="trace-control"
                      />
                    </div>
                  )}
                  {selectedPaymentMethod?.requires_proof !== false && (
                    <div className="flex flex-col gap-1.5">
                      <label className="trace-label">Upload Receipt</label>
                      <FileUploadField label="Payment proof" file={paymentFile} onChange={setPaymentFile} accept="image/*" />
                    </div>
                  )}
                </div>

              </form>
          </ModalShell>
        )}

        {/* 1.6. PAYMENT SUCCESS SCREEN MODAL */}
        {activeModal === 'pay-success' && (
          <ModalShell open onClose={() => setActiveModal(null)} title="Payment Submitted"
            footer={<Button
                onClick={() => setActiveModal(null)}
                className="trace-button trace-button-primary w-full"
              >
                Return to Dashboard
              </Button>}>
              <div className="border-2 border-dashed border-[#15803d]/40 bg-gray-50/50 dark:bg-gray-800/50 p-8 rounded-2xl flex flex-col items-center gap-6 mb-6">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 leading-relaxed max-w-xs">
                  Your reference number and uploaded receipt have been securely routed to Finance Office for verification. Once cleared, your Transcript of Record will be proceed to processing.
                </p>

                {/* Large Green Check Circle */}
                <div className="w-16 h-16 rounded-full bg-[#15803d] text-white flex items-center justify-center shadow-md">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                </div>
              </div>

          </ModalShell>
        )}

        {activeModal === 'tracking' && selectedDoc && (
          <LiveTrackingModal 
            user={user}
            selectedDoc={selectedDoc}
            setActiveModal={setActiveModal}
            trackerProgress={trackerProgress}
            getStatusLabel={getStatusLabel}
          />
        )}

        <ConfirmDialog open={!!submissionToConfirm}
          title={submissionToConfirm?.kind === 'payment' ? 'Confirm Payment Submission' : 'Confirm Document Request'}
          message={submissionToConfirm?.kind === 'payment'
            ? `Submit your ${submissionToConfirm.methodName} proof for ${formatPeso(submissionToConfirm.total)}?`
            : `Submit ${submissionToConfirm?.count || 0} document${submissionToConfirm?.count === 1 ? '' : 's'} as one request?`}
          confirmLabel={submissionToConfirm?.kind === 'payment' ? 'Confirm Payment' : 'Confirm Request'}
          loading={actionLoading} loadingLabel="Submitting…"
          onConfirm={confirmStudentSubmission} onCancel={cancelStudentSubmission} />

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
