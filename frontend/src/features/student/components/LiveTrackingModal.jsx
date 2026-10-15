import { useEffect, useRef, useState } from 'react';
import Button from '@/components/Button';
import StudentIcon from './StudentIcon';
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
  const [copyStatus, setCopyStatus] = useState('');
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
  const nextStage = PIPELINE[currentIndex + 1];
  const completed = released ? PIPELINE.length : Math.max(0, currentIndex);
  const copyTracking = async () => {
    try { await navigator.clipboard.writeText(String(selectedDoc.tracking_number || selectedDoc.id)); setCopyStatus('Tracking ID copied.'); }
    catch { setCopyStatus('Copy unavailable. Select the tracking ID to copy it.'); }
  };
  return <ModalShell open onClose={() => setActiveModal(null)} panelClassName="trace-modal-panel trace-student-live-track max-w-[960px]" title={
    <div className="flex flex-wrap items-center gap-3">
      <span className="break-words">{selectedDoc.document_type}</span>
      <span className={`trace-student-tracking-status ${getStatusTone(selectedDoc.current_status)}`}><StudentIcon name="profile-fce87" />{getStatusLabel(selectedDoc.current_status)}</span>
    </div>
  } subtitle="Live tracking of your document request" closeButtonIcon={<StudentIcon name="profile-e5af3" />}>
    <dl className="trace-student-tracking-summary">
      <div><span className="trace-student-tracking-symbol"><StudentIcon name="profile-34feb" /></span><div className="min-w-0 flex-1"><dt>Tracking ID</dt><dd className="select-text break-all font-mono">{selectedDoc.tracking_number || selectedDoc.id}</dd></div><Button type="button" className="trace-icon-button" aria-label="Copy tracking ID" onClick={copyTracking}><StudentIcon name="profile-16664" /></Button></div>
      <div><span className="trace-student-tracking-symbol"><StudentIcon name="profile-e9e10" /></span><div className="min-w-0"><dt>Requested</dt><dd>{new Date(selectedDoc.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</dd><dd className="trace-student-tracking-caption">{new Date(selectedDoc.created_at).toLocaleTimeString()}</dd></div></div>
      <div><span className="trace-student-tracking-symbol"><StudentIcon name="profile-5615f" /></span><div className="min-w-0"><dt>Current step</dt><dd>{closed ? getStatusLabel(selectedDoc.current_status) : getStageLabel(selectedDoc.current_status)}</dd>{currentIndex >= 0 && <dd className="trace-student-tracking-caption">Step {currentIndex + 1} of {PIPELINE.length}</dd>}</div></div>
    </dl>
    {copyStatus && <p role="status" className="trace-student-tracking-caption mb-3">{copyStatus}</p>}
    {closed ? <p className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800">This is a closed legacy record. It is outside the current processing pipeline.</p> : <section className="trace-student-tracking-progress"><header><h4>Request progress</h4><span className="trace-student-profile-badge">{completed} of {PIPELINE.length} completed</span></header><div ref={mapRef} className="relative">
      <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
        {points.slice(0, -1).map((point, index) => {
          const next = points[index + 1];
          const distance = Math.hypot(next.x - point.x, next.y - point.y);
          const ratio = distance ? Math.min(22 / distance, .45) : 0;
          const dx = (next.x - point.x) * ratio, dy = (next.y - point.y) * ratio;
          return <line key={PIPELINE[index]} data-tracker-connector={index} x1={point.x + dx} y1={point.y + dy} x2={next.x - dx} y2={next.y - dy} strokeWidth="3" className={index < currentIndex || released ? 'stroke-trace-emerald dark:stroke-green-400' : 'stroke-gray-200 dark:stroke-gray-700'} />;
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
          return <li key={status} aria-current={active ? 'step' : undefined} className="min-w-0 flex flex-col items-center text-center" style={{ gridRow: row + 1, gridColumn: col }}>
            <span ref={node => { dotRefs.current[index] = node; }} data-tracker-node={status} className={`trace-student-tracking-dot z-10 rounded-full border-2 flex items-center justify-center text-xs font-bold ${done ? 'bg-trace-emerald border-trace-emerald text-white' : active ? 'bg-trace-emerald border-trace-emerald text-white trace-student-tracking-active' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'}`}>{done ? <StudentIcon name="profile-a2374" /> : index + 1}</span>
            <span className={'trace-student-tracking-label ' + (active ? 'text-trace-emerald dark:text-green-300' : done ? 'text-gray-900 dark:text-gray-100' : 'text-slate-400')}>{getStageLabel(status)}</span>
            {active && <span className="trace-student-profile-badge mt-2">In progress</span>}
            {timestamp && (done || active) && <time className="mt-2 text-[0.6875rem] text-gray-500 dark:text-gray-400">{new Date(timestamp).toLocaleDateString()}</time>}
          </li>;
        })}
      </ol>
    </div></section>}
    <div className="trace-student-tracking-guidance"><span className="trace-student-tracking-symbol"><StudentIcon name="profile-5bd8e" /></span><div className="min-w-0"><p className="font-semibold">{closed ? getStatusLabel(selectedDoc.current_status) : STAGE_MESSAGE[selectedDoc.current_status] || 'Status information is unavailable.'}</p>{!closed && nextStage && <p className="trace-student-tracking-caption">Next step: {getStageLabel(nextStage)}</p>}</div></div>
  </ModalShell>;
}
