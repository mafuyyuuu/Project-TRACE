import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import { requiresAttachment, getAttachmentHelper } from '@/utils/documentStatus';
import { formatPeso } from '@/utils/pricing';

/**
 * Window 1's intake check: the first human look at a request.
 *
 * The clerk confirms the paperwork is there and readable, attaching a scan if
 * the student brought paper to the counter, then routes it to the College
 * Secretary — or hands it back with a note saying what to fix.
 */
export default function IntakeReviewModal({
  selectedDoc,
  setActiveModal,
  setViewImageUrl,
  handleIntake,
  actionLoading,
  intakeNotes,
  setIntakeNotes,
  intakeFile,
  setIntakeFile,
}) {
  if (!selectedDoc) return null;

  const needsPaper = requiresAttachment(selectedDoc.document_type);
  const hasAttachment = Boolean(selectedDoc.file_path) || Boolean(intakeFile);
  // The requirement is real, but it is satisfied here rather than at submission:
  // a walk-in student files at the counter with paper in hand and no upload.
  const missingRequired = needsPaper && !hasAttachment;

  return (
    <ModalShell
      open={!!selectedDoc}
      onClose={() => setActiveModal(null)}
      title="Intake Check"
      maxWidth="max-w-xl"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleIntake('return')}
            disabled={actionLoading}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Return to Student
          </button>
          <button
            onClick={() => handleIntake('approve')}
            disabled={actionLoading}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Routing…' : 'Route to Secretary'}
          </button>
        </div>
      }
    >
      <p className="text-xs text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100">
        Confirm the paperwork, then route to the College Secretary.
      </p>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 my-4 font-mono text-[11px] text-gray-600 space-y-2">
        <div className="flex justify-between"><span>Name</span><span className="font-bold text-gray-950">{selectedDoc.student_name || 'Unknown'}</span></div>
        <div className="flex justify-between"><span>Student ID</span><span className="font-bold text-gray-950">{selectedDoc.student_id || '—'}</span></div>
        <div className="flex justify-between"><span>Document Type</span><span className="font-bold text-gray-950">{selectedDoc.document_type}</span></div>
        <div className="flex justify-between"><span>Tracking ID</span><span className="font-bold text-gray-950 select-text">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
        <div className="flex justify-between border-t border-gray-200/50 pt-2">
          <span>Estimated fee</span>
          <span className="font-bold text-gray-950">{formatPeso(selectedDoc.amount)}</span>
        </div>
      </div>

      {/* The estimate is not a price, and the clerk should not repeat it as one. */}
      <p className="text-[11px] text-gray-500 -mt-2 mb-5 leading-relaxed">
        The figure above is an estimate only. The College Secretary sets the amount the student
        actually pays, after the document is printed.
      </p>

      <div className="space-y-4">
        <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block">
          Supporting Document {needsPaper && <span className="text-red-600">· required for this type</span>}
        </span>

        <div className="bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 h-56 relative flex items-center justify-center">
          {selectedDoc.file_path ? (
            <AuthedFilePreview
              path={selectedDoc.file_path}
              alt="Submitted document"
              iframeTitle="Submitted document"
              className="w-full h-full object-contain hover:scale-105 transition-transform"
              onClick={() => setViewImageUrl(selectedDoc.file_path)}
              wrapperClassName="cursor-zoom-in w-full h-full flex items-center justify-center"
            />
          ) : (
            <span className="text-xs text-gray-400 px-6 text-center">
              Nothing attached. Scan the {getAttachmentHelper(selectedDoc.document_type)} the student brought in.
            </span>
          )}
        </div>

        <label className="block">
          <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">
            {selectedDoc.file_path ? 'Replace with a counter scan' : 'Scan at the counter'}
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setIntakeFile(e.target.files?.[0] || null)}
            className="block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
          />
          {intakeFile && (
            <span className="text-[11px] text-[#15803d] font-semibold mt-2 block">
              Ready to attach: {intakeFile.name}
            </span>
          )}
        </label>

        {selectedDoc.ocr_confidence_score != null && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <span className="text-[10px] font-bold text-blue-900 uppercase tracking-widest block mb-1">AI Reading</span>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              Confidence {parseFloat(selectedDoc.ocr_confidence_score).toFixed(0)}%. Check it against the
              document yourself before routing — the AI assists the decision, it does not make it.
            </p>
          </div>
        )}

        <label className="block">
          <span className="text-[10px] font-bold text-gray-800 uppercase tracking-widest block mb-2">
            Notes <span className="text-gray-400 normal-case font-semibold">· required when returning</span>
          </span>
          <textarea
            rows={3}
            value={intakeNotes}
            onChange={(e) => setIntakeNotes(e.target.value)}
            placeholder="e.g. Clearance is unsigned — ask the student to have it signed by the Registrar."
            className="w-full rounded-2xl border border-gray-200 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#15803d]/30"
          />
        </label>

        {missingRequired && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-[11px] text-amber-900 font-semibold leading-relaxed">
              {selectedDoc.document_type} needs a supporting document and none is attached. Scan it
              above, or return the request with a note.
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
