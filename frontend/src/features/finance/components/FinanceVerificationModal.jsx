import RequestStaff from '@/components/RequestStaff';
import Button from '@/components/Button';
import FeeBreakdown from '@/components/FeeBreakdown';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import FileUploadField from '@/components/FileUploadField';
import ReceiptPreviewModal from './ReceiptPreviewModal';
import useElapsedClock from '@/hooks/useElapsedClock';
import { receiptWindow } from '@/utils/receiptTiming';
import { receiptStudentName } from '@/utils/receiptStudentName';
import { useRef, useState } from 'react';
import useReceiptPack from '@/hooks/useReceiptPack';
import ReceiptPackControl from './ReceiptPackControl';
import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import { formatPeso } from '@/utils/pricing';

export default function FinanceVerificationModal({
  verifiedReceipt = null,
  setActiveModal,
  selectedDoc,
  setViewImageUrl,
  handleFinanceVerify,
  actionLoading,
  clerkNotes,
  setClerkNotes,
  paymentMethods = [],
}) {
  const [financeReceiptFile, setFinanceReceiptFile] = useState(null);
  // Preserve historical paper ORs. New receipts use the shared read-only pack serial.
  const [orNumber] = useState(selectedDoc?.or_number || '');
  const pack=useReceiptPack();
  const retryKey=useRef(crypto.randomUUID());
  const [uploadLater, setUploadLater] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const now = useElapsedClock();
  const payorName = receiptStudentName(selectedDoc);
  const deferred = !selectedDoc?.or_number && !verifiedReceipt && receiptWindow(new Date(now)).afterCutoff;

  if (!selectedDoc) return null;

  const managed = !selectedDoc.or_number && !verifiedReceipt && !deferred;
  const canVerify = !verifiedReceipt && (deferred || Boolean(selectedDoc.or_number) || Boolean(pack.state?.pack?.next_serial && payorName));
  // documents.payment_method defaults to 'gcash' for rows predating the
  // column — matching document.model.js's own default.
  const method = paymentMethods.find((m) => m.code === (selectedDoc.payment_method || 'gcash'));
  const methodName = method?.name || 'GCash';
  const referenceLabel = method?.reference_label || 'Reference Number';

  return (
    <>
    <ModalShell
      open={!!selectedDoc}
      onClose={() => setActiveModal(null)}
      title="Verification Details"
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button
            onClick={() => verifiedReceipt ? setActiveModal(null) : handleFinanceVerify('reject', null)}
            disabled={actionLoading}
            className="trace-button trace-button-danger w-full sm:w-1/2 text-center"
          >
            {verifiedReceipt ? 'Close' : 'Reject Payment'}
          </Button>
          <Button
            onClick={() => handleFinanceVerify('approve', deferred || uploadLater ? null : financeReceiptFile, deferred || managed ? '' : orNumber.trim(), { deferred, uploadLater, usePack:managed, expected_pack_id:managed?pack.state?.pack?.id:undefined,expected_serial:managed?pack.state?.pack?.next_serial:undefined,client_key:retryKey.current, refreshPack:pack.refresh })}
            disabled={actionLoading || !canVerify}
            className="trace-button trace-button-primary w-full sm:flex-1"
          >
            {verifiedReceipt ? 'Payment Verified' : 'Verify Payment'}
          </Button>
        </div>
      }
    >
      <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100 dark:border-gray-700">Review and verify the student's payment receipt.</p>

      {/* Gray detail panel */}
      <RequestStaff document={selectedDoc} />
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 my-4 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-2">
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Name</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{selectedDoc.student_name || 'Unknown'}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Program/Course for OR</span><span className="font-bold select-text break-words">{selectedDoc.program || 'Not entered'}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Document Type</span><span className="font-bold text-gray-950 dark:text-gray-100">{selectedDoc.document_type}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Tracking ID</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Date Paid</span><span className="font-bold text-gray-950 dark:text-gray-100">{new Date(selectedDoc.updated_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} at {new Date(selectedDoc.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
        
        {/* Itemization */}
        <div className="border-t border-gray-200/50 dark:border-gray-700/50 pt-3 mt-1 space-y-1">
          <FeeBreakdown breakdown={selectedDoc.fee_breakdown} amount={selectedDoc.amount} />
        </div>
        <div className="flex justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
          <span>Amount</span>
          <span className="font-bold text-gray-950 dark:text-gray-100">{formatPeso(selectedDoc.amount)}</span>
        </div>
      </div>

      
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs p-3 rounded-lg font-semibold flex items-start gap-2 mb-4">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <p>
            Choose Later to upload the physical Official Receipt copy afterward. Its number is still issued when payment is verified. At or after 4:00 PM Manila time, new OR issuance remains pending until an eligible date; this is separate from uploading a copy.
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
              className="w-full h-full object-contain"
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


        {!verifiedReceipt && <label className="flex items-start gap-3 text-sm font-semibold">
          <input type="checkbox" checked={uploadLater} disabled={actionLoading} onChange={event => setUploadLater(event.target.checked)} className="trace-choice mt-1 shrink-0" />
          Later — upload the physical OR copy later
        </label>}
        {deferred && <p role="status" className="text-sm text-amber-800 dark:text-amber-300">The 4 PM Manila issuance cutoff has passed. Payment can be cleared now; its OR must be issued on a later eligible date. No number will be consumed by this verification.</p>}
        {verifiedReceipt || selectedDoc.or_number ? <div className="space-y-2">
          <label className="trace-label block" htmlFor="finance-verify-or-number">Recorded Official Receipt Number</label>
          <div className="flex flex-wrap items-center gap-2">
            <input id="finance-verify-or-number" readOnly value={verifiedReceipt?.serial || orNumber} className="trace-control min-w-0 flex-1 font-mono" />
            <Button type="button" disabled={!verifiedReceipt || !pack.state} title={!verifiedReceipt ? 'Printing is available for receipts saved through TRACE.' : undefined} onClick={() => setPrintOpen(true)} className="trace-button trace-button-secondary">Print</Button>
          </div>
          {verifiedReceipt && <p role="status" className="text-sm">Payment verified. This saved number is ready to print; printing does not use another number.</p>}
        </div> : <div className="space-y-3">
          <ReceiptPackControl packState={pack.state} onChanged={pack.refresh} printControl={<Button type="button" disabled title="Verify payment to save this receipt before printing." className="trace-button trace-button-secondary">Print</Button>} />
          <p className="text-xs">The next number updates automatically after issuance. Save the receipt by verifying payment, then print beside its recorded number.</p>
        </div>}
        {pack.error && <p role="alert" className="trace-inline-error">{pack.error}</p>}
        <p className="text-sm select-text"><span className="font-semibold">Student / Payor:</span> {verifiedReceipt?.snapshot.payor_name || payorName || 'Student name not recorded'}</p>
        <div className="flex flex-col gap-2">
          <FileUploadField label="Official Receipt copy (optional)" file={financeReceiptFile} path={verifiedReceipt?.copy_path || selectedDoc.official_receipt_path} onChange={setFinanceReceiptFile} disabled={actionLoading || uploadLater || deferred || Boolean(verifiedReceipt)} maxBytes={5 * 1024 * 1024} />
          <p className="text-xs">Upload now, or choose Later and use Upload OR in Payment History. Missing a digital copy does not remove the recorded OR number.</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 mt-4">
        <label className="trace-label">Clerk Notes / Remarks</label>
        <textarea maxLength={INPUT_LIMITS.notes}
          disabled={actionLoading || Boolean(verifiedReceipt)}
          value={clerkNotes}
          onChange={(e) => setClerkNotes(e.target.value)}
          placeholder="Add notes (required for rejection)..."
          rows={2}
          className="trace-control w-full resize-none"
        />
      </div>
    </ModalShell>
    {printOpen && verifiedReceipt && pack.state && <ReceiptPreviewModal receipt={verifiedReceipt} config={pack.state.print_config} onClose={() => setPrintOpen(false)} />}
    </>
  );
}
