import { useState } from 'react';
import DocumentChat from '@/components/DocumentChat';

export default function FloatingSupportChat({ documents, user }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Find the most recent active document
  const activeDocs = documents.filter(d => d.current_status !== 'released' && d.current_status !== 'rejected');
  const targetDoc = activeDocs.length > 0 ? activeDocs[0] : documents[0];

  if (!targetDoc) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 max-w-[calc(100vw-2rem)] z-50 flex flex-col items-end">
      {isOpen && (
        <div id="registrar-support-chat" className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl w-80 sm:w-96 max-w-full overflow-hidden mb-4 flex flex-col h-[500px] max-h-[70dvh] animate-slide-up">
          <div className="bg-[#15803d] text-white px-4 py-3 flex justify-between items-center">
            <div>
              <div className="font-bold text-sm">Registrar Support</div>
              <div className="text-[10px] text-green-100 opacity-90 select-text break-all">Tracking #{targetDoc.tracking_number || targetDoc.id}</div>
            </div>
            <button type="button" aria-label="Close registrar support" onClick={() => setIsOpen(false)} className="text-white hover:text-green-200 p-1 shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-0 relative">
            <DocumentChat documentId={targetDoc.id} user={user} />
          </div>
        </div>
      )}
      
      <button 
        type="button"
        aria-label={isOpen ? 'Close registrar support' : 'Open registrar support'}
        aria-expanded={isOpen}
        aria-controls="registrar-support-chat"
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#15803d] hover:bg-[#166534] text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
        ) : (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
        )}
      </button>
    </div>
  );
}
