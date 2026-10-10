import Button from '@/components/Button';
import { useState } from 'react';
import SecretaryEvaluationModal from '@/features/secretary/components/SecretaryEvaluationModal';
import PricingModal from '@/features/secretary/components/PricingModal';
import PaymentStubModal from '@/features/secretary/components/PaymentStubModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import ReceiptVerificationModal from '@/features/secretary/components/ReceiptVerificationModal';
import QueueTabs from '@/components/QueueTabs';
import MiniSparkline from '@/components/MiniSparkline';
import GradApplicationReviewPanel from '@/features/graduate/components/GradApplicationReviewPanel';
import { getStatusLabel } from '@/utils/documentStatus';
import { getRelativeTime, todayLongDate } from '@/utils/formatters';
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
  const todayFormatted = todayLongDate();

  if (currentTab === 'messages') return <RequestMessagesPanel user={user} initialDocumentId={new URLSearchParams(window.location.search).get('document')} />;
  if (['reports', 'completed-logs'].includes(currentTab)) return <ReportsPanel key={currentTab} user={user} currentTab="reports" initialRecordSet={currentTab === 'completed-logs' ? 'secretary-cleared' : ''} />;
  if (loading) return <DashboardLoading />;

  return (
    <>
      <DashboardAlerts success={success} error={error} onDismiss={dismissNotification} dismissalKey={`${currentTab}:${activeQueueTab}`} />
      <div className="trace-page">
        {/* 4.1. COLLEGE SECRETARY - WORKSPACE DASHBOARD */}
        {currentTab === 'dashboard' && (
          <>
            {/* Welcome Header */}
            <div className="trace-page-header">
              <div>
                <h2 className="trace-page-title">
                  Welcome back, <span className="text-[#15803d] dark:text-green-300 font-bold">College Secretary</span>
                </h2>
              </div>
              <div className="trace-date">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Today:</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-100">{todayFormatted}</span>
                <svg className="w-4 h-4 text-gray-400 dark:text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="trace-section trace-card-info trace-section-body flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">PROCESSED DOCUMENT TODAY</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 mt-2 block">{dashStats.processed_today} <span className="text-sm text-gray-400 dark:text-gray-400 font-medium font-sans">Documents</span></span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] dark:text-green-300 w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  Documents evaluated and routed today
                </div>
              </div>

              <div className="trace-section trace-card-info trace-section-body flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">PENDING DOCUMENTS</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 mt-2 block">
                      {dashStats.pending_secretary_count} <span className="text-sm text-gray-400 dark:text-gray-400 font-medium font-sans">Documents</span>
                    </span>
                  </div>
                  <MiniSparkline trend="down" />
                </div>
                <div className="bg-[#15803d] rounded-xl px-4 py-2 text-[10px] font-medium text-white w-full mt-2 leading-snug">
                  Documents awaiting your verification review
                </div>
              </div>

              <div className="trace-section trace-card-info trace-section-body flex flex-col justify-between min-h-44">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest block">APPROVED & ROUTED</span>
                    <span className="text-2xl sm:text-3xl font-display font-black text-gray-900 dark:text-gray-100 mt-2 block">
                      {dashStats.ready_window_1_count + dashStats.completed_today_count} <span className="text-sm text-gray-400 dark:text-gray-400 font-medium font-sans">Done</span>
                    </span>
                  </div>
                  <MiniSparkline trend="up" />
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-full px-3 py-1 text-[10px] font-bold text-[#15803d] dark:text-green-300 w-fit flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 bg-[#15803d] rounded-full"></span>
                  Approved and routed to Window 1 for release
                </div>
              </div>
            </div>

            {/* Queue Tabs — one table visible at a time instead of three stacked */}
            <QueueTabs
              tabs={[
                { key: 'evaluation', label: 'Initial Evaluation', count: evaluationQueue.length },
                { key: 'processing', label: 'Processing & Pricing', count: processingQueue.length },
                { key: 'or-verification', label: 'OR Verification', count: orVerificationQueue.length },
                { key: 'handoff', label: 'Final Handoff', count: handoffQueue.length },
              ]}
              activeKey={activeQueueTab}
              onChange={setActiveQueueTab}
            />

            {activeQueueTab === 'evaluation' && (
            <div className="trace-section trace-motion-context overflow-hidden mt-6">
              <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="trace-section-title uppercase tracking-wider">1 · INITIAL EVALUATION</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">Check the request, then give the student a date to expect it by.</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                  {evaluationQueue.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">Evaluation queue is empty! Beautiful.</div>
                  ) : (
                    <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
                      <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                        <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                          <th className="pb-4 font-bold pl-4">Document Details</th>
                          <th className="pb-4 font-bold">Category</th>
                          <th className="pb-4 font-bold">Waiting</th>
                          <th className="pb-4 font-bold">Status</th>
                          <th className="pb-4 font-bold text-right pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {evaluationQueue.map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 group">
                            <td className="py-4 pl-4">
                              <Button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="trace-action font-bold text-blue-700 dark:text-blue-300 hover:underline text-left focus-visible:ring-2 focus-visible:ring-blue-500">{doc.student_name || 'Unresolved Student'}</Button>
                              <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                            </td>
                            <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_sequence_number || doc.document_type || 'Transcript of Records'}</td>
                            <td className="py-4 text-xs text-gray-400 dark:text-gray-400">{getRelativeTime(doc.created_at)}</td>
                            <td className="py-4">
                              {/* Nothing here is paid yet — under this pipeline the student is
                                  not billed until the document has been printed and priced. */}
                              <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-black rounded-full uppercase tracking-wider">UNPAID</span>
                            </td>
                            <td className="py-4 text-right pr-4">
                              <Button
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setEvalStudentId(doc.student_id || '');
                                  setEvalStudentName(doc.student_name || '');
                                  setEvalDocType(doc.document_type || 'Transcript of Records');
                                  setActiveModal('evaluate');
                                }}
                                className="trace-button trace-button-primary flex items-center gap-1.5 ml-auto"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                Review
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                </div>
              </div>
            </div>
            )}

            {/* 2 · Printed and awaiting a price. The student is only billed
                once every document in their request has one. */}
            {activeQueueTab === 'processing' && (
            <div className="trace-section trace-motion-context overflow-hidden mt-6">
              <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="trace-section-title uppercase tracking-wider">2 · PROCESSING &amp; PRICING</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">Print the document, then set what it costs. The request is billed once every document in it is priced.</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                  {processingQueue.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">Nothing being processed right now.</div>
                  ) : (
                    <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
                      <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                        <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                          <th className="pb-4 font-bold pl-4">Document Details</th>
                          <th className="pb-4 font-bold">Category</th>
                          <th className="pb-4 font-bold">Promised By</th>
                          <th className="pb-4 font-bold">Price</th>
                          <th className="pb-4 font-bold text-right pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {processingQueue.map(doc => {
                          const priced = Boolean(doc.priced_at);
                          const due = doc.estimated_ready_date ? new Date(doc.estimated_ready_date) : null;
                          // A date already gone by is the one thing on this row
                          // worth interrupting the clerk about.
                          const overdue = due && due < new Date(new Date().toDateString());
                          return (
                            <tr key={doc.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 group">
                              <td className="py-4 pl-4">
                                <Button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="trace-action font-bold text-blue-700 dark:text-blue-300 hover:underline text-left focus-visible:ring-2 focus-visible:ring-blue-500">{doc.student_name || 'Unresolved Student'}</Button>
                                <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                              </td>
                              <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_sequence_number || doc.document_type}</td>
                              <td className="py-4 text-xs font-semibold">
                                {due
                                  ? <span className={overdue ? 'text-red-600 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'}>
                                      {due.toLocaleDateString()}{overdue && ' · overdue'}
                                    </span>
                                  : <span className="text-gray-400 dark:text-gray-400">—</span>}
                              </td>
                              <td className="py-4 text-xs font-mono font-bold">
                                {priced
                                  ? <span className="text-[#15803d] dark:text-green-300">{formatPeso(doc.amount)}</span>
                                  : <span className="text-gray-400 dark:text-gray-400">not set</span>}
                              </td>
                              <td className="py-4 text-right pr-4">
                                <Button
                                  onClick={() => {
                                    setSelectedDoc(doc);
                                    setPriceNotes(''); setConfirmCurrentRates(false);
                                    setPricePageCount(doc.page_count ? String(doc.page_count) : '');
                                    setActiveModal('price');
                                  }}
                                  className="trace-button trace-button-secondary ml-auto block"
                                >
                                  {priced ? 'Adjust Price' : 'Set Price'}
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* 3 · Paid, waiting on a paperwork check before handoff. */}
            {activeQueueTab === 'or-verification' && (
            <div className="trace-section trace-motion-context overflow-hidden mt-6">
              <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="trace-section-title uppercase tracking-wider">3 · OR VERIFICATION</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">Finance has confirmed the payment. Check the Official Receipt is present and the number looks right before handoff.</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                  {orVerificationQueue.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">Nothing waiting on an OR check.</div>
                  ) : (
                    <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
                      <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                        <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                          <th className="pb-4 font-bold pl-4">Document Details</th>
                          <th className="pb-4 font-bold">Category</th>
                          <th className="pb-4 font-bold">Official Receipt</th>
                          <th className="pb-4 font-bold text-right pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {orVerificationQueue.map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 group">
                            <td className="py-4 pl-4">
                              <Button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="trace-action font-bold text-blue-700 dark:text-blue-300 hover:underline text-left focus-visible:ring-2 focus-visible:ring-blue-500">{doc.student_name || 'Unresolved Student'}</Button>
                              <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                            </td>
                            <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_sequence_number || doc.document_type}</td>
                            <td className="py-4 text-xs font-mono">
                              <span className="font-bold text-gray-700 dark:text-gray-300">{doc.or_number || 'None on file'}</span>
                              {doc.official_receipt_path && (
                                <Button
                                  onClick={() => setViewImageUrl(doc.official_receipt_path)}
                                  className="trace-action ml-2 text-[#15803d] dark:text-green-300 hover:underline font-sans font-bold"
                                >
                                  View
                                </Button>
                              )}
                            </td>
                            <td className="py-4 text-right pr-4">
                              <Button
                                onClick={() => handleVerifyOfficialReceipt(doc)}
                                disabled={actionLoading}
                                className="trace-button trace-button-primary ml-auto block"
                              >
                                Verify Receipt
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
            )}

            {/* 4 · Paid and waiting to physically change hands. */}
            {activeQueueTab === 'handoff' && (
            <div className="trace-section trace-motion-context overflow-hidden mt-6">
              <div className="trace-section-header border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="trace-section-title uppercase tracking-wider">4 · FINAL HANDOFF</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-1">Paid and signed. Confirm once the printed document is physically at Window 1.</p>
              </div>
              <div className="p-4 sm:p-6">
                <div className="max-h-[calc(100vh-280px)] overflow-y-auto overflow-x-auto">
                  {handoffQueue.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 dark:text-gray-400 font-medium">Nothing waiting to be handed over.</div>
                  ) : (
                    <table className="w-full text-left border-collapse table-fixed min-w-[680px]">
                      <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                        <tr className="text-gray-400 dark:text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                          <th className="pb-4 font-bold pl-4">Document Details</th>
                          <th className="pb-4 font-bold">Category</th>
                          <th className="pb-4 font-bold">Paid</th>
                          <th className="pb-4 font-bold text-right pr-4">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                        {handoffQueue.map(doc => (
                          <tr key={doc.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/30 group">
                            <td className="py-4 pl-4">
                              <Button type="button" disabled={!doc.student_id} onClick={() => setViewProfileId(doc.student_id)} className="trace-action font-bold text-blue-700 dark:text-blue-300 hover:underline text-left focus-visible:ring-2 focus-visible:ring-blue-500">{doc.student_name || 'Unresolved Student'}</Button>
                              <div className="text-xs font-mono text-gray-400 dark:text-gray-400 mt-0.5">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</div>
                            </td>
                            <td className="py-4 text-xs font-bold text-gray-600 dark:text-gray-300">{doc.document_sequence_number || doc.document_type}</td>
                            <td className="py-4 text-xs font-mono">
                              <span className="font-bold text-[#15803d] dark:text-green-300">{formatPeso(doc.amount)}</span>
                              <span className="text-gray-400 dark:text-gray-400 ml-2">{doc.or_number || (doc.payment_channel === 'digital' ? 'online' : '')}</span>
                            </td>
                            <td className="py-4 text-right pr-4">
                              <Button
                                onClick={() => handleConfirmHandoff(doc)}
                                disabled={actionLoading}
                                className="trace-button trace-button-primary ml-auto block"
                              >
                                Handed to Window 1
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
            )}
          </>
        )}

        {/* 4.3. COLLEGE SECRETARY - GRADUATE APPLICATIONS */}
        {currentTab === 'grad-applications' && (
          <GradApplicationReviewPanel user={user} currentTab={currentTab} />
        )}

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

        <ConfirmDialog
          open={!!handoffToConfirm}
          title="Confirm Handoff"
          message={handoffToConfirm ? `Confirm you have handed ${handoffToConfirm.document_type} to Window 1?` : ''}
          variant="neutral"
          confirmLabel="Confirm Handoff"
          loadingLabel="Recording…"
          loading={actionLoading}
          onConfirm={confirmHandoffAction}
          onCancel={cancelHandoffConfirm}
        />

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
