import Button from '@/components/Button';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import { useState } from 'react';
import FinanceTransactionsWorkspace from '@/features/finance/components/FinanceTransactionsWorkspace';
import { canonicalTabForUser } from '@/utils/navigation';
import FinanceVerificationModal from '@/features/finance/components/FinanceVerificationModal';
import WalkInPaymentModal from '@/features/finance/components/WalkInPaymentModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import QueueTabs from '@/components/QueueTabs';
import { formatPeso } from '@/utils/pricing';
import { getStatusLabel } from '@/utils/documentStatus';
import useFinanceDashboard from '@/features/finance/useFinanceDashboard';
import { todayLongDate } from '@/utils/formatters';
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

  const todayFormatted = todayLongDate();

  if (loading) return <DashboardLoading />;

  return (
    <>
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} dismissalKey={activeQueueTab} />
      <div className="trace-page">
        {/* Header */}
        <div className="trace-page-header">
          <div>
            <h2 className="trace-page-title">
              Finance Office Command Center
            </h2>
          </div>
          <div className="trace-date">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Today:</span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{todayFormatted}</span>
            <svg className="w-4 h-4 text-gray-400 dark:text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
        </div>

        {/* Queue Tabs — one table visible at a time instead of two stacked */}
        <QueueTabs
          tabs={[
            { key: 'awaiting-payment', label: 'Awaiting Payment', count: awaitingPaymentQueue.length },
            { key: 'verification', label: 'Verification Queue', count: verificationQueue.length },
          ]}
          activeKey={activeQueueTab}
          onChange={setActiveQueueTab}
        />

        {/* 1 · Billed, waiting on the student. Read-only, except that a student
            can walk up with the printed slip and pay at the counter. */}
        {activeQueueTab === 'awaiting-payment' && (
        <div className="trace-section trace-motion-context overflow-hidden mt-6">
          <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <div>
              <h3 className="trace-section-title uppercase tracking-wider">1 · AWAITING PAYMENT</h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">Billed by the College Secretary. Log a payment here when the student pays at the counter.</p>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
              Awaiting: <strong className="text-gray-900 dark:text-gray-100">{awaitingPaymentQueue.length}</strong>
            </span>
          </div>
          <div className="p-4 sm:p-6">
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
              {awaitingPaymentQueue.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">Nothing waiting to be paid.</div>
              ) : (
                <table className="w-full text-left border-collapse table-auto min-w-[680px]">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-4 font-bold pl-4 min-w-[110px]">Tracking ID</th>
                      <th className="pb-4 font-bold min-w-[150px]">Name</th>
                      <th className="pb-4 font-bold min-w-[140px]">Document Type</th>
                      <th className="pb-4 font-bold min-w-[90px]">Amount</th>
                      <th className="pb-4 font-bold text-right pr-4 min-w-[190px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {awaitingPaymentQueue.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 group">
                        <td className="py-4 pl-4 font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                        <td className="py-4">
                          <Button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="trace-action text-sm font-bold text-blue-700 dark:text-blue-300 hover:underline text-left focus-visible:ring-2 focus-visible:ring-blue-500">{doc.student_name || 'Unknown Student'}</Button>
                          <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5 select-text break-words">{doc.student_id || 'ID Pending'}</div>
                        </td>
                        <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_type}</td>
                        <td className="py-4 text-xs font-bold text-gray-800 dark:text-gray-100 font-mono">{formatPeso(doc.amount)}</td>
                        <td className="py-4 text-right pr-4 min-w-[200px]"><div className="flex flex-wrap justify-end gap-2 items-center">

                          <Button
                            onClick={() => { setSelectedDoc(doc); setActiveModal('payment-stub'); }}
                            className="trace-button trace-button-secondary block shrink-0"
                          >
                            View Slip
                          </Button>
                          <Button
                            onClick={() => { setSelectedDoc(doc); setActiveModal('walk-in-payment'); }}
                            className="trace-button trace-button-secondary ml-auto block shrink-0"
                          >
                            Log Counter Payment
                          </Button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Verification Queue Table */}
        {activeQueueTab === 'verification' && (
        <div className="trace-section trace-motion-context overflow-hidden mt-6">
          <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <h3 className="trace-section-title uppercase tracking-wider">2 · VERIFICATION QUEUE</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
              Pending Request: <strong className="text-gray-900 dark:text-gray-100">{verificationQueue.length}</strong>
            </span>
          </div>
          <div className="p-4 sm:p-6">
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
              {verificationQueue.length === 0 ? (
                <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">No pending receipts to verify. Queue is clean!</div>
              ) : (
                <table className="w-full text-left border-collapse table-auto min-w-[730px]">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                    <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                      <th className="pb-4 font-bold pl-4 min-w-[110px]">Tracking ID</th>
                      <th className="pb-4 font-bold min-w-[150px]">Name</th>
                      <th className="pb-4 font-bold min-w-[140px]">Document Type</th>
                      <th className="pb-4 font-bold min-w-[90px]">Amount</th>
                      <th className="pb-4 font-bold min-w-[130px]">Paid via</th>
                      <th className="pb-4 font-bold text-right pr-4 min-w-[110px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                    {verificationQueue.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 group">
                        <td className="py-4 pl-4 font-mono text-xs font-semibold text-gray-500 dark:text-gray-400">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                        <td className="py-4">
                          <Button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="trace-action text-sm font-bold text-blue-700 dark:text-blue-300 hover:underline text-left focus-visible:ring-2 focus-visible:ring-blue-500">{doc.student_name || 'Unknown Student'}</Button>
                          <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5 select-text break-words">{doc.student_id || 'ID Pending'}</div>
                        </td>
                        <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_type}</td>
                        <td className="py-4 text-xs font-bold text-gray-800 dark:text-gray-100 font-mono">{formatPeso(doc.amount)}</td>
                        <td className="py-4 text-xs font-semibold">
                          {doc.payment_channel === 'walk_in'
                            ? <span className="text-gray-700 dark:text-gray-300">Counter · <span className="font-mono">{doc.or_number}</span></span>
                            : <span className="text-gray-500 dark:text-gray-400">Online</span>}
                        </td>
                        <td className="py-4 text-right pr-4 min-w-[140px]"><div className="flex flex-wrap justify-end gap-2 items-center">

                          <Button
                            onClick={() => { setSelectedDoc(doc); setActiveModal('payment-stub'); }}
                            className="trace-button trace-button-secondary shrink-0"
                          >
                            Slip
                          </Button>
                          <Button
                            onClick={() => { setSelectedDoc(doc); setActiveModal('verify-pay'); }}
                            className="trace-button trace-button-primary flex items-center gap-1.5 ml-auto shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Review
                          </Button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        </div>
        )}

        {/* 2.1 FINANCE VERIFICATION MODAL */}
        {activeModal === 'verify-pay' && selectedDoc && (
          <FinanceVerificationModal
            user={user}
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
                ? `Confirm this payment for ${selectedDoc?.document_type} is verified? This marks the request paid.`
                : `Reject this payment for ${selectedDoc?.document_type}? The student will need to resubmit.`
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
