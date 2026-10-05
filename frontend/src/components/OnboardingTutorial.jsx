import Button from '@/components/Button';
import { useEffect, useRef, useState } from 'react';
import ModalShell from '@/components/ModalShell';
import { getOnboardingSteps } from '@/utils/onboardingSteps';


function findTarget(target) {
  if (!target.startsWith('nav:')) return document.getElementById(target);
  return [...document.querySelectorAll('[data-guide-tab]')].find(element =>
    element.dataset.guideTab === target.slice(4) && element.getBoundingClientRect().width > 0);
}

export default function OnboardingTutorial({ user, onComplete, onPrepare = () => {}, onAction = () => {} }) {
  const steps = getOnboardingSteps(user);
  const [step, setStep] = useState(0);
  const [geometry, setGeometry] = useState(null);
  const cardRef = useRef(null);
  const prepareRef = useRef(onPrepare);
  useEffect(() => { prepareRef.current = onPrepare; }, [onPrepare]);
  useEffect(() => {
    const current = steps[step];
    prepareRef.current(current.area);
    const scrollableCopy = cardRef.current?.querySelector('[data-guide-copy]');
    if (scrollableCopy) scrollableCopy.scrollTop = 0;
    cardRef.current?.querySelector('h2')?.focus();
    let target;
    let frame;
    const measure = () => {
      target = findTarget(current.target);
      const bounds = target?.getBoundingClientRect();
      const width = window.innerWidth, height = window.innerHeight;
      const hole = bounds?.width && bounds?.height ? {
        left: Math.max(8, bounds.left - 8), top: Math.max(8, bounds.top - 8),
        right: Math.min(width - 8, bounds.right + 8), bottom: Math.min(height - 8, bounds.bottom + 8),
      } : null;
      const cardWidth = Math.min(384, width - 32);
      const copy = cardRef.current?.querySelector('[data-guide-copy]');
      const naturalHeight = (cardRef.current?.getBoundingClientRect().height || 320) + Math.max(0, (copy?.scrollHeight || 0) - (copy?.clientHeight || 0));
      const cardHeight = Math.min(naturalHeight, height - 32);
      const belowSpace = hole ? height - hole.bottom - 32 : height - 32;
      const aboveSpace = hole ? hole.top - 32 : 0;
      const below = hole && (belowSpace >= cardHeight || (aboveSpace < cardHeight && belowSpace >= aboveSpace));
      const maxHeight = Math.min(height - 32, Math.max(80, below ? belowSpace : aboveSpace || height - 32));
      setGeometry({ hole, width, height,
        left: hole ? Math.max(16, Math.min(hole.left, width - cardWidth - 16)) : Math.max(16, (width - cardWidth) / 2),
        top: hole ? below ? Math.min(hole.bottom + 16, height - maxHeight - 16) : Math.max(16, hole.top - Math.min(cardHeight, maxHeight) - 16) : Math.max(16, height - cardHeight - 16),
        maxHeight: Math.min(height - 32, maxHeight),
      });
    };
    frame = requestAnimationFrame(() => {
      findTarget(current.target)?.scrollIntoView?.({ block: 'start', inline: 'nearest', behavior: 'instant' });
      measure();
    });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (cardRef.current) observer?.observe(cardRef.current);
    // Profile targets mount after the preparation callback updates Layout.
    const mutations = new MutationObserver(() => {
      const next = findTarget(current.target);
      if (next !== target) { next?.scrollIntoView?.({ block: 'start', behavior: 'instant' }); measure(); }
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', measure);
    document.addEventListener('scroll', measure, true);
    document.addEventListener('animationend', measure, true);
    return () => {
      cancelAnimationFrame(frame); observer?.disconnect(); mutations.disconnect();
      window.removeEventListener('resize', measure); document.removeEventListener('scroll', measure, true);
      document.removeEventListener('animationend', measure, true);
    };
  }, [step, steps]);

  const current = steps[step];
  const hole = geometry?.hole;
  const clipPath = hole ? `polygon(evenodd, 0px 0px, ${geometry.width}px 0px, ${geometry.width}px ${geometry.height}px, 0px ${geometry.height}px, 0px 0px, ${hole.left}px ${hole.top}px, ${hole.left}px ${hole.bottom}px, ${hole.right}px ${hole.bottom}px, ${hole.right}px ${hole.top}px, ${hole.left}px ${hole.top}px)` : undefined;
  return <ModalShell open onClose={onComplete} title="TRACE quick guide" bare showCloseButton={false} layer="feedback" closeOnBackdrop={false}
    backdropClassName="absolute inset-0 bg-slate-950/65 backdrop-blur-sm"
    backdropStyle={{ clipPath }}
    panelStyle={{ position: 'fixed', left: geometry?.left ?? 16, top: geometry?.top ?? 16, maxHeight: geometry?.maxHeight }}
    panelClassName="z-10 flex flex-col w-[min(24rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-3xl border border-green-200 bg-white text-gray-900 shadow-2xl dark:border-green-800 dark:bg-gray-900 dark:text-gray-100">
    {hole && <div aria-hidden="true" className="fixed pointer-events-none rounded-xl ring-2 ring-green-400 ring-offset-4 ring-offset-green-400/20" style={{ left: hole.left, top: hole.top, width: Math.max(0, hole.right - hole.left), height: Math.max(0, hole.bottom - hole.top) }} />}
    <div ref={cardRef} className="flex min-h-0 flex-col gap-4 p-5 sm:p-6">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-green-700 dark:text-green-300">TRACE · Quick tour</span>
        <Button type="button" onClick={onComplete} aria-label="Skip quick guide" className="shrink-0 rounded-full px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">Skip</Button>
      </div>
      <section data-guide-copy aria-live="polite" className="min-h-0 overflow-y-auto overscroll-contain space-y-3 pr-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">Step {step + 1} of {steps.length}</p>
        <h2 tabIndex={-1} className="text-xl font-bold leading-snug outline-none">{current.title}</h2>
        <p className="text-sm leading-relaxed">{current.text}</p>
        {current.action && <Button type="button" onClick={() => {
          onAction(current.area);
          if (current.next) setStep(value => value + 1);
        }} className="trace-button-lift rounded-xl border border-green-600 px-4 py-2 text-sm font-bold text-green-700 dark:text-green-300">{current.action} <span aria-hidden="true">↗</span></Button>}
      </section>
      <div aria-hidden="true" className="flex shrink-0 gap-1">{steps.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-green-600' : 'bg-gray-200 dark:bg-gray-700'}`} />)}</div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <Button type="button" disabled={step === 0} onClick={() => setStep(value => value - 1)} className="trace-button-lift rounded-xl px-3 py-2 text-sm font-bold disabled:opacity-30">Back</Button>
        <Button type="button" onClick={() => step === steps.length - 1 ? onComplete() : setStep(value => value + 1)} className="trace-button-lift rounded-xl bg-green-700 px-5 py-2.5 text-sm font-bold text-white enabled:hover:bg-green-800">{step === steps.length - 1 ? 'Finish tour' : 'Next'}</Button>
      </div>
    </div>
  </ModalShell>;
}
