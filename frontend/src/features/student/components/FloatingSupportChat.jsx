import { useEffect, useState } from 'react';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';

export default function FloatingSupportChat({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    window.addEventListener('trace-open-support', open);
    window.addEventListener('trace-close-support', close);
    return () => { window.removeEventListener('trace-open-support', open); window.removeEventListener('trace-close-support', close); };
  }, []);
  return <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end">
    {isOpen && <section id="registrar-support-chat" aria-label="Window 1 support" className="mb-3 flex max-h-[75dvh] w-[min(32rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex shrink-0 items-center justify-between gap-3 bg-[#15803d] p-3 text-white"><h2 className="text-base font-bold">Window 1 support</h2><button type="button" onClick={() => setIsOpen(false)} aria-label="Close support panel" className="rounded-lg px-3 py-2 text-sm">Close</button></div>
      <div className="min-h-0 overflow-y-auto p-3"><RequestMessagesPanel user={user} initialView="support" /></div>
    </section>}
    <button id="tutorial-support" type="button" aria-label={isOpen ? 'Close registrar support' : 'Open registrar support'} title={isOpen ? 'Close support' : 'Chat with Window 1'} aria-controls="registrar-support-chat" aria-expanded={isOpen} onClick={() => setIsOpen(previous => !previous)} className="group flex h-14 w-14 items-center justify-center rounded-2xl border border-green-500/40 bg-gradient-to-br from-green-600 to-emerald-800 text-white shadow-lg shadow-green-900/20 transition hover:shadow-xl motion-safe:hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700">
      <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {isOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <><path d="M20 11.5a8 8 0 0 1-8 8c-1.3 0-2.5-.3-3.6-.8L4 20l1.3-4.4A8 8 0 1 1 20 11.5Z" /><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" strokeWidth="3" /></>}
      </svg>
    </button>
  </div>;
}
