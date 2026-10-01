import { useState } from 'react';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';

export default function FloatingSupportChat({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  return <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end">
    {isOpen && <section id="registrar-support-chat" aria-label="Window 1 support" className="mb-3 flex max-h-[75dvh] w-[min(32rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
      <div className="flex shrink-0 items-center justify-between gap-3 bg-[#15803d] p-3 text-white"><h2 className="text-base font-bold">Window 1 support</h2><button type="button" onClick={() => setIsOpen(false)} aria-label="Close support panel" className="rounded-lg px-3 py-2 text-sm">Close</button></div>
      <div className="min-h-0 overflow-y-auto p-3"><RequestMessagesPanel user={user} initialView="support" /></div>
    </section>}
    <button type="button" aria-label={isOpen ? 'Close registrar support' : 'Open registrar support'} aria-controls="registrar-support-chat" aria-expanded={isOpen} onClick={() => setIsOpen(previous => !previous)} className="flex h-14 min-w-14 items-center justify-center rounded-full bg-[#15803d] px-3 text-sm font-bold text-white shadow-lg">{isOpen ? 'Close' : 'Chat'}</button>
  </div>;
}
