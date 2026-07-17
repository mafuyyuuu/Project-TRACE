import { createPortal } from 'react-dom';

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

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
  setViewImageUrl
}) {
  if (!selectedDoc) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
      <div className={`bg-white rounded-[2rem] shadow-2xl w-full ${selectedDoc.file_path ? 'max-w-7xl h-[85vh]' : 'max-w-4xl h-auto'} max-h-[calc(100dvh-2rem)] flex flex-col relative z-10 overflow-hidden border border-gray-200`}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-100 bg-white">
          <div>
            <h2 className="text-xl font-black text-gray-900 leading-tight">
              {selectedDoc.file_path ? 'AI Data Extraction Review' : 'Digital Request Evaluation'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {selectedDoc.file_path ? 'Verify EasyOCR extraction against the original document.' : 'Evaluate and process the student\'s digital request.'}
            </p>
          </div>
          <button onClick={() => setActiveModal(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        {/* Body split screen */}
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 bg-gray-50/50">
          {/* Left: Original document scan preview (ONLY if file_path exists) */}
          {selectedDoc.file_path && (
            <div className="lg:w-1/2 p-6 flex flex-col border-r border-gray-200 min-h-0">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-black text-gray-800">Original Scan</span>
                <span className="text-xs font-mono text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-1 font-semibold shadow-sm shrink-0">
                  {selectedDoc.original_filename || 'scan_00129.jpg'}
                </span>
              </div>
              <div className="flex-1 bg-gray-200 border border-gray-300 rounded-3xl overflow-hidden relative flex items-center justify-center shadow-inner">
                {selectedDoc.file_path.toLowerCase().endsWith('.pdf') ? (
                  <iframe 
                    src={`${apiBaseUrl}/uploads/${selectedDoc.file_path.split(/[\\/]/).pop()}`} 
                    className="w-full h-full"
                    title="PDF Preview"
                  />
                ) : (
                  <div onClick={() => setViewImageUrl(`/uploads/${selectedDoc.file_path.split(/[\\/]/).pop()}`)} className="cursor-zoom-in w-full h-full flex items-center justify-center group relative">
                    <img 
                      src={`${apiBaseUrl}/uploads/${selectedDoc.file_path.split(/[\\/]/).pop()}`} 
                      alt="Scanned Document" 
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right: Secretary data form editor */}
          <div className={`${selectedDoc.file_path ? 'lg:w-1/2' : 'w-full max-w-4xl mx-auto rounded-3xl my-6 border border-gray-200 shadow-sm'} bg-white p-6 md:p-8 flex flex-col justify-between overflow-y-auto min-h-0`}>
            <div className="space-y-6">
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
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide"># Tracking ID</label>
                  <input 
                    type="text" 
                    disabled 
                    value={selectedDoc.tracking_number || 'TRC-9011'} 
                    className="w-full p-3 bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">Student ID</label>
                    <input 
                      type="text" 
                      value={evalStudentId} 
                      onChange={(e) => setEvalStudentId(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" 
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">Document Type</label>
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
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">Student Name</label>
                  <input 
                    type="text" 
                    value={evalStudentName} 
                    onChange={(e) => setEvalStudentName(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-800 uppercase tracking-wide">Secretary Notes</label>
                  <textarea 
                    value={clerkNotes}
                    onChange={(e) => setClerkNotes(e.target.value)}
                    placeholder="Add any remarks...."
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none h-24 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-6 mt-6 border-t border-gray-100 shrink-0">
              <button 
                onClick={() => handleSecretaryEvaluate('reject')}
                disabled={actionLoading}
                className="flex-1 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-xl font-bold text-xs transition-all text-center"
              >
                Reject Request
              </button>
              <button 
                onClick={() => handleSecretaryEvaluate('approve')}
                disabled={actionLoading}
                className="flex-[2] py-3 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl font-bold text-xs shadow-md transition-all text-center"
              >
                Approve & Route
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
