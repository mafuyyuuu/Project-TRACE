import StudentRequestConfirmation from './components/StudentRequestConfirmation';
import StudentOverview, { StudentWelcome } from './components/StudentOverview';
import StudentHistory from './components/StudentHistory';
import QueueTabs from '@/components/QueueTabs';
import Button from '@/components/Button';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import { getProfileCompletion } from '@/utils/profileCompletion';
import FeeBreakdown from '@/components/FeeBreakdown';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { useState } from 'react';
import NewRequestModal from '@/features/student/components/NewRequestModal';
import LiveTrackingModal from '@/features/student/components/LiveTrackingModal';
import FloatingSupportChat from '@/features/student/components/FloatingSupportChat';
import FileUploadField from '@/components/FileUploadField';
import ConfirmDialog from '@/components/ConfirmDialog';
import ModalShell from '@/components/ModalShell';
import {
  getAttachmentHelper,
  getAttachmentLabel,
  getStatusLabel,
  requiresAttachment,
} from '@/utils/documentStatus';
import { formatPeso } from '@/utils/pricing';
import useStudentDashboard from '@/features/student/useStudentDashboard';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';

/**
 * Student portal: request KPIs, history, GCash checkout, and live tracking.
 */
export default function StudentDashboard({ user, currentTab, setViewImageUrl }) {
  const [historyView, setHistoryView] = useState({ tab: currentTab, filter: currentTab === 'payment-history' ? 'payments' : 'all' });
  const historyFilter = historyView.tab === currentTab ? historyView.filter : currentTab === 'payment-history' ? 'payments' : 'all';
  const [missingProfileFields, setMissingProfileFields] = useState(null);
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

  const selectedPaymentMethod = paymentMethods.find((m) => m.code === selectedMethod);
  const selectedPaymentDocuments = selectedDoc
    ? documents.filter((doc) => doc.request_group_id === selectedDoc.request_group_id)
    : [];

  if (currentTab === 'messages') return <><RequestMessagesPanel user={user} initialDocumentId={new URLSearchParams(window.location.search).get('document')} /><FloatingSupportChat user={user} /></>;
  if (loading) return <DashboardLoading />;

  return (
    <>
      <FloatingSupportChat user={user} />
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} />
      <div className="trace-page trace-student-dashboard">
        {/* 1.1. STUDENT PORTAL - WORKSPACE DASHBOARD */}
        {currentTab === 'dashboard' && (
          <>
            <StudentWelcome user={user} documents={documents} onNewRequest={() => {
              const missing = getProfileCompletion(user).missing.map(item => item.label);
              if (user.email_verified_at === null) missing.push('Email Address verification — choose Verify in Edit Profile');
              if (missing.length) { setMissingProfileFields(missing); return; }
              setActiveModal('new-request');
            }} />

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
                        <ul className="space-y-3">
                          {group.docs.map((doc) => (
                            <li key={doc.id} className="trace-section trace-section-body max-w-2xl space-y-3 text-sm">
                              <div className="grid min-w-0 grid-cols-1 gap-1 sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-3 sm:gap-y-1">
                                <span className="min-w-0 font-bold text-gray-900 dark:text-gray-100 break-words select-text">{doc.document_sequence_number || doc.document_type}</span>
                                <span className="shrink-0 font-mono text-xs font-semibold text-gray-900 dark:text-gray-100 select-text">{formatPeso(doc.amount)}</span>
                              </div>
                              <FeeBreakdown breakdown={doc.fee_breakdown} amount={doc.amount} />
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

            <StudentOverview documents={documents} onRefresh={loadDashboardData} onCancel={handleStudentCancelRequest} onTrack={doc => { setSelectedDoc(doc); setActiveModal('tracking'); }} />

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
        {['request-history', 'payment-history', 'history'].includes(currentTab) && <StudentHistory documents={documents} view={historyFilter} onView={filter => setHistoryView({ tab: currentTab, filter })} onReceipt={setViewImageUrl} />}

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
              <div className="mb-6"><QueueTabs semantics="filters" label="Payment method" idPrefix="student-payment-method" tabs={paymentMethods.map(method => ({key:method.code,label:method.name}))} activeKey={selectedMethod} onChange={setSelectedMethod} /></div>

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

        <StudentRequestConfirmation request={submissionToConfirm?.kind === 'request' ? submissionToConfirm : null} loading={actionLoading} onConfirm={confirmStudentSubmission} onCancel={cancelStudentSubmission} />
        <ConfirmDialog open={submissionToConfirm?.kind === 'payment'} title="Confirm Payment Submission" message={`Submit your ${submissionToConfirm?.methodName} proof for ${formatPeso(submissionToConfirm?.total)}?`} confirmLabel="Confirm Payment" loading={actionLoading} loadingLabel="Submitting…" onConfirm={confirmStudentSubmission} onCancel={cancelStudentSubmission} />

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
