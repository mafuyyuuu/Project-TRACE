import { useLayoutEffect, useRef } from 'react';

export default function ProgressFill({ value, className = '' }) {
  const ref = useRef(null);
  const normalized = Number(value);
  const progress = Number.isFinite(normalized) ? Math.min(100, Math.max(0, normalized)) : 0;
  useLayoutEffect(() => {
    ref.current.style.transform = `scaleX(${progress / 100})`;
  }, [progress]);
  return <div ref={ref} className={`trace-motion-progress h-full w-full origin-left rounded-full ${className}`} />;
}
