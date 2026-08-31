import { createPortal } from 'react-dom';
import { formatPeso } from '@/utils/pricing';

/**
 * Logging a payment a student made at the counter.
 *
 * A walk-in pays cash against the slip the Secretary printed, so nothing about
 * it reaches the system on its own — the Official Receipt is the only record
 * that the money changed hands. That is why the OR number is required here and
 * absent from the online path.
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
  orNumber,
  setOrNumber,
  orDate,
  setOrDate,
  orFile,
  clerkNotes,
  setClerkNotes,
}) {
  if (!selectedDoc) return null;

  const items = groupDocs?.length ? groupDocs : [selectedDoc];
  const total = items.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
  const lowConfidence = scanConfidence != null && scanConfidence < 100;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 z-10 border border-gray-100 relative">
        <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>

        <h3 className="text-xl font-black text-gray-900">Log Counter Payment</h3>
        <p className="text-xs text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100">
          Record a payment the student made at the cashier.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 space-y-2">
          <div className="flex justify-between"><span>Student</span><span className="font-bold text-gray-950">{selectedDoc.student_name || selectedDoc.student_id}</span></div>
          <div className="flex justify-between"><span>Tracking ID</span><span className="font-bold text-gray-950">#{selectedDoc.tracking_number}</span></div>
          {items.map((d) => (
            <div key={d.id} className="flex justify-between">
              <span className="text-gray-500">{d.document_type}</span>
              <span className="text-gray-700">{formatPeso(d.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-gray-200/50 pt-2">
            <span className="font-bold">Amount billed</span>
            <span className="font-bold text-gray-950">{formatPeso(total)}</span>
          </div>
        </div>

        <div className="space-y-5">
          <label className="block">
            <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">
              Scan the Official Receipt <span className="text-gray-400 normal-case font-semibold">· optional</span>
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              disabled={scanning}
              onChange={(e) => handleScanReceipt(e.target.files?.[0] || null)}
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
            />
            {scanning && <span className="text-[11px] text-gray-500 font-semibold mt-2 block">Reading receipt…</span>}
            {!scanning && orFile && (
              <span className="text-[11px] text-[#15803d] font-semibold mt-2 block">Attached: {orFile.name}</span>
            )}
          </label>

          {scanConfidence != null && (
            <div className={`rounded-2xl p-4 border ${lowConfidence ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
              <p className={`text-[11px] leading-relaxed ${lowConfidence ? 'text-amber-900' : 'text-blue-900'}`}>
                {lowConfidence
                  ? `The scan only read ${Math.round(scanConfidence)}% of the expected fields. Fill in the rest and check what it did read.`
                  : 'The scan read every field. Check each one against the paper receipt before saving.'}
              </p>
            </div>
          )}

          <label className="block">
            <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">
              Official Receipt No. <span className="text-red-600">*</span>
            </span>
            <input
              type="text"
              value={orNumber}
              onChange={(e) => setOrNumber(e.target.value)}
              placeholder="e.g. 2026-0042"
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#15803d]/30"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">Receipt date</span>
            <input
              type="date"
              value={orDate}
              onChange={(e) => setOrDate(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#15803d]/30"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">Notes</span>
            <textarea
              rows={2}
              value={clerkNotes}
              onChange={(e) => setClerkNotes(e.target.value)}
              placeholder="Anything worth recording about this payment."
              className="w-full rounded-2xl border border-gray-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#15803d]/30"
            />
          </label>

          {/* Logging is not clearing: a counter payment is held to the same
              standard as an online one, and still has to be verified. */}
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Saving records the payment and moves the request into your verification queue. It does
            not release the document — verify it there as you would an online payment.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => setActiveModal(null)}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLogWalkIn}
            disabled={actionLoading || scanning}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Saving…' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
