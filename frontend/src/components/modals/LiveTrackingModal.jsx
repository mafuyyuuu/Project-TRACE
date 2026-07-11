import { createPortal } from 'react-dom';

export default function LiveTrackingModal({ 
  selectedDoc, 
  setActiveModal, 
  trackerProgress, 
  getStatusLabel 
}) {
  if (!selectedDoc) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 z-10 border border-gray-100 relative flex flex-col max-h-[90vh] overflow-y-auto">
        <button className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100" onClick={() => setActiveModal(null)}>✕</button>

        <div className="flex justify-between items-center border-b border-gray-100 pb-4">
          <h3 className="text-lg font-black text-gray-900 truncate pr-4">{selectedDoc.document_type || 'Transcript of Records (TOR)'}</h3>
          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${selectedDoc.current_status === 'completed' || selectedDoc.current_status === 'released' ? 'bg-emerald-50 text-[#15803d]' : 'bg-amber-50 text-amber-700'}`}>
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
              style={{ width: `${trackerProgress}%` }}
            >
              <div className="w-full h-full animate-water-flow"></div>
            </div>

            {/* Nodes */}
            {[
              { step: 1, label: 'Submitted', key: 'pending_payment' },
              { step: 2, label: 'Verifying', key: 'pending_payment_verification' },
              { step: 3, label: 'Secretary', key: 'pending_secretary' },
              { step: 4, label: 'Window 1', key: 'ready_window_1' },
              { step: 5, label: 'Released', key: 'completed' }
            ].map((node, index) => {
              const currentIndex = selectedDoc.current_status === 'pending_payment' ? 0 :
                                   selectedDoc.current_status === 'pending_payment_verification' ? 1 :
                                   selectedDoc.current_status === 'pending_secretary' ? 2 :
                                   selectedDoc.current_status === 'ready_window_1' ? 3 : 4;
              
              // For 'completed' status, step 5 is active. For 'released', step 5 is completed.
              const isReleased = selectedDoc.current_status === 'released';
              const isCompleted = index < currentIndex || (index === 4 && isReleased);
              const isActive = index === currentIndex && !isReleased;
              
              let exactTime = null;
              if (selectedDoc.step_logs && selectedDoc.step_logs.length > 0) {
                if (index === 0) {
                  exactTime = new Date(selectedDoc.created_at);
                } else {
                  const log = selectedDoc.step_logs.find(l => l.to_status === node.key || (node.key === 'completed' && l.to_status === 'released'));
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
              {selectedDoc.current_status === 'pending_payment' && 'Your document request is saved. Please complete your GCash payment to begin processing.'}
              {selectedDoc.current_status === 'pending_payment_verification' && 'Your GCash receipt is currently being verified by the Finance Office.'}
              {selectedDoc.current_status === 'pending_secretary' && 'Your payment was verified. The College Secretary is now evaluating your documents.'}
              {selectedDoc.current_status === 'ready_window_1' && 'Success! Your document is printed and ready for pickup at Window 1.'}
              {(selectedDoc.current_status === 'completed' || selectedDoc.current_status === 'released') && 'This request is complete. The document has been released.'}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
