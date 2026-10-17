import Button from '@/components/Button';
import PaginatedTable from '@/components/PaginatedTable';
import QueueTabs from '@/components/QueueTabs';
import QueuePanel from '@/components/QueuePanel';
import RequestStaff from '@/components/RequestStaff';
import SecretaryIcon from './SecretaryIcon';
import { SecretaryAvatar } from './SecretaryCaseSummary';
import { formatDateTime, getRelativeTime, todayLongDate } from '@/utils/formatters';
import { formatPeso } from '@/utils/pricing';

const QUEUES = {
  intake: { title:'Delegated Intake', step:1, description:'Admin assigned these intake checks to you as backup for Window 1. Review the paperwork and route through the existing process.', extra:['Waiting','Status'], action:'Intake Check', icon:'515fb' },
  evaluation: { title: 'Initial Evaluation', step: 1, description: 'Check the request, then give the student a date to expect it by.', extra: ['Waiting', 'Status'], action: 'Review', icon: '515fb' },
  processing: { title: 'Processing & Pricing', step: 2, description: 'Process the document, then set the final amount the student pays once it is printed.', extra: ['Promised by', 'Price', 'Status'], action: 'Set Price', icon: '1764a' },
  'or-verification': { title: 'OR Verification', step: 3, description: 'Finance has confirmed the payment. Check the Official Receipt is present and the number looks right before handoff.', extra: ['Official Receipt'], action: 'Verify Receipt', icon: 'efd9e' },
  handoff: { title: 'Final Handoff', step: 4, description: 'Paid and signed. Confirm once the printed document is physically at Window 1.', extra: ['Paid'], action: 'Handed to Window 1', icon: '9c610' },
};

function UnpaidBadge() { return <span className="trace-secretary-payment trace-secretary-payment-unpaid"><SecretaryIcon name="00e30" />UNPAID</span>; }

function QueueCells({ kind, document, onPreview }) {
  if (kind === 'evaluation' || kind === 'intake') return <><td><span className="trace-secretary-wait"><SecretaryIcon name="b9265" />{getRelativeTime(document.created_at)}</span></td><td><UnpaidBadge /></td></>;
  if (kind === 'processing') return <><td><time dateTime={document.estimated_ready_date || undefined} title={formatDateTime(document.estimated_ready_date)}>{document.estimated_ready_date ? new Date(document.estimated_ready_date).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</time></td><td>{document.priced_at ? formatPeso(document.amount) : <span className="trace-secretary-not-set">NOT SET</span>}</td><td><UnpaidBadge /></td></>;
  if (kind === 'or-verification') return <td><span className={`trace-secretary-payment ${document.or_number ? 'trace-secretary-payment-paid' : 'trace-secretary-payment-unpaid'}`}><SecretaryIcon name={document.or_number ? '18446' : '0d87b'} />{document.or_number || 'None on file'}</span>{document.official_receipt_path && <Button type="button" onClick={() => onPreview(document.official_receipt_path)} className="trace-action mt-2 block">View receipt</Button>}</td>;
  return <td><span className="trace-secretary-payment trace-secretary-payment-paid"><SecretaryIcon name="18446" />Paid & signed</span><strong className="block mt-1">{formatPeso(document.amount)}</strong><span className="trace-admin-caption font-mono">OR {document.or_number || 'not recorded'}</span></td>;
}

export default function SecretaryOverview({ stats, queues, activeQueue, onQueue, onProfile, onEvaluate, onPrice, onVerify, onHandoff, onPreview, onIntake, busy }) {
  const current = QUEUES[activeQueue], rows = queues[activeQueue];
  const act = { intake:onIntake, evaluation: onEvaluate, processing: onPrice, 'or-verification': onVerify, handoff: onHandoff }[activeQueue];
  const cards = [
    ['PROCESSED DOCUMENT TODAY', stats.processed_today, 'Documents', 'Documents evaluated and routed today', 'daeeb'],
    ['PENDING DOCUMENTS', stats.pending_secretary_count, 'Documents', 'Documents waiting your verification review', '0d74d'],
    ['APPROVED & ROUTED', (Number(stats.ready_window_1_count) || 0) + (Number(stats.completed_today_count) || 0), 'Done', 'Approved and routed to Window 1 for release', '7958b'],
  ];
  return <>
    <header className="trace-page-header trace-secretary-greeting"><h2 className="trace-page-title">Welcome back, <span>College Secretary</span></h2><div className="trace-date"><strong>Today:</strong><span>{todayLongDate()}</span><SecretaryIcon name="45f7e" /></div></header>
    <section aria-label="College Secretary summary" className="trace-secretary-kpis">{cards.map(([title, value, unit, helper, icon], index) => <article key={title} className="trace-secretary-kpi"><div><h3>{title}</h3><p className="trace-secretary-kpi-value">{Number(value) || 0} <span>{unit}</span></p><span className="trace-secretary-kpi-icon"><SecretaryIcon name={icon} /></span></div><p className={`trace-secretary-kpi-helper ${index === 1 ? 'trace-secretary-kpi-helper-primary' : ''}`}><SecretaryIcon name={index === 1 ? 'bb9b0' : '874a5'} />{helper}</p></article>)}</section>
    <QueueTabs idPrefix="secretary-queue" tabs={Object.entries(QUEUES).filter(([key]) => key !== 'intake' || queues.intake?.length).map(([key, value]) => ({ key, label: value.title, count: queues[key].length }))} activeKey={activeQueue} onChange={onQueue} />
    <QueuePanel idPrefix="secretary-queue" activeKey={activeQueue}><section className={`trace-section trace-secretary-queue trace-secretary-queue-${activeQueue}`} aria-label={current.title + ' queue'}>
      <header className="trace-secretary-queue-heading"><span className="trace-secretary-step">STEP {current.step}</span><div><h3>{current.title}</h3><p>{current.description}</p></div></header>
      <PaginatedTable label="documents" resetKey={activeQueue} aria-label={current.title + ' documents'} className="trace-secretary-queue-table"><colgroup><col className="w-[20%]" /><col className={activeQueue === 'processing' ? 'w-[30%]' : activeQueue === 'evaluation' ? 'w-[35%]' : 'w-[42%]'} />{current.extra.map(label => <col key={label} />)}<col className="w-[19%]" /></colgroup><thead><tr>{['Document Details', 'Category', ...current.extra, 'Action'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
        {rows.map(document => <tr key={document.id}><td><div className="trace-secretary-student-cell"><SecretaryAvatar name={document.student_name} /><div className="min-w-0"><Button type="button" disabled={!document.student_id} onClick={() => onProfile(document.student_id)} className="trace-action text-left">{document.student_name || 'Unresolved student'}</Button><span className="trace-secretary-row-tracking">#{document.tracking_number || document.id}</span></div></div></td><td><strong className="block mb-2">{document.document_sequence_number || document.document_type}</strong><RequestStaff assignmentOnly document={document} /></td><QueueCells kind={activeQueue} document={document} onPreview={onPreview} /><td><Button type="button" disabled={busy} onClick={() => act(document)} className="trace-button trace-button-primary trace-secretary-queue-action"><SecretaryIcon name={current.icon} />{activeQueue === 'processing' && document.priced_at ? 'Adjust Price' : current.action}</Button></td></tr>)}
        {!rows.length && <tr><td colSpan={current.extra.length + 3} className="text-center py-12">No documents waiting in this queue.</td></tr>}
      </tbody></PaginatedTable>
    </section></QueuePanel>
  </>;
}
