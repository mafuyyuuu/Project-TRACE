import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import { formatPeso } from '@/utils/pricing';
import { useState } from 'react';

export default function ReceiptVerificationModal({
  selectedDoc,
  setActiveModal,
  setViewImageUrl,
  handleSecretaryVerifyReceipt,
  actionLoading,
}) {
  const [physicalReceiptChecked, setPhysicalReceiptChecked] = useState(false);
  const [receiptId, setReceiptId] = useState(null);
  if (receiptId !== (selectedDoc?.id ?? null)) {
    setReceiptId(selectedDoc?.id ?? null);
    setPhysicalReceiptChecked(false);
  }
  if (!selectedDoc) return null;
  const canConfirm = Boolean(selectedDoc.or_number?.trim()) &&
    (Boolean(selectedDoc.official_receipt_path) || physicalReceiptChecked);
  const close = () => {
    setPhysicalReceiptChecked(false);
    setActiveModal(null);
  };

  return (
    <ModalShell
      open={!!selectedDoc}
      onClose={close}
      busy={actionLoading}
      closeOnEsc={!actionLoading}
      closeOnBackdrop={!actionLoading}
      showCloseButton={!actionLoading}
      bare
      title="Verify Official Receipt"
      panelClassName="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] z-10 border border-gray-100 dark:border-gray-700 relative flex flex-col lg:flex-row overflow-hidden"
      closeButtonClassName="trace-button-lift absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 z-20"
    >
      <div className="shrink-0 lg:shrink lg:w-1/2 p-6 flex flex-col border-r border-gray-200 dark:border-gray-700 min-h-0 bg-gray-50/30 dark:bg-gray-800/30">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-black text-gray-800 dark:text-gray-100">Finance Attachment</span>
        </div>
        <div className="flex-1 min-h-20 lg:min-h-0 bg-gray-200 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner">
          {selectedDoc.official_receipt_path ? (
            <AuthedFilePreview
              path={selectedDoc.official_receipt_path}
              alt="Official Receipt"
              iframeTitle="Official Receipt"
              className="w-full h-full object-contain hover:scale-105 motion-reduce:transform-none transition-transform"
              onClick={() => setViewImageUrl(selectedDoc.official_receipt_path)}
              wrapperClassName="cursor-zoom-in w-full h-full flex items-center justify-center group relative"
            />
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-400 px-6 text-center">
              Digital copy pending upload. Check the physical OR handed over by Finance.
            </span>
          )}
        </div>
      </div>

      <div className="lg:w-1/2 min-h-0 flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">Verify Official Receipt</h3>
          <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100 dark:border-gray-700">
            Check the receipt before handing {selectedDoc.document_type} off to Window 1.
          </p>

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-2">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Tracking ID</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Student</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{selectedDoc.student_name || '—'}</span></div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Document Type</span><span className="font-bold text-gray-950 dark:text-gray-100">{selectedDoc.document_type}</span></div>
            <div className="flex justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-2"><span>Amount</span><span className="font-bold text-gray-950 dark:text-gray-100">{formatPeso(selectedDoc.amount)}</span></div>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest block mb-1">Official Receipt Number</span>
              <span className="text-xl font-mono font-black text-[#15803d] dark:text-green-300">
                {selectedDoc.or_number || 'None'}
              </span>
            </div>
            
            {!selectedDoc.or_number && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mt-4">
                <p className="text-[11px] text-amber-900 dark:text-amber-300 font-semibold leading-relaxed">
                  Ask Finance to record the OR number before verifying this receipt.
                </p>
              </div>
            )}
            {!selectedDoc.official_receipt_path && (
              <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={physicalReceiptChecked}
                  onChange={(e) => setPhysicalReceiptChecked(e.target.checked)}
                  disabled={actionLoading} className="trace-choice mt-0.5 shrink-0 accent-[#15803d]" />
                I inspected the physical Official Receipt from Finance and its number matches this request.
              </label>
            )}
          </div>
        </div>

        <div className="shrink-0 px-6 sm:px-8 py-6 border-t border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <Button
            onClick={close}
            disabled={actionLoading}
            className="trace-button trace-button-secondary w-1/3 text-center"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleSecretaryVerifyReceipt('confirm', { physicalReceiptChecked })}
            disabled={actionLoading || !canConfirm}
            className="trace-button trace-button-primary w-2/3 text-center"
          >
            Confirm Receipt
          </Button>
        </div>
      </div>
    </ModalShell>
  );
}
