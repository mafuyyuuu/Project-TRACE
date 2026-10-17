import IntakeReviewModal from '@/features/window1/components/IntakeReviewModal';
import SecretaryHandoffModal from './components/SecretaryHandoffModal';
import SecretaryOverview from './components/SecretaryOverview';
import { useState } from 'react';
import SecretaryEvaluationModal from '@/features/secretary/components/SecretaryEvaluationModal';
import PricingModal from '@/features/secretary/components/PricingModal';
import PaymentStubModal from '@/features/secretary/components/PaymentStubModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import ReceiptVerificationModal from '@/features/secretary/components/ReceiptVerificationModal';
import GradApplicationReviewPanel from '@/features/graduate/components/GradApplicationReviewPanel';
import { getStatusLabel } from '@/utils/documentStatus';
import { formatPeso } from '@/utils/pricing';
import useSecretaryDashboard from '@/features/secretary/useSecretaryDashboard';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';
import StudentProfileModal from '@/components/StudentProfileModal';
import ReportsPanel from '@/features/admin/components/ReportsPanel';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';

/**
 * College Secretary: the three passes this desk makes over a request.
 *
 * Evaluate it and commit to a date, print and price it, then hand the paper to
 * Window 1 once Finance confirms the money. Each is its own queue, because a
 * document sitting in one is waiting on something different from the others.
 */
export default function SecretaryDashboard({ user, currentTab, setViewImageUrl }) {
  const [viewProfileId, setViewProfileId] = useState(null);

  const {
    loading,
    success,
    dismissNotification,
    error,
    documents,
    dashStats,
    actionLoading,
    delegatedIntakeQueue,
    intakeNotes,setIntakeNotes,originalIssued,setOriginalIssued,intakeFile,setIntakeFile,intakeActionToConfirm,handleIntake,confirmIntake,cancelIntake,
    evaluationQueue,
    processingQueue,
    orVerificationQueue,
    handoffQueue,
    clerkNotes,
    setClerkNotes,
    estimatedReadyDate,
    setEstimatedReadyDate,
    priceAmount,
    priceBreakdown, pricingError, priceNotes, setPriceNotes, confirmCurrentRates, setConfirmCurrentRates,
    pricePageCount,
    setPricePageCount,
    priceFeePageCounts, setPriceFeePageCounts,
    handlePriceDocument,
    pricingToConfirm,
    confirmPriceDocument,
    cancelPriceDocument,
    handleVerifyOfficialReceipt,
    orVerifyToConfirm,
    confirmVerifyOfficialReceiptAction,
    cancelVerifyOfficialReceiptConfirm,
    handleConfirmHandoff,
    handoffToConfirm,
    confirmHandoffAction,
    cancelHandoffConfirm,
    evalStudentId,
    setEvalStudentId,
    evalStudentName,
    setEvalStudentName,
    evalDocType,
    setEvalDocType,
    documentTypes,
    documentTypesError,
    activeModal,
    setActiveModal,
    selectedDoc,
    setSelectedDoc,
    handleSecretaryEvaluate,
    evaluateActionToConfirm,
    confirmSecretaryEvaluate,
    cancelSecretaryEvaluate,
  } = useSecretaryDashboard(user);

  const [activeQueueTab, setActiveQueueTab] = useState('evaluation');

  if (currentTab === 'messages') return <RequestMessagesPanel user={user} initialDocumentId={new URLSearchParams(window.location.search).get('document')} />;
  if (['reports', 'completed-logs'].includes(currentTab)) return <ReportsPanel key={currentTab} user={user} currentTab="reports" initialRecordSet={currentTab === 'completed-logs' ? 'secretary-cleared' : ''} />;
  if (loading) return <DashboardLoading />;

  return (
    <>
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} dismissalKey={`${currentTab}:${activeQueueTab}`} />
      <div className="trace-page">
        {currentTab === 'dashboard' && <SecretaryOverview stats={dashStats} queues={{intake:delegatedIntakeQueue,evaluation: evaluationQueue, processing: processingQueue, 'or-verification': orVerificationQueue, handoff: handoffQueue}} activeQueue={activeQueueTab === 'intake' && !delegatedIntakeQueue.length ? 'evaluation' : activeQueueTab} onQueue={setActiveQueueTab} onProfile={setViewProfileId} onPreview={setViewImageUrl} busy={actionLoading}
          onEvaluate={doc => { setSelectedDoc(doc); setEvalStudentId(doc.student_id || ''); setEvalStudentName(doc.student_name || ''); setEvalDocType(doc.document_type || 'Transcript of Records'); setActiveModal('evaluate'); }}
          onPrice={doc => { setSelectedDoc(doc); setPriceNotes(''); setConfirmCurrentRates(false); setPricePageCount(String(Math.max(1, Number(doc.page_count || doc.requested_pages) || 1))); setPriceFeePageCounts(Object.fromEntries((doc.pricing_schedule?.fee_items || []).filter(item => item.fee_rule === 'per_page').map(item => [item.label,String(doc.fee_breakdown?.items?.find(saved => saved.label === item.label)?.pages_per_copy || 1)]))); setActiveModal('price'); }}
          onIntake={doc => { setSelectedDoc(doc); setIntakeNotes(''); setIntakeFile(null); setActiveModal('delegated-intake'); }}
          onVerify={handleVerifyOfficialReceipt} onHandoff={handleConfirmHandoff} />}

        {/* 4.3. COLLEGE SECRETARY - GRADUATE APPLICATIONS */}
        {currentTab === 'grad-applications' && (
          <GradApplicationReviewPanel user={user} currentTab={currentTab} />
        )}

        {activeModal === 'delegated-intake' && selectedDoc && <IntakeReviewModal user={user} selectedDoc={selectedDoc} setActiveModal={setActiveModal} setViewImageUrl={setViewImageUrl} handleIntake={handleIntake} actionLoading={actionLoading} intakeNotes={intakeNotes} setIntakeNotes={setIntakeNotes} originalIssued={originalIssued} setOriginalIssued={setOriginalIssued} intakeFile={intakeFile} setIntakeFile={setIntakeFile} documentTypes={documentTypes} documentTypesLoading={Boolean(documentTypesError)} />}
        <ConfirmDialog open={Boolean(intakeActionToConfirm)} title="Confirm Intake Decision" message={intakeActionToConfirm === 'approve' ? 'Route this assigned request to College Secretary evaluation?' : 'Return this request with your correction note?'} confirmLabel={intakeActionToConfirm === 'approve' ? 'Route to Secretary' : 'Return to Student'} loading={actionLoading} onConfirm={confirmIntake} onCancel={cancelIntake} />

        {/* College Secretary Split-Screen Modal */}
        {activeModal === 'evaluate' && selectedDoc && (
          <SecretaryEvaluationModal
            user={user}
            selectedDoc={selectedDoc}
            setActiveModal={setActiveModal}
            getStatusLabel={getStatusLabel}
            evalStudentId={evalStudentId}
            setEvalStudentId={setEvalStudentId}
            evalStudentName={evalStudentName}
            setEvalStudentName={setEvalStudentName}
            evalDocType={evalDocType}
            setEvalDocType={setEvalDocType}
            documentTypes={documentTypes}
            documentTypesError={documentTypesError}
            clerkNotes={clerkNotes}
            setClerkNotes={setClerkNotes}
            actionLoading={actionLoading}
            handleSecretaryEvaluate={handleSecretaryEvaluate}
            setViewImageUrl={setViewImageUrl}
            estimatedReadyDate={estimatedReadyDate}
            setEstimatedReadyDate={setEstimatedReadyDate}
          />
        )}

        {activeModal === 'price' && selectedDoc && (
          <PricingModal
            selectedDoc={selectedDoc}
            setActiveModal={setActiveModal}
            handlePriceDocument={handlePriceDocument}
            actionLoading={actionLoading}
            priceAmount={priceAmount}
            priceBreakdown={priceBreakdown} pricingError={pricingError}
            priceNotes={priceNotes} setPriceNotes={setPriceNotes}
            confirmCurrentRates={confirmCurrentRates} setConfirmCurrentRates={setConfirmCurrentRates}
            pricePageCount={pricePageCount}
            setPricePageCount={setPricePageCount}
            priceFeePageCounts={priceFeePageCounts} setPriceFeePageCounts={setPriceFeePageCounts}
            siblingsUnpriced={
              processingQueue.filter(
                (d) => d.request_group_id === selectedDoc.request_group_id
                  && d.id !== selectedDoc.id
                  && !d.priced_at
              ).length
            }
          />
        )}

        {activeModal === 'payment-stub' && selectedDoc && (
          <PaymentStubModal
            selectedDoc={selectedDoc}
            groupDocs={documents.filter((d) => d.request_group_id === selectedDoc.request_group_id)}
            setActiveModal={setActiveModal}
          />
        )}

        <ReceiptVerificationModal
          selectedDoc={orVerifyToConfirm}
          setActiveModal={cancelVerifyOfficialReceiptConfirm}
          setViewImageUrl={setViewImageUrl}
          handleSecretaryVerifyReceipt={confirmVerifyOfficialReceiptAction}
          actionLoading={actionLoading}
        />

        <SecretaryHandoffModal document={handoffToConfirm} busy={actionLoading} onConfirm={confirmHandoffAction} onCancel={cancelHandoffConfirm} />

        <ConfirmDialog
          open={!!evaluateActionToConfirm}
          title={evaluateActionToConfirm === 'approve' ? 'Accept for Processing' : 'Return to Window 1'}
          message={
            selectedDoc
              ? evaluateActionToConfirm === 'approve'
                ? `Accept ${selectedDoc.document_type} for processing? The student will be told to expect it by ${estimatedReadyDate}.`
                : `Return ${selectedDoc.document_type} to Window 1 with your notes?`
              : ''
          }
          variant={evaluateActionToConfirm === 'approve' ? 'neutral' : 'destructive'}
          confirmLabel={evaluateActionToConfirm === 'approve' ? 'Accept for Processing' : 'Return to Window 1'}
          loadingLabel="Saving…"
          loading={actionLoading}
          onConfirm={confirmSecretaryEvaluate}
          onCancel={cancelSecretaryEvaluate}
        />

        <ConfirmDialog
          open={pricingToConfirm}
          title="Set the Amount"
          message={selectedDoc ? `Save ${formatPeso(parseFloat(priceAmount) || 0)} as the price for ${selectedDoc.document_type}?` : ''}
          variant="neutral"
          confirmLabel="Save Price"
          loadingLabel="Saving…"
          loading={actionLoading}
          onConfirm={confirmPriceDocument}
          onCancel={cancelPriceDocument}
        />
      </div>
      <StudentProfileModal
        open={!!viewProfileId}
        onClose={() => setViewProfileId(null)}
        studentId={viewProfileId}
      />
    </>
  );
}
