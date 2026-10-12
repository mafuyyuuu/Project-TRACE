import Button from '@/components/Button';
import { useEffect, useRef, useState } from 'react';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import useDrillMotion from '@/hooks/useDrillMotion';
import { SupportIcon } from '@/components/SupportVisuals';

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
  return <div className="fixed bottom-4 right-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end">
    {hasOpened && <section hidden={!isOpen} inert={!isOpen ? true : undefined} ref={attachPanel} id="registrar-support-chat" aria-label="Window 1 support" className={`trace-section mb-3 h-[75dvh] w-[min(34.25rem,calc(100vw-2rem))] flex-col overflow-hidden shadow-2xl ${isOpen ? 'flex' : 'hidden'}`}>
      <div className="flex shrink-0 items-center justify-between gap-3 bg-trace-emerald px-5 py-4 text-white"><div className="flex min-w-0 items-center gap-3"><SupportIcon name="support" /><h2 className="text-base font-bold">Window 1 support</h2></div><Button type="button" onClick={() => setIsOpen(false)} aria-label="Close support panel" className="trace-button-lift rounded-lg focus-visible:outline-white px-3 py-2 text-sm"><SupportIcon name="close" /></Button></div>
      <div className="min-h-0 flex-1 p-3"><RequestMessagesPanel user={user} compact active={isOpen} /></div>
    </section>}
    <Button ref={launcher} id="tutorial-support" type="button" aria-label={isOpen ? 'Close registrar support' : 'Open registrar support'} title={isOpen ? 'Close support' : 'Chat with Window 1'} aria-controls="registrar-support-chat" aria-expanded={isOpen} onClick={() => { setHasOpened(true); setIsOpen(previous => !previous); }} className="trace-button-lift group flex h-14 w-14 items-center justify-center rounded-2xl border border-green-500/40 bg-gradient-to-br from-green-600 to-emerald-800 text-white shadow-lg shadow-green-900/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-700">
      <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {isOpen ? <path d="m6 6 12 12M18 6 6 18" /> : <><path d="M20 11.5a8 8 0 0 1-8 8c-1.3 0-2.5-.3-3.6-.8L4 20l1.3-4.4A8 8 0 1 1 20 11.5Z" /><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" strokeWidth="3" /></>}
      </svg>
    </Button>
  </div>;
}
