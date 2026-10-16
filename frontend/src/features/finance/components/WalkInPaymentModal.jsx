import { useRef } from 'react';
import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import FileUploadField from '@/components/FileUploadField';
import ModalShell from '@/components/ModalShell';
import { formatPeso } from '@/utils/pricing';
import FinanceIcon from './FinanceIcon';
import FinanceCard from './FinanceCard';

/** Counter logging stages a payment for the existing separate verification step. */
export default function WalkInPaymentModal({ selectedDoc, groupDocs, setActiveModal, handleLogWalkIn, handleScanReceipt, actionLoading, scanning, scanConfidence, counterDeferred = false, setCounterDeferred, orNumber, setOrNumber, orDate, setOrDate, orFile, setOrFile, clerkNotes, setClerkNotes }) {
  const cancel = useRef(null);
  if (!selectedDoc) return null;
  const items = groupDocs?.length ? groupDocs : [selectedDoc];
  const total = items.reduce((sum,row)=>sum+(Number(row.amount)||0),0);
  const busy = actionLoading || scanning;
  const close = ()=>{if(!busy)setActiveModal(null);};
  return <ModalShell open onClose={close} busy={busy} initialFocusRef={cancel} title="Log Counter Payment" subtitle="Record a payment the student made at the cashier." closeButtonIcon={<FinanceIcon name="04f2e" />} panelClassName="trace-modal-panel trace-secretary-dialog trace-finance-dialog trace-finance-counter max-w-[560px]" footer={<div className="trace-actions justify-end"><Button ref={cancel} type="button" disabled={busy} onClick={close} className="trace-button trace-button-secondary">Cancel</Button><Button type="button" onClick={handleLogWalkIn} disabled={busy} className="trace-button trace-button-primary"><FinanceIcon name="ba71f" />{actionLoading?'Saving…':'Record Payment'}</Button></div>}>
    <div className="space-y-[18px]">
      <label className="trace-finance-notice"><input type="checkbox" checked={counterDeferred} disabled={busy} onChange={event=>setCounterDeferred?.(event.target.checked)} className="trace-choice shrink-0" /><span><strong>Later — record the counter payment with OR issuance pending.</strong><span className="block mt-1 text-[.8125rem] text-[#647084] dark:text-gray-400">Required for new ORs at or after 4:00 PM Manila time.</span></span></label>
      {!counterDeferred && <p className="trace-admin-caption">Historical paper receipt entry only. New managed receipts are numbered when Finance verifies this payment; leave Later selected for that workflow.</p>}
      <FinanceCard title="Payment details" className="trace-finance-payment-details"><dl><div><dt>Student</dt><dd>{selectedDoc.student_name || selectedDoc.student_id}</dd></div><div><dt>Tracking ID</dt><dd className="font-mono">#{selectedDoc.tracking_number || selectedDoc.id}</dd></div>{items.map(row=><div key={row.id}><dt>{row.document_type}</dt><dd className="font-mono">{formatPeso(row.amount)}</dd></div>)}<div className="trace-finance-billed"><dt>Amount billed</dt><dd>{formatPeso(total)}</dd></div></dl></FinanceCard>
      <FinanceCard title="Official Receipt copy" badge={<span className="trace-finance-optional">Optional</span>}><div className="trace-finance-upload-and-read"><FileUploadField label="Official Receipt copy · optional" pickerIcon={<FinanceIcon name="27353" />} showLabel={false} file={orFile} onChange={setOrFile} disabled={counterDeferred || busy} maxBytes={5*1024*1024} /><Button type="button" onClick={()=>handleScanReceipt(orFile)} disabled={counterDeferred || !orFile || busy} className="trace-button trace-button-secondary"><FinanceIcon name="f2885" />{scanning?'Reading receipt…':'Read Receipt'}</Button></div><p className="trace-admin-caption mt-2">Upload a copy, then use Read Receipt to fill in the details.</p></FinanceCard>
      {scanConfidence != null && <p role="status" className="trace-finance-notice">{scanConfidence<100?`The scan only read ${Math.round(scanConfidence)}% of the expected fields. Fill in the rest and check what it did read.`:'The scan read every field. Check each one against the paper receipt before saving.'}</p>}
      <div className="trace-finance-counter-fields"><label className="trace-label">Official Receipt No. {!counterDeferred && <span className="text-red-600 dark:text-red-300">*</span>}<input maxLength={INPUT_LIMITS.receiptNumber} disabled={counterDeferred || busy} value={orNumber} onChange={event=>setOrNumber(event.target.value)} placeholder="e.g. 2026-0042" className="trace-control block w-full font-mono" /></label><label className="trace-label">Receipt date<input type="date" disabled={counterDeferred || busy} value={orDate} onChange={event=>setOrDate(event.target.value)} className="trace-control block w-full" /></label></div>
      <label className="trace-label block">Notes<textarea maxLength={INPUT_LIMITS.notes} rows={3} disabled={busy} value={clerkNotes} onChange={event=>setClerkNotes(event.target.value)} placeholder="Anything worth recording about this payment." className="trace-control w-full" /></label>
      <p className="trace-admin-caption">Saving records the payment and moves the request into your verification queue. It does not release the document — verify it there as you would an online payment.</p>
    </div>
  </ModalShell>;
}
