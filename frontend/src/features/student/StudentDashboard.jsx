import StudentCheckoutModal from './components/StudentCheckoutModal';
import useLiveTracking from '@/hooks/useLiveTracking';
import StudentPaymentCard from './components/StudentPaymentCard';
import PaymentStubModal from '@/features/secretary/components/PaymentStubModal';
import StudentOverview, { StudentWelcome } from './components/StudentOverview';
import StudentHistory from './components/StudentHistory';
import Button from '@/components/Button';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import { getProfileCompletion } from '@/utils/profileCompletion';
import { useState } from 'react';
import NewRequestModal from '@/features/student/components/NewRequestModal';
import LiveTrackingModal from '@/features/student/components/LiveTrackingModal';
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

  const tracking = useLiveTracking(activeModal === 'tracking' ? selectedDoc : null);

  const selectedPaymentDocuments = selectedDoc
    ? documents.filter((doc) => selectedDoc.request_group_id ? doc.request_group_id === selectedDoc.request_group_id : doc.id === selectedDoc.id)
    : [];

  if (currentTab === 'messages') return <RequestMessagesPanel user={user} initialDocumentId={new URLSearchParams(window.location.search).get('document')} />;
  if (loading) return <DashboardLoading />;

  return (
    <>
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
            {billableGroups.map(group => <StudentPaymentCard key={group.groupId} group={group}
              onPay={() => { setSelectedDoc({ ...group.docs[0], group_total: group.total }); setActiveModal('pay'); }}
              onSlip={() => { setSelectedDoc({ ...group.docs[0], student_name: user.full_name, student_id: user.student_id, program: user.program, group_total: group.total }); setActiveModal('payment-stub'); }} />)}

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
            requestToConfirm={submissionToConfirm?.kind === 'request' ? submissionToConfirm : null}
            confirmStudentSubmission={confirmStudentSubmission}
            cancelStudentSubmission={cancelStudentSubmission}
            requiresAttachment={requiresAttachment}
            getAttachmentLabel={getAttachmentLabel}
            getAttachmentHelper={getAttachmentHelper}
          />
        )}

        {activeModal === 'payment-stub' && selectedDoc && <PaymentStubModal selectedDoc={selectedDoc} groupDocs={selectedPaymentDocuments} setActiveModal={setActiveModal} onBack={() => setActiveModal('pay')} />}

        {/* 1.5. COMPLETE YOUR GCASH PAYMENT MODAL */}
        {activeModal === 'pay' && selectedDoc && <StudentCheckoutModal document={selectedDoc} documents={selectedPaymentDocuments} methods={paymentMethods} selectedMethod={selectedMethod} onMethod={setSelectedMethod}
          reference={paymentRef} onReference={setPaymentRef} file={paymentFile} onFile={setPaymentFile} onSubmit={handleStudentSubmitPayment} busy={actionLoading}
          onSlip={() => setActiveModal('payment-stub')} onBack={() => handleStudentCancelRequest(selectedDoc.id, true)} onClose={() => setActiveModal(null)} />}

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
            selectedDoc={tracking.document}
            historyLoading={tracking.loading}
            historyError={tracking.error}
            onRefresh={tracking.refresh}
            setActiveModal={setActiveModal}
            getStatusLabel={getStatusLabel}
          />
        )}

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
