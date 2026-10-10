import { useRef } from 'react';
import useMotion from '@/hooks/useMotion';

/** Animate the changed context, keeping the tab controls and focus stationary. */
export default function QueuePanel({ idPrefix, activeKey, children, className = '', semantics = 'tabs' }) {
  const ref = useRef(null);
  useMotion(ref, activeKey, 'context', { initial: false });
  return <div ref={ref} role={semantics === 'tabs' ? 'tabpanel' : 'region'} tabIndex={semantics === 'tabs' ? 0 : undefined} id={`${idPrefix}-panel`} aria-labelledby={`${idPrefix}-${activeKey}`} className={`min-w-0 ${className}`}>{children}</div>;
}
