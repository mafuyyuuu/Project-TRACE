import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';

function DetailPanel({ selectedDoc, evalStudentId, evalStudentName, evalDocType }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 font-mono text-[11px] text-gray-600 space-y-2">
      <div className="flex justify-between"><span>Tracking ID</span><span className="font-bold text-gray-950 select-text">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
      <div className="flex justify-between"><span>Student ID</span><span className="font-bold text-gray-950">{evalStudentId || 'N/A'}</span></div>
      <div className="flex justify-between"><span>Student Name</span><span className="font-bold text-gray-950">{evalStudentName || 'Unknown'}</span></div>
      <div className="flex justify-between border-t border-gray-200/50 pt-2"><span>Document Type</span><span className="font-bold text-gray-950">{evalDocType}</span></div>
    </div>
  );
}

function EvaluationForm({
  selectedDoc,
  evalStudentId,
  setEvalStudentId,
  evalStudentName,
  setEvalStudentName,
  evalDocType,
  setEvalDocType,
  estimatedReadyDate,
  setEstimatedReadyDate,
  clerkNotes,
  setClerkNotes,
}) {
  return (
    <div className="space-y-6 flex-1">
      {/* Confidence Score Panel */}
      {selectedDoc.file_path && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 text-[#15803d] rounded-xl flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">CONFIDENCE SCORE</span>
              <span className="text-[10px] font-bold text-gray-400 block mt-0.5">Extraction successful. Please verify</span>
            </div>
          </div>
          <span className="text-2xl font-black text-[#15803d] font-mono">{selectedDoc.ocr_confidence_score ? `${parseFloat(selectedDoc.ocr_confidence_score).toFixed(1)}%` : 'N/A'}</span>
        </div>
      )}

      {!selectedDoc.file_path && selectedDoc.purpose && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">STUDENT PURPOSE</span>
              <div className="text-xs font-bold text-gray-800 block mt-0.5 space-y-1">
                {(() => {
                  try {
                    const parsed = JSON.parse(selectedDoc.purpose);
                    return Object.entries(parsed)
                      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
                      .map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <span className="text-gray-500 capitalize">{key.replace('_', ' ')}:</span>
                          <span>{value}</span>
                        </div>
                      ));
                  } catch {
                    return selectedDoc.purpose ? <span>{selectedDoc.purpose}</span> : null;
                  }
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Student ID</label>
            <input
              type="text"
              value={evalStudentId}
              onChange={(e) => setEvalStudentId(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Document Type</label>
            <select
              value={evalDocType}
              onChange={(e) => setEvalDocType(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer"
            >
              <option value="Transcript of Records">Transcript of Records (TOR)</option>
              <option value="Graduation Clearance">Graduation Clearance</option>
              <option value="Certificate of Good Moral">Certificate of Good Moral</option>
              <option value="Honorable Dismissal">Honorable Dismissal</option>
              <option value="Diploma">Diploma</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Student Name</label>
          <input
            type="text"
            value={evalStudentName}
            onChange={(e) => setEvalStudentName(e.target.value)}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">
            Ready By <span className="text-red-600">*</span>
          </label>
          <input
            type="date"
            value={estimatedReadyDate || ''}
            onChange={(e) => setEstimatedReadyDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
          />
          {/* The student is told this date, and the office is measured
              against it — so it is required to accept the work. */}
          <span className="text-[10px] text-gray-400 font-medium">
            Sent to the student. They are told the amount separately, once it is printed and priced.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Secretary Notes</label>
          <textarea
            value={clerkNotes}
            onChange={(e) => setClerkNotes(e.target.value)}
            placeholder="Add any remarks...."
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none h-24 resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function EvaluationActions({ handleSecretaryEvaluate, actionLoading }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleSecretaryEvaluate('reject')}
        disabled={actionLoading}
        className="w-1/2 py-3 rounded-xl font-bold text-xs shadow-md transition-all text-center uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
      >
        Return to Window 1
      </button>
      <button
        onClick={() => handleSecretaryEvaluate('approve')}
        disabled={actionLoading}
        className="w-1/2 py-3 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl font-bold text-xs shadow-md transition-all text-center uppercase tracking-wider disabled:opacity-50"
      >
        Accept for Processing
      </button>
    </div>
  );
}

export default function SecretaryEvaluationModal({
  setActiveModal,
  selectedDoc,
  evalStudentId,
  setEvalStudentId,
  evalStudentName,
  setEvalStudentName,
  evalDocType,
  setEvalDocType,
  clerkNotes,
  setClerkNotes,
  handleSecretaryEvaluate,
  actionLoading,
  setViewImageUrl,
  estimatedReadyDate,
  setEstimatedReadyDate
}) {
  if (!selectedDoc) return null;

  const formProps = {
    selectedDoc, evalStudentId, setEvalStudentId, evalStudentName, setEvalStudentName,
    evalDocType, setEvalDocType, estimatedReadyDate, setEstimatedReadyDate, clerkNotes, setClerkNotes,
  };

  // Digital requests have no scan to preview — a single column fits ModalShell's
  // standard title/body/footer slots directly.
  if (!selectedDoc.file_path) {
    return (
      <ModalShell
        open={!!selectedDoc}
        onClose={() => setActiveModal(null)}
        title="Digital Request Evaluation"
        maxWidth="max-w-xl"
        footer={<EvaluationActions handleSecretaryEvaluate={handleSecretaryEvaluate} actionLoading={actionLoading} />}
      >
        <p className="text-xs text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100">
          Evaluate and process the student's digital request.
        </p>
        <DetailPanel selectedDoc={selectedDoc} evalStudentId={evalStudentId} evalStudentName={evalStudentName} evalDocType={evalDocType} />
        <EvaluationForm {...formProps} />
      </ModalShell>
    );
  }

  // Scanned documents get a split-screen: a preview column and a form column,
  // each independently scrolling — `bare` skips ModalShell's own single-body
  // slot so the two columns can manage their own scroll/pinned-footer regions.
  return (
    <ModalShell
      open={!!selectedDoc}
      onClose={() => setActiveModal(null)}
      bare
      title="AI Data Extraction Review"
      panelClassName="bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-[85vh] z-10 border border-gray-100 relative animate-slide-up flex flex-col lg:flex-row overflow-hidden"
      closeButtonClassName="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 z-20"
    >
      {/* Left: Original document scan preview */}
      <div className="lg:w-1/2 p-6 flex flex-col border-r border-gray-200 min-h-0 bg-gray-50/30">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xs font-black text-gray-800">Original Scan</span>
          <span className="text-xs font-mono text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-1 font-semibold shadow-sm shrink-0">
            {selectedDoc.original_filename || 'scan_00129.jpg'}
          </span>
        </div>
        <div className="flex-1 bg-gray-200 border border-gray-300 rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner">
          <AuthedFilePreview
            path={selectedDoc.file_path}
            alt="Scanned Document"
            iframeTitle="PDF Preview"
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            onClick={() => setViewImageUrl(selectedDoc.file_path)}
            wrapperClassName="cursor-zoom-in w-full h-full flex items-center justify-center group relative"
          />
        </div>
      </div>

      {/* Right: Secretary data form editor — its own scroll body + pinned footer,
          since two independently-scrolling columns can't share one shell body. */}
      <div className="lg:w-1/2 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <h3 className="text-xl font-black text-gray-900">AI Data Extraction Review</h3>
          <p className="text-xs text-gray-400 mt-1 font-semibold pb-5 mb-6 border-b border-gray-100">
            Verify EasyOCR extraction against the original document.
          </p>
          <DetailPanel selectedDoc={selectedDoc} evalStudentId={evalStudentId} evalStudentName={evalStudentName} evalDocType={evalDocType} />
          <EvaluationForm {...formProps} />
        </div>
        <div className="shrink-0 px-6 sm:px-8 py-6 border-t border-gray-100">
          <EvaluationActions handleSecretaryEvaluate={handleSecretaryEvaluate} actionLoading={actionLoading} />
        </div>
      </div>
    </ModalShell>
  );
}
