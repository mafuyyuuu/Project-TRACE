import FinanceVerificationModal from '@/features/finance/components/FinanceVerificationModal';
import WalkInPaymentModal from '@/features/finance/components/WalkInPaymentModal';
import { formatPeso } from '@/utils/pricing';
import { getStatusLabel } from '@/utils/documentStatus';
import useFinanceDashboard from '@/features/finance/useFinanceDashboard';
import { todayLongDate } from '@/utils/formatters';
import DashboardAlerts from '@/components/DashboardAlerts';
import DashboardLoading from '@/components/DashboardLoading';

/**
 * Finance clerk: the two queues money passes through.
 *
 * Awaiting Payment is read-only — it exists so a student can walk up with a
 * printed slip and be answered. Verification is the actionable one, and the
 * only place in the system a document ever becomes PAID.
 */
export default function FinanceDashboard({ user, setViewImageUrl }) {
  const {
    loading,
    success,
    error,
    documents,
    awaitingPaymentQueue,
    verificationQueue,
    actionLoading,
    clerkNotes,
    setClerkNotes,
    orNumber, setOrNumber,
    orDate, setOrDate,
    orFile,
    scanning,
    scanConfidence,
    handleScanReceipt,
    handleLogWalkIn,
    activeModal,
    setActiveModal,
    selectedDoc,
    setSelectedDoc,
    handleFinanceVerify,
    triggerNotification,
  } = useFinanceDashboard(user);

  const todayFormatted = todayLongDate();

  if (loading) return <DashboardLoading />;

  return (
    <>
      <DashboardAlerts success={success} error={error} />
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-gray-900 tracking-tight">
              Finance Office Command Center
            </h2>
          </div>
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-2.5 shadow-sm">
            <span className="text-xs font-semibold text-gray-500">Today:</span>
            <span className="text-xs font-bold text-gray-800">{todayFormatted}</span>
            <svg className="w-4 h-4 text-gray-400 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
        </div>

        {/* 1 · Billed, waiting on the student. Read-only, except that a student
            can walk up with the printed slip and pay at the counter. */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-950 text-sm tracking-wider uppercase">1 · AWAITING PAYMENT</h3>
              <p className="text-[11px] text-gray-500 font-medium mt-1">Billed by the College Secretary. Log a payment here when the student pays at the counter.</p>
            </div>
            <span className="text-xs text-gray-500 font-semibold whitespace-nowrap">
              Awaiting: <strong className="text-gray-900">{awaitingPaymentQueue.length}</strong>
            </span>
          </div>
          <div className="p-4 sm:p-6">
            <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
              {awaitingPaymentQueue.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium">Nothing waiting to be paid.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                      <th className="pb-4 font-bold pl-4">Tracking ID</th>
                      <th className="pb-4 font-bold">Name</th>
                      <th className="pb-4 font-bold">Document Type</th>
                      <th className="pb-4 font-bold">Amount</th>
                      <th className="pb-4 font-bold text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {awaitingPaymentQueue.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50/30 group">
                        <td className="py-4 pl-4 font-mono text-xs font-semibold text-gray-500">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                        <td className="py-4">
                          <div className="text-sm font-bold text-gray-900">{doc.student_name || 'Unknown Student'}</div>
                          <div className="text-xs font-mono text-gray-400 mt-0.5">{doc.student_id || 'ID Pending'}</div>
                        </td>
                        <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type}</td>
                        <td className="py-4 text-xs font-bold text-gray-800 font-mono">{formatPeso(doc.amount)}</td>
                        <td className="py-4 text-right pr-4">
                          <button
                            onClick={() => { setSelectedDoc(doc); setActiveModal('walk-in-payment'); }}
                            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all ml-auto block"
                          >
                            Log Counter Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Verification Queue Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-gray-950 text-sm tracking-wider uppercase">2 · VERIFICATION QUEUE</h3>
            <span className="text-xs text-gray-500 font-semibold">
              Pending Request: <strong className="text-gray-900">{verificationQueue.length}</strong>
            </span>
          </div>
          <div className="p-4 sm:p-6">
            <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
              {verificationQueue.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-medium">No pending receipts to verify. Queue is clean!</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                      <th className="pb-4 font-bold pl-4">Tracking ID</th>
                      <th className="pb-4 font-bold">Name</th>
                      <th className="pb-4 font-bold">Document Type</th>
                      <th className="pb-4 font-bold">Amount</th>
                      <th className="pb-4 font-bold">Paid via</th>
                      <th className="pb-4 font-bold text-right pr-4">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {verificationQueue.map(doc => (
                      <tr key={doc.id} className="hover:bg-gray-50/30 group">
                        <td className="py-4 pl-4 font-mono text-xs font-semibold text-gray-500">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
                        <td className="py-4">
                          <div className="text-sm font-bold text-gray-900">{doc.student_name || 'Unknown Student'}</div>
                          <div className="text-xs font-mono text-gray-400 mt-0.5">{doc.student_id || 'ID Pending'}</div>
                        </td>
                        <td className="py-4 text-xs font-bold text-gray-600">{doc.document_type}</td>
                        <td className="py-4 text-xs font-bold text-gray-800 font-mono">{formatPeso(doc.amount)}</td>
                        <td className="py-4 text-xs font-semibold">
                          {doc.payment_channel === 'walk_in'
                            ? <span className="text-gray-700">Counter · <span className="font-mono">{doc.or_number}</span></span>
                            : <span className="text-gray-500">Online</span>}
                        </td>
                        <td className="py-4 text-right pr-4">
                          <button 
                            onClick={() => { setSelectedDoc(doc); setActiveModal('verify-pay'); }}
                            className="px-4 py-2 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

            </div>
          </div>
        </div>

        {/* Finance Receipt Verification Modal */}
        {/* 2.1 FINANCE VERIFICATION MODAL */}
        {activeModal === 'verify-pay' && selectedDoc && (
          <FinanceVerificationModal
            selectedDoc={selectedDoc}
            setActiveModal={setActiveModal}
            getStatusLabel={getStatusLabel}
            handleFinanceVerify={handleFinanceVerify}
            actionLoading={actionLoading}
            setViewImageUrl={setViewImageUrl}
            triggerNotification={triggerNotification}
            clerkNotes={clerkNotes}
            setClerkNotes={setClerkNotes}
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
            orNumber={orNumber}
            setOrNumber={setOrNumber}
            orDate={orDate}
            setOrDate={setOrDate}
            orFile={orFile}
            clerkNotes={clerkNotes}
            setClerkNotes={setClerkNotes}
          />
        )}
      </div>
    </>
  );
}
