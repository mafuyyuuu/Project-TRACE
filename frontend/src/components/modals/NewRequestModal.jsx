
import { createPortal } from 'react-dom';

export default function NewRequestModal({
  user,
  setActiveModal,
  selectedDocType,
  setSelectedDocType,
  semesters,
  setSemesters,
  reqCopies,
  setReqCopies,
  requestFile,
  setRequestFile,
  deliveryMethod,
  setDeliveryMethod,
  handleStudentSubmitRequest,
  actionLoading,
  getAttachmentLabel,
  getAttachmentHelper,
  requiresAttachment
}) {

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:p-8 z-10 border border-gray-100 relative">
        <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>
        
        <h3 className="text-xl font-black text-gray-900">New Request</h3>
        <p className="text-xs text-gray-400 mt-1 font-semibold mb-6">Add New Request</p>

        <form onSubmit={handleStudentSubmitRequest} className="space-y-6">
          {/* Visually Auto-filled Fields */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Student Name</label>
              <input type="text" value={user?.full_name || ''} disabled className="bg-transparent border-none p-0 text-sm font-bold text-gray-900" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Student ID</label>
              <input type="text" value={user?.student_id || ''} disabled className="bg-transparent border-none p-0 text-sm font-bold text-gray-900" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Document Type</label>
            <select name="docType" value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3.5 text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer text-gray-800">
              <option value="" disabled selected>Select Document Type...</option>
              <option value="Transcript of Records">Transcript of Records (TOR)</option>
              <option value="Graduation Clearance">Graduation Clearance</option>
              <option value="Certificate of Good Moral">Certificate of Good Moral</option>
              <option value="Honorable Dismissal">Honorable Dismissal</option>
              <option value="Diploma">Diploma</option>
            </select>
          </div>
          
          {selectedDocType && (
            <div className="bg-gray-50/50 border border-gray-100 rounded-2xl p-4 space-y-4">
              {/* Dynamic Form Fields */}
              {(selectedDocType === 'Transcript of Records' || selectedDocType === 'Honorable Dismissal') && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Name of Requesting School/Company</label>
                  <input type="text" name="requestingSchool" required className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 outline-none" placeholder="e.g. Mapua University" />
                </div>
              )}

              {(selectedDocType === 'Transcript of Records' || selectedDocType === 'Transcript of Records (TOR)') && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">How many semesters have you attended?</label>
                  <input type="number" name="semesters" value={semesters} onChange={e => setSemesters(parseInt(e.target.value) || 0)} min="1" required className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 outline-none" />
                  <p className="text-[10px] text-gray-400">Note: 4 semesters = 1 page (₱100/page)</p>
                </div>
              )}
              
              {(selectedDocType === 'Graduation Clearance' || selectedDocType === 'Diploma') && (
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Year Graduated / Last Attended</label>
                  <input type="text" name="yearGraduated" required className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 outline-none" placeholder="e.g. 2025" />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Purpose of Request</label>
                <input type="text" name="purpose" required className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 outline-none" placeholder="e.g. Employment, Board Exam, Transfer" />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Number of Copies</label>
                <input type="number" name="copies" value={reqCopies} onChange={e => setReqCopies(parseInt(e.target.value) || 1)} min="1" required className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 outline-none" />
              </div>
              
              {requiresAttachment(selectedDocType) && (
                <div className="flex flex-col gap-2 pt-2">
                  <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">
                    {getAttachmentLabel(selectedDocType)}
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-white flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors relative">
                    {requestFile ? (
                      <span className="text-xs font-bold text-indigo-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        {requestFile.name}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-gray-600">
                        <span className="text-[#15803d]">Click here</span> to upload {getAttachmentHelper(selectedDocType)}
                      </span>
                    )}
                    <input 
                      type="file" 
                      name="docFile" 
                      onChange={(e) => setRequestFile(e.target.files[0])}
                      required={true} 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <label className="text-[10px] font-bold text-gray-800 uppercase tracking-widest">Delivery Method</label>
                <select 
                  value={deliveryMethod}
                  onChange={(e) => setDeliveryMethod(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-[#15803d]/20 outline-none cursor-pointer"
                >
                  <option value="self-pickup">Self Pick-up (Window 1)</option>
                  <option value="courier">Courier Pick-up (Student books Grab/Lalamove)</option>
                </select>
              </div>
              
              <div className="pt-2 border-t border-gray-200 mt-4 flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500">Estimated Total:</span>
                <span className="text-lg font-black text-[#15803d]">
                  ₱{((selectedDocType === 'Transcript of Records' || selectedDocType === 'Transcript of Records (TOR)') 
                    ? (Math.ceil(semesters / 4) * 100)
                    : selectedDocType === 'Honorable Dismissal' 
                      ? 100.00 
                      : 50.00) * reqCopies}.00
                </span>
              </div>
            </div>
          )}

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-xs leading-relaxed text-[#15803d] font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-[#15803d] rounded-full shrink-0"></span>
            Fast checkout: Complete your payment instantly to begin processing.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button 
              type="button"
              onClick={() => { setActiveModal(null); setSelectedDocType(''); }}
              className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={actionLoading} 
              className="px-8 py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-70 text-white rounded-xl text-xs font-bold shadow-md transition-all uppercase tracking-wider"
            >
              {actionLoading ? 'Uploading...' : 'Next'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
