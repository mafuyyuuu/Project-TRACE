import { createPortal } from 'react-dom';
import { STATUS, PIPELINE } from '@/utils/documentStatus';

/**
 * The tracker's dots, one per pipeline stage.
 *
 * Short labels because eight of them share one row on a phone; the full
 * explanation is in the panel underneath.
 */
const TRACKER_NODES = [
  { step: 1, label: 'Filed', key: STATUS.PENDING_W1_INTAKE },
  { step: 2, label: 'Intake', key: STATUS.PENDING_SEC_EVALUATION },
  { step: 3, label: 'Processing', key: STATUS.SEC_PROCESSING },
  { step: 4, label: 'Payment', key: STATUS.PENDING_STUDENT_PAYMENT },
  { step: 5, label: 'Verifying', key: STATUS.PENDING_FINANCE_VERIFICATION },
  { step: 6, label: 'Paid', key: STATUS.PAID_PENDING_SEC_RELEASE },
  { step: 7, label: 'Window 1', key: STATUS.READY_FOR_RELEASE },
  { step: 8, label: 'Released', key: STATUS.COMPLETED },
];

/** What is actually happening, in words the student can act on. */
const STAGE_MESSAGE = {
  [STATUS.PENDING_W1_INTAKE]: 'Your request has been filed. Window 1 is checking the paperwork.',
  [STATUS.PENDING_SEC_EVALUATION]: 'Your request is with the College Secretary for evaluation.',
  [STATUS.SEC_PROCESSING]: 'Your document is being prepared and printed. You will be told the amount once it is ready.',
  [STATUS.PENDING_STUDENT_PAYMENT]: 'Your document is ready. Pay online here, or bring your payment slip to the Finance Office.',
  [STATUS.PENDING_FINANCE_VERIFICATION]: 'The Finance Office is verifying your payment.',
  [STATUS.PAID_PENDING_SEC_RELEASE]: 'Payment confirmed. The College Secretary is passing your document to Window 1.',
  [STATUS.READY_FOR_RELEASE]: 'Ready for pick-up at Window 1. Bring your Official Receipt.',
  [STATUS.COMPLETED]: 'This request is complete. The document has been released.',
};

export default function LiveTrackingModal({ 
  selectedDoc, 
  setActiveModal, 
  trackerProgress, 
  getStatusLabel 
}) {
  if (!selectedDoc) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 z-10 border border-gray-100 relative flex flex-col max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>

        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h3 className="text-lg font-black text-gray-900 truncate pr-4">{selectedDoc.document_type || 'Transcript of Records (TOR)'}</h3>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${selectedDoc.current_status === STATUS.COMPLETED ? 'bg-emerald-50 text-[#15803d]' : 'bg-amber-50 text-amber-700'}`}>
            {getStatusLabel(selectedDoc.current_status)}
          </span>
        </div>

        {/* Gray detail panel */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 my-4 font-mono text-[11px] text-gray-600 space-y-2">
          <div className="flex justify-between"><span>Tracking ID</span><span className="font-bold text-gray-950">#{selectedDoc.tracking_number || selectedDoc.id}</span></div>
          <div className="flex justify-between"><span>Date Requested</span><span className="font-bold text-gray-950">{new Date(selectedDoc.created_at).toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'})} at {new Date(selectedDoc.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
          <div className="flex justify-between"><span>Copies</span><span className="font-bold text-gray-950">{selectedDoc.copies || 1}</span></div>
          <div className="flex justify-between border-t border-gray-200/50 pt-2"><span>Amount</span><span className="font-bold text-gray-950">P{parseFloat(selectedDoc.amount || 150).toFixed(2)}</span></div>
        </div>

        {/* Horizontal Map Visualizer */}
        <div className="flex-1 px-4 py-6 flex flex-col justify-center w-full bg-white rounded-2xl border border-gray-100 shadow-sm my-4">
          
          <div className="relative w-full flex items-center justify-between mb-20 mt-2">
            {/* Background Progress Bar */}
            <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-1.5 bg-gray-100 rounded-full z-0"></div>
            
            {/* Active Progress Bar */}
            <div className="absolute left-[10%] top-1/2 -translate-y-1/2 h-1.5 bg-[#15803d] rounded-full z-0 transition-all duration-1000 ease-out overflow-hidden"
              style={{ width: `${trackerProgress * 0.8}%` }}
            >
              <div className="w-full h-full animate-water-flow"></div>
            </div>

            {/* Nodes */}
            {TRACKER_NODES.map((node, index) => {
              // Derived from the shared pipeline rather than a second copy of
              // it, so a change to the workflow cannot leave the student's
              // tracker describing a process the office no longer follows.
              const rawIndex = PIPELINE.indexOf(selectedDoc.current_status);
              const currentIndex = rawIndex === -1 ? 0 : rawIndex;

              const isReleased = selectedDoc.current_status === STATUS.COMPLETED;
              const isCompleted = index < currentIndex || (index === TRACKER_NODES.length - 1 && isReleased);
              const isActive = index === currentIndex && !isReleased;
              
              let exactTime = null;
              if (selectedDoc.step_logs && selectedDoc.step_logs.length > 0) {
                if (index === 0) {
                  exactTime = new Date(selectedDoc.created_at);
                } else {
                  const log = selectedDoc.step_logs.find(l => l.to_status === node.key);
                  if (log && log.timestamp_completed) {
                    exactTime = new Date(log.timestamp_completed);
                  } else if (log && log.timestamp_started) {
                    exactTime = new Date(log.timestamp_started);
                  }
                }
              } else {
                // fallback to document creation/updated dates if no step logs
                if (index === 0) exactTime = new Date(selectedDoc.created_at);
                else if (isCompleted) exactTime = new Date(selectedDoc.updated_at);
              }

              return (
                <div key={node.step} className="relative z-10 flex flex-col items-center w-1/5">
                  {/* Pulsing ring for active step */}
                  {isActive && (
                    <span className="absolute top-0 w-8 h-8 bg-blue-400/50 rounded-full animate-ping"></span>
                  )}
                  
                  <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all duration-500
                    ${isCompleted ? 'bg-[#15803d] border-[#15803d] text-white scale-110 shadow-md' : 
                      isActive ? 'bg-blue-600 border-blue-600 text-white scale-125 shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 
                      'bg-white border-gray-200 text-gray-400 shadow-sm'}`}>
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                    ) : isActive ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    ) : (
                      node.step
                    )}
                  </div>
                  
                  <div className={`absolute top-10 text-[10px] font-black uppercase tracking-wider text-center w-32 
                    ${isCompleted ? 'text-gray-900' : isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div>{node.label}</div>
                    {isActive && <div className="text-[7px] animate-pulse mt-0.5 tracking-widest text-blue-400">In Progress</div>}
                    
                    {(isCompleted || isActive) && exactTime && (
                      <div className="mt-1 text-[8px] font-bold text-gray-500 lowercase tracking-normal flex flex-col items-center">
                        <span>{exactTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}</span>
                        <span>{exactTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Context Panel */}
          <div className="mt-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 text-center">
            <p className="text-xs font-semibold text-emerald-800 leading-relaxed">
              {STAGE_MESSAGE[selectedDoc.current_status] || 'Your request is being processed.'}
              {selectedDoc.estimated_ready_date && [STATUS.PENDING_SEC_EVALUATION, STATUS.SEC_PROCESSING].includes(selectedDoc.current_status) && (
                <span className="block mt-2 font-bold">
                  Expected ready by {new Date(selectedDoc.estimated_ready_date).toLocaleDateString()}.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
