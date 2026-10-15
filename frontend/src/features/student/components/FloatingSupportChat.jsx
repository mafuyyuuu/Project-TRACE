import StudentIcon from './StudentIcon';
import Button from '@/components/Button';
import { useEffect, useRef, useState } from 'react';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import useDrillMotion from '@/hooks/useDrillMotion';

export default function FloatingSupportChat({ user }) {
  const [isOpen, setIsOpen] = useState(false), [hasOpened,setHasOpened] = useState(false);
  const launcher = useRef(null), previousFocus = useRef(null);
  const panelRef = useRef(null);
  const attachPanel = useDrillMotion(panelRef, isOpen, 'support');
  useEffect(() => {
    const open = () => { setHasOpened(true); setIsOpen(true); };
    const close = () => setIsOpen(false);
    window.addEventListener('trace-open-support', open);
    window.addEventListener('trace-close-support', close);
    return () => { window.removeEventListener('trace-open-support', open); window.removeEventListener('trace-close-support', close); };
  }, []);
  useEffect(() => {
    if (!isOpen) return;
    previousFocus.current = document.activeElement;
    const fallbackFocus = launcher.current;
    panelRef.current?.querySelector('button')?.focus({preventScroll:true});
    const escape = event => {
      if (event.key !== 'Escape' || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault(); setIsOpen(false);
    };
    document.addEventListener('keydown',escape);
    return () => { document.removeEventListener('keydown',escape); (previousFocus.current?.isConnected ? previousFocus.current : fallbackFocus)?.focus({preventScroll:true}); };
  },[isOpen]);
  return <div className="fixed bottom-4 right-4 sm:bottom-[28px] sm:right-[28px] z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end">
    {hasOpened && <section hidden={!isOpen} inert={!isOpen ? true : undefined} ref={attachPanel} id="registrar-support-chat" aria-label="Window 1 support" className={`trace-section trace-student-chat mb-3 h-[75dvh] w-[min(34.25rem,calc(100vw-2rem))] flex-col overflow-hidden shadow-2xl ${isOpen ? 'flex' : 'hidden'}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 bg-trace-emerald px-5 py-4 text-white"><div className="flex min-w-0 items-center gap-3"><StudentIcon name="chat-4b71c" /><div><h2 className="text-base font-bold">Window 1 support</h2><p className="mt-1 text-xs font-normal text-green-100">Ask for help or open a ticket</p></div></div><Button type="button" onClick={() => setIsOpen(false)} aria-label="Close support panel" className="trace-button-lift flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 focus-visible:outline-white"><StudentIcon name="x1-7fcfe" /></Button></div>
      <div className="min-h-0 flex-1 p-3"><RequestMessagesPanel user={user} compact active={isOpen} /></div>
    </section>}
    <Button ref={launcher} id="tutorial-support" type="button" aria-label={isOpen ? 'Close registrar support' : 'Open registrar support'} title={isOpen ? 'Close support' : 'Chat with Window 1'} aria-controls="registrar-support-chat" aria-expanded={isOpen} onClick={() => { setHasOpened(true); setIsOpen(previous => !previous); }} className="trace-button-lift group flex h-14 w-14 items-center justify-center rounded-2xl border border-green-500/40 bg-trace-emerald text-white shadow-lg shadow-green-900/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700">
      <StudentIcon name={isOpen ? 'x-c41f9' : 'chat-f8005'} />
    </Button>
  </div>;
}
