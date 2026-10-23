import { useRef, useState } from 'react';
import useMotion from '@/hooks/useMotion';

export default function MotionDetails({ summary, children, defaultOpen = false, onOpen }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(defaultOpen);
  useMotion(ref, open, 'continuity', { initial: false });
  return <details ref={ref} open={open} onToggle={event => {setOpen(event.currentTarget.open);if(event.currentTarget.open)onOpen?.();}} className="trace-section trace-section-body w-full [overflow-wrap:anywhere]">
    <summary className="cursor-pointer font-bold text-sm whitespace-normal">{summary}</summary>
    {children}
  </details>;
}
