import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import FileUploadField from '@/components/FileUploadField';
import ModalShell from '@/components/ModalShell';
import { formatPeso } from '@/utils/pricing';

/**
 * Logging a payment a student made at the counter.
 *
 * A walk-in pays cash against the slip the Secretary printed, so nothing about
 * it reaches the system on its own. Finance records the payment and can defer
 * issuing its Official Receipt; verification remains a separate step.
 *
 * The scan is an aid, never an authority: OCR fills the fields, the clerk
 * confirms them, and only then is anything recorded. A misread amount here
 * would be a money error, which is exactly the mistake worth making a human
 * check for.
 */
export default function WalkInPaymentModal({
  selectedDoc,
  groupDocs,
  setActiveModal,
  handleLogWalkIn,
  handleScanReceipt,
  actionLoading,
  scanning,
  scanConfidence,
  counterDeferred = false, setCounterDeferred,
  orNumber,
  setOrNumber,
  orDate,
  setOrDate,
  orFile,
  setOrFile,
  clerkNotes,
  setClerkNotes,
}) {
  if (!selectedDoc) return null;

  const items = groupDocs?.length ? groupDocs : [selectedDoc];
  const total = items.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const lowConfidence = scanConfidence != null && scanConfidence < 100;

  return (
    <ModalShell
      open={!!selectedDoc}
      onClose={() => setActiveModal(null)}
      title="Log Counter Payment"
      maxWidth="max-w-lg"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => setActiveModal(null)}
            className="trace-button trace-button-secondary flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleLogWalkIn}
            disabled={actionLoading || scanning}
            className="trace-button trace-button-primary flex-1"
          >
            {actionLoading ? 'Saving…' : 'Record Payment'}
          </Button>
        </div>
      }
    >
      <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100 dark:border-gray-700">
        Record a payment the student made at the cashier.
      </p>

      <label className="flex items-start gap-3 text-sm mb-4">
        <input type="checkbox" checked={counterDeferred} disabled={scanning || actionLoading} onChange={e => setCounterDeferred?.(e.target.checked)} className="trace-choice mt-1 shrink-0" />
        Later — record the counter payment with OR issuance pending. Required for new ORs at or after 4:00 PM Manila time.
      </label>
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-2">
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Student</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{selectedDoc.student_name || selectedDoc.student_id}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Tracking ID</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text">#{selectedDoc.tracking_number}</span></div>
        {items.map((d) => (
          <div key={d.id} className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">{d.document_type}</span>
            <span className="text-gray-700 dark:text-gray-300">{formatPeso(d.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
          <span className="font-bold">Amount billed</span>
          <span className="font-bold text-gray-950 dark:text-gray-100">{formatPeso(total)}</span>
        </div>
      </div>

      <div className="space-y-5">
        <FileUploadField label="Official Receipt copy · optional" file={orFile} onChange={setOrFile} disabled={counterDeferred || scanning || actionLoading} maxBytes={5 * 1024 * 1024} />
        <Button type="button" onClick={() => handleScanReceipt(orFile)} disabled={counterDeferred || !orFile || scanning || actionLoading}
          className="trace-button trace-button-secondary">
          {scanning ? 'Reading receipt…' : 'Read Receipt'}
        </Button>

        {scanConfidence != null && (
          <div className={`rounded-2xl p-4 border ${lowConfidence ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-800'}`}>
            <p className={`text-[11px] leading-relaxed ${lowConfidence ? 'text-amber-900 dark:text-amber-300' : 'text-blue-900 dark:text-blue-300'}`}>
              {lowConfidence
                ? `The scan only read ${Math.round(scanConfidence)}% of the expected fields. Fill in the rest and check what it did read.`
                : 'The scan read every field. Check each one against the paper receipt before saving.'}
            </p>
          </div>
        )}

        <label className="trace-label block">
          <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest block mb-2">
            Official Receipt No. <span className="text-red-600 dark:text-red-300">*</span>
          </span>
          <input maxLength={INPUT_LIMITS.receiptNumber}
            type="text"
            disabled={counterDeferred} value={orNumber}
            onChange={(e) => setOrNumber(e.target.value)}
            placeholder="e.g. 2026-0042"
            className="trace-control w-full font-mono"
          />
        </label>

        <label className="trace-label block">
          <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest block mb-2">Receipt date</span>
          <input
            type="date"
            disabled={counterDeferred} value={orDate}
            onChange={(e) => setOrDate(e.target.value)}
            className="trace-control w-full"
          />
        </label>

        <label className="trace-label block">
          <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest block mb-2">Notes</span>
          <textarea maxLength={INPUT_LIMITS.notes}
            rows={2}
            value={clerkNotes}
            onChange={(e) => setClerkNotes(e.target.value)}
            placeholder="Anything worth recording about this payment."
            className="trace-control w-full"
          />
        </label>

        {/* Logging is not clearing: a counter payment is held to the same
            standard as an online one, and still has to be verified. */}
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
          Saving records the payment and moves the request into your verification queue. It does
          not release the document — verify it there as you would an online payment.
        </p>
      </div>
    </ModalShell>
  );
}
