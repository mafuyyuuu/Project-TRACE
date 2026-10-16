import FinanceQueueOverview from './components/FinanceQueueOverview';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import { useState } from 'react';
import ReportsPanel from '@/features/admin/components/ReportsPanel';
import ReceiptManagementWorkspace from '@/features/finance/components/ReceiptManagementWorkspace';
import FinanceTransactionsWorkspace from '@/features/finance/components/FinanceTransactionsWorkspace';
import { canonicalTabForUser } from '@/utils/navigation';
import FinanceVerificationModal from '@/features/finance/components/FinanceVerificationModal';
import WalkInPaymentModal from '@/features/finance/components/WalkInPaymentModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { getStatusLabel } from '@/utils/documentStatus';
import useFinanceDashboard from '@/features/finance/useFinanceDashboard';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';
import StudentProfileModal from '@/components/StudentProfileModal';
import PaymentStubModal from '@/features/secretary/components/PaymentStubModal';

/**
 * Finance clerk: the two queues money passes through.
 *
 * Awaiting Payment is read-only — it exists so a student can walk up with a
 * printed slip and be answered. Verification is the actionable one, and the
 * only place in the system a document ever becomes PAID.
 */
export default function FinanceDashboard({ user, setViewImageUrl, currentTab = 'dashboard' }) {
  const tab = canonicalTabForUser(user, currentTab);
  if (tab === 'messages') return <RequestMessagesPanel user={user} initialDocumentId={new URLSearchParams(window.location.search).get('document')} />;
  if (tab === 'reports') return <ReportsPanel user={user} currentTab="reports" />;
  if (tab === 'transactions') return <FinanceTransactionsWorkspace setViewImageUrl={setViewImageUrl} />;
  return <FinanceOverview user={user} setViewImageUrl={setViewImageUrl} />;
}

function FinanceOverview({ user, setViewImageUrl }) {
  const [viewProfileId, setViewProfileId] = useState(null);

  const {
    loading,
    success,
    dismissNotification,
    error,
    documents,
    awaitingPaymentQueue,
    verificationQueue,
    actionLoading,
    clerkNotes,
    verifiedReceipt, setVerifiedReceipt,
    setClerkNotes,
    counterDeferred, setCounterDeferred,
    orNumber, setOrNumber,
    orDate, setOrDate,
    orFile, setOrFile,
    scanning,
    scanConfidence,
    handleScanReceipt,
    handleLogWalkIn,
    activeModal,
    setActiveModal,
    selectedDoc,
    setSelectedDoc,
    handleFinanceVerify,
    financeVerifyToConfirm,
    confirmFinanceVerify,
    cancelFinanceVerify,
    walkInToConfirm,
    confirmLogWalkIn,
    cancelLogWalkIn,
    triggerNotification,
    paymentMethods,
  } = useFinanceDashboard(user);

  const [activeQueueTab, setActiveQueueTab] = useState('awaiting-payment');


  if (loading) return <DashboardLoading />;

  return (
    <>
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} dismissalKey={activeQueueTab} />
      <div className="trace-page">
        <FinanceQueueOverview awaiting={awaitingPaymentQueue} verification={verificationQueue} active={activeQueueTab} onQueue={setActiveQueueTab} onProfile={setViewProfileId} onSlip={doc=>{setSelectedDoc(doc);setActiveModal('payment-stub');}} onLog={doc=>{setSelectedDoc(doc);setActiveModal('walk-in-payment');}} onReview={doc=>{setVerifiedReceipt(null);setSelectedDoc(doc);setActiveModal('verify-pay');}} onSettings={()=>setActiveModal('receipt-management')} busy={actionLoading} history={<FinanceTransactionsWorkspace setViewImageUrl={setViewImageUrl} />} />

{activeModal === 'receipt-management' && <ReceiptManagementWorkspace onClose={() => setActiveModal(null)} />}
{/* 2.1 FINANCE VERIFICATION MODAL */}
        {activeModal === 'verify-pay' && selectedDoc && (
          <FinanceVerificationModal
            key={selectedDoc.id}
            verifiedReceipt={verifiedReceipt}
            selectedDoc={selectedDoc}
            setActiveModal={setActiveModal}
            getStatusLabel={getStatusLabel}
            handleFinanceVerify={handleFinanceVerify}
            actionLoading={actionLoading}
            setViewImageUrl={setViewImageUrl}
            triggerNotification={triggerNotification}
            clerkNotes={clerkNotes}
            setClerkNotes={setClerkNotes}
            paymentMethods={paymentMethods}
          />
        )}

        {activeModal === 'walk-in-payment' && selectedDoc && (
          <WalkInPaymentModal
            selectedDoc={selectedDoc}
            groupDocs={documents.filter((d) => d.request_group_id === selectedDoc.request_group_id)}
            setActiveModal={setActiveModal}
            handleLogWalkIn={handleLogWalkIn}
            handleScanReceipt={handleScanReceipt}
            actionLoading={actionLoading}
            scanning={scanning}
            scanConfidence={scanConfidence}
            counterDeferred={counterDeferred}
            setCounterDeferred={setCounterDeferred}
            orNumber={orNumber}
            setOrNumber={setOrNumber}
            orDate={orDate}
            setOrDate={setOrDate}
            orFile={orFile}
            setOrFile={setOrFile}
            clerkNotes={clerkNotes}
            setClerkNotes={setClerkNotes}
          />
        )}

        <ConfirmDialog
          open={!!financeVerifyToConfirm}
          title={financeVerifyToConfirm?.action === 'approve' ? 'Verify Payment' : 'Reject Payment'}
          message={
            financeVerifyToConfirm
              ? financeVerifyToConfirm.action === 'approve'
                ? `Confirm this payment for ${financeVerifyToConfirm.documentType} is verified? This marks the request paid. ${financeVerifyToConfirm.usePack ? `Issue ${financeVerifyToConfirm.expected_serial} to the student; consume one serial.` : financeVerifyToConfirm.deferred ? 'OR issuance stays pending.' : 'Keep the recorded OR.'} ${financeVerifyToConfirm.uploadLater ? 'Upload its digital copy later from Payment History.' : financeVerifyToConfirm.file ? 'Save the selected digital copy with this verification.' : 'Its digital copy can be uploaded from Payment History.'}`
                : `Reject this payment for ${financeVerifyToConfirm.documentType}? The student will need to resubmit.`
              : ''
          }
          variant={financeVerifyToConfirm?.action === 'approve' ? 'neutral' : 'destructive'}
          confirmLabel={financeVerifyToConfirm?.action === 'approve' ? 'Verify Payment' : 'Reject Payment'}
          loadingLabel="Saving…"
          loading={actionLoading}
          onConfirm={confirmFinanceVerify}
          onCancel={cancelFinanceVerify}
        />

        <ConfirmDialog
          open={walkInToConfirm}
          title="Record Payment"
          message={selectedDoc ? `Record this counter payment for ${selectedDoc.document_type}?` : ''}
          variant="neutral"
          confirmLabel="Record Payment"
          loadingLabel="Saving…"
          loading={actionLoading}
          onConfirm={confirmLogWalkIn}
          onCancel={cancelLogWalkIn}
        />
      </div>
      {activeModal === 'payment-stub' && <PaymentStubModal selectedDoc={selectedDoc} groupDocs={documents.filter(d => d.request_group_id === selectedDoc.request_group_id)} setActiveModal={setActiveModal} />}
      <StudentProfileModal
        open={!!viewProfileId}
        onClose={() => setViewProfileId(null)}
        studentId={viewProfileId}
      />
    </>
  );
}
