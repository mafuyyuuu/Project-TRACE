import { useRef, useState } from 'react';
import useMotion from '@/hooks/useMotion';

export default function MotionDetails({ summary, children, defaultOpen = false }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(defaultOpen);
  useMotion(ref, open, 'continuity', { initial: false });
  return <details ref={ref} open={open} onToggle={event => setOpen(event.currentTarget.open)} className="trace-section trace-section-body w-full [overflow-wrap:anywhere]">
    <summary className="cursor-pointer font-bold text-sm whitespace-normal">{summary}</summary>
    {children}
  </details>;
}
