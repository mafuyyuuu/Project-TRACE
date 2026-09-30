import { useEffect, useRef, useState } from 'react';

/** Existing tables only. A conservative measured row height prevents resize/page oscillation. */
export default function useViewportPagination({ page, setPage, total, fallback = 10, enabled = true }) {
  const containerRef = useRef(null);
  const largestRow = useRef(0);
  const sizeRef = useRef(fallback);
  const [pageSize, setPageSize] = useState(fallback);
  useEffect(() => {
    const element = containerRef.current;
    if (!enabled || !element) return undefined;
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const heights = [...element.querySelectorAll('tbody tr')].map(row => row.getBoundingClientRect().height).filter(height => height > 0);
        if (!heights.length) return;
        largestRow.current = Math.max(largestRow.current, ...heights);
        const mainHeight = element.closest('main')?.clientHeight || window.innerHeight;
        const header = element.querySelector('thead')?.getBoundingClientRect().height || 40;
        const budget = Math.max(largestRow.current, Math.min(window.innerHeight * 0.6, mainHeight - 80) - header - 56);
        const next = Math.max(1, Math.floor(budget / largestRow.current));
        if (sizeRef.current !== next) {
          const firstRow = (page - 1) * sizeRef.current;
          sizeRef.current = next;
          setPage(Math.min(Math.max(1, Math.ceil(total / next)), Math.floor(firstRow / next) + 1));
          setPageSize(next);
        }
      });
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element); if (element.closest('main')) observer?.observe(element.closest('main'));
    window.addEventListener('resize', measure); measure();
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); cancelAnimationFrame(frame); };
  }, [enabled, total, page, setPage]);
  return { containerRef, pageSize, page: Math.max(1, Math.min(page, Math.max(1, Math.ceil(total / pageSize)))) };
}
