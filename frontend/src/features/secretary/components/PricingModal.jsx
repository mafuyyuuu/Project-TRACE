import FeeBreakdown from '@/components/FeeBreakdown';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import ModalShell from '@/components/ModalShell';
import { formatPeso } from '@/utils/pricing';

/**
 * The Secretary prices a printed document.
 *
 * The amount is calculated *after* printing, because that is when the page count
 * is known — which is the whole reason this pipeline collects money at the end
 * rather than the start.
 *
 * Every field here ends up on the audit trail with the clerk's name against it,
 * so the page count and note are not decoration: they are how an amount is
 * defended if a student disputes it.
 */
export default function PricingModal({
  selectedDoc,
  setActiveModal,
  handlePriceDocument,
  actionLoading,
  priceAmount,
  priceBreakdown, pricingError, priceNotes, setPriceNotes, confirmCurrentRates, setConfirmCurrentRates,
  pricePageCount,
  setPricePageCount,
  siblingsUnpriced,
}) {
  if (!selectedDoc) return null;

  return (
    <ModalShell
      open={!!selectedDoc}
      onClose={() => setActiveModal(null)}
      title="Set the Amount"
      maxWidth="max-w-lg"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => setActiveModal(null)}
            className="trace-button trace-button-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handlePriceDocument}
            disabled={actionLoading || !priceBreakdown || Number(priceAmount) <= 0 || (selectedDoc.pricing_requires_review && !confirmCurrentRates)}
            className="trace-button trace-button-primary flex-1"
          >
            {actionLoading ? 'Saving…' : siblingsUnpriced > 0 ? 'Save Price' : 'Save & Bill Student'}
          </button>
        </div>
      }
    >
      <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100 dark:border-gray-700">
        Price it from the printed output, then the student is told what to pay.
      </p>

      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 dark:text-gray-300 space-y-2">
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Student</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text break-words">{selectedDoc.student_name || selectedDoc.student_id}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Document</span><span className="font-bold text-gray-950 dark:text-gray-100">{selectedDoc.document_type}</span></div>
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1"><span>Tracking ID</span><span className="font-bold text-gray-950 dark:text-gray-100 select-text">#{selectedDoc.tracking_number}</span></div>
        
        <div className="flex justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-2">
          <span>Base rate</span>
          <span className="font-bold text-gray-500 dark:text-gray-400">{formatPeso(selectedDoc.pricing_schedule?.base_fee)}{selectedDoc.pricing_schedule?.fee_rule === 'per_semester_block' ? ' per printed page per copy' : ' per copy'}</span>
        </div>
      </div>

      {/* Only actual printed pages determine the page-based charge. */}
      <p className="text-[11px] text-gray-500 dark:text-gray-400 -mt-3 mb-6 leading-relaxed">
        Admin configures the rates. Enter the actual pages per copy; the server calculates the charge. Extra fees apply once per document type in this request.
      </p>

      <div className="space-y-5">
        <label className="trace-label block">
          <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest block mb-2">
            Amount to charge <span className="text-red-600 dark:text-red-300">*</span>
          </span>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 dark:text-gray-400">₱</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={priceAmount}
              readOnly aria-label="Calculated amount to charge"
              placeholder="0.00"
              className="trace-control w-full pl-9 pr-4"
            />
          </div>
        </label>

        <label className="trace-label block">
          <span className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-widest block mb-2">Pages printed per copy</span>
          <input
            type="number"
            min="1"
            value={pricePageCount}
            onChange={(e) => setPricePageCount(e.target.value)}
            placeholder="e.g. 8"
            className="trace-control w-full"
          />
        </label>

        

        {pricingError && <p role="status" className="text-xs text-amber-800 dark:text-amber-300">{pricingError}</p>}
        {priceBreakdown && <FeeBreakdown breakdown={priceBreakdown} />}
        <label className="trace-label block">Pricing note (optional)<textarea className="trace-control w-full" maxLength={Math.min(INPUT_LIMITS.notes, 1000)} value={priceNotes || ''} onChange={event => setPriceNotes(event.target.value)} /></label>
        {selectedDoc.pricing_requires_review && <label className="flex gap-2 text-xs text-amber-800 dark:text-amber-300">
          <input type="checkbox" checked={confirmCurrentRates} onChange={event => setConfirmCurrentRates(event.target.checked)} />
          This older request has no saved fee schedule. I reviewed the current rates shown above.
        </label>}
        {siblingsUnpriced > 0 ? (
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
            <p className="text-[11px] text-blue-900 dark:text-blue-300 leading-relaxed">
              <strong>{siblingsUnpriced} more document{siblingsUnpriced > 1 ? 's' : ''}</strong> in this
              request still {siblingsUnpriced > 1 ? 'need' : 'needs'} a price. The student is billed
              once, for everything together, so nothing is sent to them until the last one is done.
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-2xl p-4">
            <p className="text-[11px] text-emerald-900 dark:text-emerald-300 leading-relaxed">
              This is the last document in the request. Saving it bills the student, notifies
              Finance, and produces the payment slip.
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
