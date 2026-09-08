import ModalShell from '@/components/ModalShell';
import { formatPeso } from '@/utils/pricing';

/**
 * The Secretary prices a printed document.
 *
 * The amount is entered *after* printing, because that is when the page count
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
  setPriceAmount,
  pricePageCount,
  setPricePageCount,
  priceNotes,
  setPriceNotes,
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
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePriceDocument}
            disabled={actionLoading}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Saving…' : siblingsUnpriced > 0 ? 'Save Price' : 'Save & Bill Student'}
          </button>
        </div>
      }
    >
      <p className="text-xs text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100">
        Price it from the printed output, then the student is told what to pay.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 space-y-2">
        <div className="flex justify-between"><span>Student</span><span className="font-bold text-gray-950">{selectedDoc.student_name || selectedDoc.student_id}</span></div>
        <div className="flex justify-between"><span>Document</span><span className="font-bold text-gray-950">{selectedDoc.document_type}</span></div>
        <div className="flex justify-between"><span>Tracking ID</span><span className="font-bold text-gray-950 select-text">#{selectedDoc.tracking_number}</span></div>
        <div className="flex justify-between"><span>Copies</span><span className="font-bold text-gray-950">{selectedDoc.copies || 1}</span></div>
        <div className="flex justify-between border-t border-gray-200/50 pt-2">
          <span>System estimate</span>
          <span className="font-bold text-gray-500">{formatPeso(selectedDoc.amount)}</span>
        </div>
      </div>

      {/* The estimate is a starting point from the fee table, not the charge. */}
      <p className="text-[11px] text-gray-500 -mt-3 mb-6 leading-relaxed">
        The estimate comes from the standard fee table. Override it with what this document
        actually costs under your office's policy.
      </p>

      <div className="space-y-5">
        <label className="block">
          <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">
            Amount to charge <span className="text-red-600">*</span>
          </span>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">₱</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-2xl border border-gray-200 pl-9 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#15803d]/30"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">Pages printed</span>
          <input
            type="number"
            min="1"
            value={pricePageCount}
            onChange={(e) => setPricePageCount(e.target.value)}
            placeholder="e.g. 8"
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803d]/30"
          />
        </label>

        <label className="block">
          <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">
            How the amount was worked out
          </span>
          <textarea
            rows={3}
            value={priceNotes}
            onChange={(e) => setPriceNotes(e.target.value)}
            placeholder="e.g. 8 pages across 2 semester blocks at the standard rate."
            className="w-full rounded-2xl border border-gray-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#15803d]/30"
          />
        </label>

        {siblingsUnpriced > 0 ? (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-[11px] text-blue-900 leading-relaxed">
              <strong>{siblingsUnpriced} more document{siblingsUnpriced > 1 ? 's' : ''}</strong> in this
              request still {siblingsUnpriced > 1 ? 'need' : 'needs'} a price. The student is billed
              once, for everything together, so nothing is sent to them until the last one is done.
            </p>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              This is the last document in the request. Saving it bills the student, notifies
              Finance, and produces the payment slip.
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
