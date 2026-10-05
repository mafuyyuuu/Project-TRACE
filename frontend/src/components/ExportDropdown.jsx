import { useEffect, useId, useRef, useState } from 'react';
import Button from '@/components/Button';

/** A disclosure of download actions; data, errors and downloads stay with the caller. */
export default function ExportDropdown({ options, onSelect, exporting = false }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef(null);
  const trigger = useRef(null);
  const choices = useRef([]);
  const visible = open && !exporting;

  useEffect(() => {
    if (!visible) return;
    choices.current[0]?.focus();
    const dismiss = event => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [visible]);

  const close = () => { setOpen(false); trigger.current?.focus(); };
  const navigate = event => {
    if (!visible) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return; }
    const index = choices.current.indexOf(document.activeElement);
    const last = options.length - 1;
    const next = { ArrowDown: (index + 1) % options.length, ArrowUp: index <= 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next !== undefined) { event.preventDefault(); choices.current[next]?.focus(); }
  };

  return <div ref={root} className="relative max-w-full" onKeyDown={navigate}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <Button ref={trigger} type="button" className="trace-button trace-button-primary"
      aria-expanded={visible} aria-controls={id} disabled={Boolean(exporting)}
      onClick={() => setOpen(previous => !previous)}>
      <span aria-live="polite">{exporting ? 'Exporting…' : 'Export'}</span>
      <svg aria-hidden="true" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
    </Button>
    {visible && <div id={id} role="group" aria-label="Export options"
      className="trace-section absolute right-0 top-full mt-2 z-30 w-72 max-w-[calc(100vw-32px)] max-h-[50vh] overflow-y-auto p-2 shadow-lg space-y-1">
      {options.map((option, index) => <Button key={option.key} ref={element => { choices.current[index] = element; }}
        type="button" motion="feedback" className="trace-button trace-button-secondary w-full justify-start text-left"
        onClick={() => { close(); onSelect(option.key); }}>
        {option.label}
      </Button>)}
    </div>}
  </div>;
}
