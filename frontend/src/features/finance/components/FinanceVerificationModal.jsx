import DocumentChat from '@/components/DocumentChat';
import { useState } from 'react';
import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import { itemBreakdown, formatPeso } from '@/utils/pricing';

export default function FinanceVerificationModal({
  user,
  setActiveModal,
  selectedDoc,
  setViewImageUrl,
  triggerNotification,
  handleFinanceVerify,
  actionLoading,
  clerkNotes,
  setClerkNotes,
  paymentMethods = [],
}) {
  const [financeReceiptFile, setFinanceReceiptFile] = useState(null);
  // Walk-in documents already carry an OR number from logWalkInPayment; a
  // digital payment has none until Finance types it in here.
  const [orNumber, setOrNumber] = useState(selectedDoc?.or_number || '');

  if (!selectedDoc) return null;

  const canVerify = Boolean(orNumber.trim());
  // documents.payment_method defaults to 'gcash' for rows predating the
  // column — matching document.model.js's own default.
  const method = paymentMethods.find((m) => m.code === (selectedDoc.payment_method || 'gcash'));
  const methodName = method?.name || 'GCash';
  const referenceLabel = method?.reference_label || 'Reference Number';

  return (
    <ModalShell
      open={!!selectedDoc}
      onClose={() => setActiveModal(null)}
      title="Verification Details"
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={() => handleFinanceVerify('reject', null)}
            disabled={actionLoading}
            className="w-full sm:w-1/2 py-3 rounded-xl font-bold text-xs shadow-md transition-all text-center uppercase tracking-wider bg-red-600 dark:bg-red-600 hover:bg-red-700 dark:hover:bg-red-700 text-white disabled:opacity-50"
          >
            Reject Payment
          </button>
          <button
            onClick={() => handleFinanceVerify('approve', financeReceiptFile, orNumber.trim())}
            disabled={actionLoading || !canVerify}
            className={`w-full sm:w-1/2 py-3 rounded-xl font-bold text-xs shadow-md transition-all text-center uppercase tracking-wider ${
              !canVerify ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed' : 'bg-[#15803d] hover:bg-[#166534] text-white'
            }`}
          >
            Verify Payment
          </button>
        </div>
      }
    >
      <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100 dark:border-gray-700">Review and verify the student's payment receipt.</p>

      {/* Gray detail panel */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 my-4 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-2">
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Name</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{selectedDoc.student_name || 'Unknown'}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Document Type</span><span className="font-bold text-gray-950 dark:text-gray-100">{selectedDoc.document_type}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Tracking ID</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Date Paid</span><span className="font-bold text-gray-950 dark:text-gray-100">{new Date(selectedDoc.updated_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} at {new Date(selectedDoc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
        
        {/* Itemization */}
        <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-3 mt-1 space-y-1">
          {(() => {
            const typeObj = {
              name: selectedDoc.document_type,
              base_fee: selectedDoc.base_fee,
              rental_fee: selectedDoc.rental_fee,
              special_fee: selectedDoc.special_fee,
              fee_rule: selectedDoc.fee_rule
            };
            const breakdown = itemBreakdown(typeObj, { copies: selectedDoc.copies });
            return breakdown.length > 0 ? breakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between text-[11px] text-gray-600 dark:text-gray-300">
                <span>{item.label}</span>
                <span className="font-mono">{formatPeso(item.amount)}</span>
              </div>
            )) : null;
          })()}
        </div>
        <div className="flex justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
          <span>Amount</span>
          <span className="font-bold text-gray-950 dark:text-gray-100">{formatPeso(selectedDoc.amount)}</span>
        </div>
      </div>

      
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs p-3 rounded-lg font-semibold flex items-start gap-2 mb-4">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <p>
            Give the physical Official Receipt to the College Secretary. Finance can upload its retained copy later; the digital copy does not delay verification or release.
          </p>
        </div>

      <div className="space-y-4">
        <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest block">{methodName} Receipt / Proof</span>

        {/* Receipt Preview */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 h-64 relative flex items-center justify-center">
          {selectedDoc.receipt_image_path ? (
            <AuthedFilePreview
              path={selectedDoc.receipt_image_path}
              alt="Payment Receipt"
              iframeTitle="PDF Receipt"
              className="w-full h-full object-contain hover:scale-105 transition-transform"
              onClick={() => setViewImageUrl(selectedDoc.receipt_image_path)}
              wrapperClassName="cursor-zoom-in w-full h-full flex items-center justify-center"
            />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-400">No Image Uploaded</span>
          )}
        </div>

        <div className="text-center font-bold text-xs text-gray-800 dark:text-gray-100 py-2 border-b border-gray-100 dark:border-gray-700 mb-2">
          {referenceLabel}: <span className="font-mono text-gray-600 dark:text-gray-300 font-bold">{selectedDoc.gcash_reference_no || 'None'}</span>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="finance-verify-or-number" className="text-[10px] font-bold text-red-600 dark:text-red-300 uppercase tracking-widest flex items-center gap-1">
            Official Receipt Number <span className="text-red-500 dark:text-red-300">*</span>
          </label>
          <input
            id="finance-verify-or-number"
            type="text"
            value={orNumber}
            onChange={(e) => setOrNumber(e.target.value)}
            placeholder="e.g. OR-2026-00123"
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs font-bold font-mono focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-red-600 dark:text-red-300 uppercase tracking-widest flex items-center gap-1">
            Attach Official POS Receipt <span className="text-gray-400 dark:text-gray-400 font-normal normal-case">(Optional - upload later if deferred)</span>
          </label>
          <input
            type="file"
            accept="image/png, image/jpeg, image/webp, application/pdf"
            /* FIN-03: Deferred Upload */
            onChange={(e) => {
              const file = e.target.files[0];
              if (file && file.size > 5 * 1024 * 1024) {
                triggerNotification('File size exceeds 5MB limit.', 'error');
                e.target.value = '';
                setFinanceReceiptFile(null);
                return;
              }
              setFinanceReceiptFile(file);
            }}
            className="w-full bg-red-50/50 dark:bg-red-950/50 border border-red-100 dark:border-red-800 rounded-xl p-3 text-xs font-bold text-red-600 dark:text-red-300 file:mr-4 file:py-1.5 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-red-600 dark:file:bg-red-600 file:text-white hover:file:bg-red-700 dark:hover:file:bg-red-700 cursor-pointer transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-4">
        <label className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">Clerk Notes / Remarks</label>
        <textarea
          value={clerkNotes}
          onChange={(e) => setClerkNotes(e.target.value)}
          placeholder="Add notes (required for rejection)..."
          rows={2}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white dark:focus:bg-gray-900 outline-none transition-all resize-none"
        />
      </div>
      <div className="flex flex-col gap-1.5 mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
        <label className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest">Discussion</label>
        <DocumentChat documentId={selectedDoc.id} user={user} />
      </div>
    </ModalShell>
  );
}
