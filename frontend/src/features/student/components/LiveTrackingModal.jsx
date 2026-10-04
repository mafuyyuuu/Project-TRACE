import { useEffect, useRef, useState } from 'react';
import ModalShell from '@/components/ModalShell';
import { STATUS, PIPELINE, getStageLabel, getStatusTone, isLegacyClosed } from '@/utils/documentStatus';

/** What is actually happening, in words the student can act on. */
const STAGE_MESSAGE = {
  [STATUS.PENDING_W1_INTAKE]: 'Your request has been filed. Window 1 is checking the paperwork.',
  [STATUS.PENDING_SEC_EVALUATION]: 'Your request is with the College Secretary for evaluation.',
  [STATUS.SEC_PROCESSING]: 'Your document is being prepared and printed. You will be told the amount once it is ready.',
  [STATUS.PENDING_STUDENT_PAYMENT]: 'Your document is ready. Pay online here, or bring your payment slip to the Finance Office.',
  [STATUS.PENDING_FINANCE_VERIFICATION]: 'The Finance Office is verifying your payment.',
  [STATUS.PAID_PENDING_SEC_RELEASE]: 'Payment confirmed. The College Secretary is checking your Official Receipt.',
  [STATUS.SEC_OR_VERIFIED]: 'Official Receipt verified. The College Secretary is passing your document to Window 1.',
  [STATUS.READY_FOR_RELEASE]: 'Ready for pick-up at Window 1. Bring your Official Receipt.',
  [STATUS.COMPLETED]: 'This request is complete. The document has been released.',
};

export default function LiveTrackingModal({ selectedDoc, setActiveModal, getStatusLabel }) {
  const mapRef = useRef(null);
  const dotRefs = useRef([]);
  const [columns, setColumns] = useState(() => window.matchMedia?.('(min-width: 768px)').matches ? PIPELINE.length : 3);
  const [points, setPoints] = useState([]);
  useEffect(() => {
    const media = window.matchMedia?.('(min-width: 768px)');
    const change = () => setColumns(media?.matches ? PIPELINE.length : 3);
    media?.addEventListener?.('change', change);
    return () => media?.removeEventListener?.('change', change);
  }, []);
  useEffect(() => {
    const element = mapRef.current;
    if (!element) return undefined;
    let frame;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = element.getBoundingClientRect();
        setPoints(dotRefs.current.slice(0, PIPELINE.length).map(dot => {
          const rect = dot.getBoundingClientRect();
          return { x: rect.left + rect.width / 2 - box.left, y: rect.top + rect.height / 2 - box.top };
        }));
      });
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element); window.addEventListener('resize', measure); measure();
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); cancelAnimationFrame(frame); };
  }, [columns, selectedDoc?.id, selectedDoc?.current_status]);
  if (!selectedDoc) return null;
  const closed = isLegacyClosed(selectedDoc.current_status);
  const currentIndex = PIPELINE.indexOf(selectedDoc.current_status);
  const released = selectedDoc.current_status === STATUS.COMPLETED;
  return <ModalShell open onClose={() => setActiveModal(null)} maxWidth="max-w-5xl" title={
    <div className="flex flex-wrap items-center gap-3 pr-6">
      <span className="break-words">{selectedDoc.document_type}</span>
      <span className={`px-3 py-1 rounded-full text-xs ${getStatusTone(selectedDoc.current_status)}`}>{getStatusLabel(selectedDoc.current_status)}</span>
    </div>
  }>
    <dl className="mb-5 p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 text-sm space-y-2">
      <div><dt className="font-bold">Tracking ID</dt><dd className="select-text break-all">{selectedDoc.tracking_number || selectedDoc.id}</dd></div>
      <div><dt className="font-bold">Requested</dt><dd>{new Date(selectedDoc.created_at).toLocaleString()}</dd></div>
    </dl>
    {closed ? <p className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">This is a closed legacy record. It is outside the current processing pipeline.</p> : <div ref={mapRef} className="relative">
      <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {points.slice(0, -1).map((point, index) => {
          const next = points[index + 1];
          return <line key={PIPELINE[index]} data-tracker-connector={index} x1={point.x} y1={point.y} x2={next.x} y2={next.y} strokeWidth="4" className={index < currentIndex || released ? 'stroke-green-600 dark:stroke-green-400' : 'stroke-gray-200 dark:stroke-gray-700'} />;
        })}
      </svg>
      <ol aria-label="Request processing stages" className="relative grid gap-x-2 gap-y-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {PIPELINE.map((status, index) => {
          const row = Math.floor(index / columns), offset = index % columns;
          const col = row % 2 ? columns - offset : offset + 1;
          const done = index < currentIndex || released;
          const active = index === currentIndex && !released;
          const log = selectedDoc.step_logs?.find(entry => entry.to_status === status);
          const timestamp = log?.timestamp_completed || log?.timestamp_started || (index === 0 ? selectedDoc.created_at : null);
          return <li key={status} aria-current={active ? 'step' : undefined} className="min-w-0 min-h-28 flex flex-col items-center text-center" style={{ gridRow: row + 1, gridColumn: col }}>
            <span ref={node => { dotRefs.current[index] = node; }} data-tracker-node={status} className={`z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${done ? 'bg-green-700 border-green-700 text-white' : active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'}`}>{done ? '✓' : index + 1}</span>
            <span className="mt-2 text-xs font-bold leading-snug">{getStageLabel(status)}</span>
            {active && <span className="text-[10px] text-blue-700 dark:text-blue-300">In progress</span>}
            {timestamp && (done || active) && <time className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">{new Date(timestamp).toLocaleDateString()}</time>}
          </li>;
        })}
      </ol>
    </div>}
    <p className={`mt-5 p-4 rounded-2xl text-sm ${closed ? getStatusTone(selectedDoc.current_status) : 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300'}`}>{closed ? getStatusLabel(selectedDoc.current_status) : STAGE_MESSAGE[selectedDoc.current_status] || 'Status information is unavailable.'}</p>
  </ModalShell>;
}
