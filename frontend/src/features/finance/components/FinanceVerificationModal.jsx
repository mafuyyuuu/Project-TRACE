import FinanceIcon, { FinanceHeaderIcon } from './FinanceIcon';
import FinanceCard from './FinanceCard';
import { SecretaryAvatar } from '@/features/secretary/components/SecretaryCaseSummary';
import { formatDateTime } from '@/utils/formatters';
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

  const close = () => { if (!actionLoading) setActiveModal(null); };
  return <>
    <ModalShell open onClose={close} busy={actionLoading} title="Verification Details" subtitle="Review and verify the student's payment receipt." headerIcon={<FinanceHeaderIcon name="fe5ea" />} headerBadge={<span className="trace-finance-stage"><FinanceIcon name="6c111" />Finance Verification</span>} closeButtonIcon={<FinanceIcon name="b80f9" />} panelClassName="trace-modal-panel trace-secretary-dialog trace-finance-dialog trace-finance-verification max-w-[1120px]" footer={<div className="trace-secretary-modal-actions"><p className="trace-secretary-footer-note"><FinanceIcon name="f4fe6" />{verifiedReceipt ? 'Payment verified. Its saved OR is ready to print.' : deferred ? 'Verifying clears payment; OR issuance stays pending. Rejecting requires a note.' : selectedDoc.or_number ? 'Verifying preserves the recorded OR number. Rejecting requires a note.' : 'Verifying issues the OR number. Rejecting requires a note.'}</p><div className="trace-actions"><Button type="button" onClick={()=>verifiedReceipt?close():handleFinanceVerify('reject',null)} disabled={actionLoading} className="trace-button trace-button-danger">{!verifiedReceipt && <FinanceIcon name="4929b" />}{verifiedReceipt?'Close':'Reject Payment'}</Button><Button type="button" onClick={()=>handleFinanceVerify('approve',deferred||uploadLater?null:financeReceiptFile,deferred||managed?'':orNumber.trim(),{deferred,uploadLater,usePack:managed,expected_pack_id:managed?pack.state?.pack?.id:undefined,expected_serial:managed?pack.state?.pack?.next_serial:undefined,client_key:retryKey.current,refreshPack:pack.refresh})} disabled={actionLoading || !canVerify} className="trace-button trace-button-primary"><FinanceIcon name="11669" />{verifiedReceipt?'Payment Verified':'Verify Payment'}</Button></div></div>}>
      <div className="trace-finance-verification-columns"><div className="space-y-[18px]">
        <FinanceCard title="Payment summary"><div className="trace-finance-student"><SecretaryAvatar name={selectedDoc.student_name} /><div><strong>{selectedDoc.student_name || 'Unknown'}</strong><p className="font-mono text-[.75rem]">{selectedDoc.student_id || 'Not recorded'}</p></div><span className="trace-finance-tracking">#{selectedDoc.tracking_number || selectedDoc.id}</span></div><div className="trace-finance-amount-summary"><span><span className="trace-admin-caption block uppercase">Amount</span><strong>{formatPeso(selectedDoc.amount)}</strong></span><span className="trace-finance-channel">Paid via {selectedDoc.payment_channel==='walk_in'?'Counter':'Online'}</span></div><dl className="trace-finance-summary-rows"><div><dt>Document type</dt><dd>{selectedDoc.document_type}</dd></div><div><dt>Date paid</dt><dd>{selectedDoc.updated_at?formatDateTime(selectedDoc.updated_at):'Not recorded'}</dd></div><div><dt>Program/Course for OR</dt><dd>{selectedDoc.program || 'Not entered'}</dd></div></dl><RequestStaff assignmentOnly document={selectedDoc} /><FeeBreakdown breakdown={selectedDoc.fee_breakdown} amount={selectedDoc.amount} /></FinanceCard>
        <FinanceCard title={methodName+' receipt / proof'} badge={<span className="trace-finance-optional">Student upload</span>}><div className="trace-finance-proof">{selectedDoc.receipt_image_path?<><AuthedFilePreview path={selectedDoc.receipt_image_path} alt="Payment Receipt" iframeTitle="PDF Receipt" className="max-w-full max-h-full object-contain" onClick={()=>setViewImageUrl(selectedDoc.receipt_image_path)} wrapperClassName="cursor-zoom-in w-full h-full flex items-center justify-center" /><Button type="button" onClick={()=>setViewImageUrl(selectedDoc.receipt_image_path)} className="trace-finance-enlarge"><FinanceIcon name="478ec" />Click to enlarge</Button></>:<span className="trace-admin-caption">No Image Uploaded</span>}</div><p className="trace-finance-reference"><span>{referenceLabel}</span><strong>{selectedDoc.gcash_reference_no || 'None'}</strong></p></FinanceCard>
      </div><div className="space-y-[18px]">
        <FinanceCard title="Official Receipt issuance">
          {verifiedReceipt || selectedDoc.or_number ? <div className="space-y-2"><label className="trace-label block" htmlFor="finance-verify-or-number">Recorded Official Receipt Number</label><div className="trace-actions"><input id="finance-verify-or-number" readOnly value={verifiedReceipt?.serial || orNumber} className="trace-control min-w-0 flex-1 font-mono" /><Button type="button" disabled={!verifiedReceipt || !pack.state} title={!verifiedReceipt?'Printing is available for receipts saved through TRACE.':undefined} onClick={()=>setPrintOpen(true)} className="trace-button trace-button-secondary"><FinanceIcon name="a66b0" />Print</Button></div>{verifiedReceipt && <p role="status" className="trace-admin-caption">Payment verified. This saved number is ready to print; printing does not use another number.</p>}</div>:<><ReceiptPackControl packState={pack.state} onChanged={pack.refresh} printControl={<Button type="button" disabled title="Verify payment to save this receipt before printing." className="trace-button trace-button-secondary"><FinanceIcon name="a66b0" />Print</Button>} /><p role="status" className="trace-finance-muted-notice"><FinanceIcon name="41802" /><span>Print becomes available after you confirm Verify Payment. Setting up the paper pack only reserves numbers; it does not issue this payment’s receipt.</span></p></>}
          {pack.error && <p role="alert" className="trace-inline-error">{pack.error}</p>}<p className="trace-admin-caption mt-3 select-text">Student / Payor: <strong className="text-gray-900 dark:text-gray-100">{verifiedReceipt?.snapshot.payor_name || payorName || 'Student name not recorded'}</strong></p>
        </FinanceCard>
        <FinanceCard title="Official Receipt copy (optional)">
          {!verifiedReceipt && <label className="mb-3 flex items-start gap-3 text-[.8125rem] font-semibold"><input type="checkbox" checked={uploadLater} disabled={actionLoading} onChange={event=>setUploadLater(event.target.checked)} className="trace-choice shrink-0" />Later — upload the physical OR copy later</label>}
          <p className="trace-finance-warning"><FinanceIcon name="2d3fe" /><span>Choose Later to upload the physical Official Receipt copy afterward. Its number is still issued when payment is verified. At or after 4:00 PM Manila time, new OR issuance remains pending until an eligible date; this is separate from uploading a copy.</span></p>
          {deferred && <p role="status" className="trace-finance-warning mt-3">The 4 PM Manila issuance cutoff has passed. Payment can be cleared now; its OR must be issued on a later eligible date. No number will be consumed by this verification.</p>}
          <div className="mt-3"><FileUploadField label="Official Receipt copy (optional)" pickerIcon={<FinanceIcon name="4030d" />} showLabel={false} file={financeReceiptFile} path={verifiedReceipt?.copy_path || selectedDoc.official_receipt_path} onChange={setFinanceReceiptFile} disabled={actionLoading || uploadLater || deferred || Boolean(verifiedReceipt)} maxBytes={5*1024*1024} /></div><p className="trace-admin-caption mt-2">Upload now, or choose Later and use Upload OR in Payment History. Missing a digital copy does not remove the recorded OR number.</p>
        </FinanceCard>
        <FinanceCard title="Clerk notes / remarks" badge={<span className="trace-finance-required"><FinanceIcon name="cb887" />Required when rejecting a payment</span>}><label className="sr-only" htmlFor="finance-clerk-notes">Clerk Notes / Remarks</label><textarea id="finance-clerk-notes" maxLength={INPUT_LIMITS.notes} disabled={actionLoading || Boolean(verifiedReceipt)} value={clerkNotes} onChange={event=>setClerkNotes(event.target.value)} placeholder="Add notes (required for rejection)..." rows={3} className="trace-control w-full" /></FinanceCard>
      </div></div>
    </ModalShell>
    {printOpen && verifiedReceipt && pack.state && <ReceiptPreviewModal receipt={verifiedReceipt} config={pack.state.print_config} onClose={()=>setPrintOpen(false)} />}
  </>;
}
