import Button from '@/components/Button';
import FileUploadField from '@/components/FileUploadField';
import QueueTabs from '@/components/QueueTabs';
import QueuePanel from '@/components/QueuePanel';
import RequestStaff from '@/components/RequestStaff';
import SubmissionQrPanel from './SubmissionQrPanel';
import WindowIcon from './WindowIcon';
import { getWaitTime } from '@/utils/formatters';
import { requiresAttachment } from '@/utils/documentStatus';

export function WindowDate({ date }) {
  return <div className="trace-date"><span>Today:</span><strong>{date}</strong><WindowIcon name="calendar" /></div>;
}
export function WindowPagination({ count, page, pageSize, onChange, label = 'documents' }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  return <footer className="trace-window-pagination"><p>Showing {Math.min(pageSize, Math.max(0, count - (page - 1) * pageSize))} of {count} {label}</p><div className="trace-actions"><Button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="trace-button trace-button-secondary">Prev</Button><span className="sr-only">Page {page} of {pages}</span><Button type="button" disabled={page >= pages} onClick={() => onChange(page + 1)} className="trace-button trace-button-secondary">Next</Button></div></footer>;
}
function Queue({ kind, documents, pagination, page, onPage, pageSize, now, onProfile, onCheck, onPreview, busy, stats }) {
  const intake = kind === 'intake';
  return <section className="trace-section trace-window-queue" aria-label={intake ? 'Intake queue' : 'Release queue'}>
    <header className="trace-section-header"><div><h3 className="trace-section-title">{intake ? 'Intake Queue' : 'Release Desk'}</h3><p className="trace-admin-caption">{intake ? 'Check the paperwork, then route to the College Secretary.' : 'Confirm the receipt and hand over the finished document.'}</p></div><span className="trace-admin-badge trace-admin-badge-amber">{intake ? 'Awaiting Intake Check' : 'Pending Student Pick-up'}: {documents.length}</span>{!intake && <span className="trace-admin-badge trace-admin-badge-green">Cleared by Secretary Today: {stats.cleared_by_secretary_today || 0}</span>}</header>
    <div ref={pagination?.containerRef} className="trace-window-table-scroll">
      <table className="trace-window-queue-table"><colgroup><col className="w-[17%]"/><col className="w-[22%]"/><col className="w-[22%]"/><col className="w-[15%]"/><col className="w-[12%]"/><col className="w-[12%]"/></colgroup><thead className="sticky top-0 z-10 bg-white dark:bg-gray-900"><tr>{['Tracking Hash', 'Student', 'Document Type', intake ? 'Attachment' : 'Official Receipt', 'Waiting', 'Action'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>
      {documents.slice((page - 1) * pageSize, page * pageSize).map(doc => <tr key={doc.id}>
        <td className="font-mono">#{doc.tracking_number ? doc.tracking_number.slice(0, 10).toUpperCase() : doc.id}</td>
        <td><Button type="button" disabled={!doc.student_id} onClick={() => onProfile(doc.student_id)} className="trace-action trace-window-student">{doc.student_name || 'Name unresolved'}</Button><span className="block mt-1 font-mono text-[.625rem] text-gray-500 dark:text-gray-400">{doc.student_id || 'ID pending'}</span></td>
        <td><strong>{doc.document_type}</strong><RequestStaff document={doc} compact/></td>
        <td>{intake ? <span className={doc.file_path ? 'trace-admin-badge trace-admin-badge-green' : requiresAttachment(doc.document_type) ? 'trace-admin-badge trace-admin-badge-amber' : 'text-gray-500'}>{doc.file_path ? 'Attached' : requiresAttachment(doc.document_type) ? 'Needs scan' : 'None'}</span> : <><span className="font-mono">{doc.or_number || 'OR not recorded'}</span>{doc.official_receipt_path ? <Button type="button" onClick={() => onPreview(doc.official_receipt_path)} className="trace-action block text-emerald-700 dark:text-green-300">View receipt</Button> : <span className="trace-admin-caption block">Digital copy pending</span>}</>}</td>
        <td><span className="trace-window-wait"><WindowIcon name="wait"/>{getWaitTime(intake ? doc.intake_entered_at || doc.created_at : doc.updated_at, now)}</span></td>
        <td><Button type="button" onClick={() => onCheck(doc)} disabled={busy} className="trace-button trace-button-primary trace-window-check"><WindowIcon name="check"/>Check</Button></td>
      </tr>)}
      {!documents.length && <tr><td colSpan={6} className="text-center py-16">{intake ? 'Nothing waiting for intake.' : 'No documents waiting for release.'}</td></tr>}
      </tbody></table>
    </div>
    <WindowPagination count={documents.length} page={page} pageSize={pageSize} onChange={onPage} label={intake ? 'awaiting intake' : 'awaiting pickup'}/>
  </section>;
}
export default function WindowOverview({ stats, intake, release, queueTab, onQueueTab, upload, onManual, onProfile, onIntake, onRelease, onPreview, now, busy }) {
  const cards = [
    ['PROCESSED MANUAL DOCUMENT TODAY', stats.processed_today, 'Documents', 'Documents scanned and routed today', 'scan'],
    ['AWAITING SECRETARY', stats.pending_secretary_count, 'Pending', 'Documents at the Secretary desk awaiting evaluation', 'clock'],
    ['COMPLETED TODAY', stats.completed_today_count, 'Completed', 'Documents released to students today', 'completed'],
  ];
  return <>
    <section className="trace-admin-kpis trace-window-kpis" aria-label="Window 1 summary">{cards.map(([title, value, unit, helper, icon]) => <article key={title} className="trace-admin-kpi"><h3 className="trace-admin-kpi-label">{title}</h3><p className="trace-admin-kpi-value">{value || 0} <span>{unit}</span></p><span className="trace-admin-kpi-icon"><WindowIcon name={icon}/></span><p className="trace-admin-kpi-helper">{helper}</p></article>)}</section>
    <div className="trace-window-workspace"><aside className="min-w-0 space-y-4"><section className="trace-section trace-window-upload"><h3 className="trace-section-title">Upload Document</h3><p className="trace-admin-caption">Upload physical papers to extract data via AI Engine.</p><div className="trace-window-upload-zone"><span className="trace-window-upload-icon"><WindowIcon name="upload"/></span><strong>Scan or upload a document</strong><span>Choose an image or PDF · up to 10 MB</span><FileUploadField label="Scan or upload a document" file={upload.file} onChange={upload.onChange} disabled={busy} showLabel={false}/></div><Button type="button" onClick={onManual} className="trace-button trace-button-secondary w-full"><WindowIcon name="plus"/>Manual Entry</Button></section><SubmissionQrPanel/></aside>
      <section className="min-w-0"><QueueTabs idPrefix="window1-queue" tabs={[{ key: 'intake', label: 'Intake', count: intake.documents.length }, { key: 'release', label: 'Release', count: release.documents.length }]} activeKey={queueTab} onChange={onQueueTab}/><QueuePanel idPrefix="window1-queue" activeKey={queueTab}><Queue kind={queueTab} {...(queueTab === 'intake' ? intake : release)} stats={stats} now={now} onProfile={onProfile} onCheck={queueTab === 'intake' ? onIntake : onRelease} onPreview={onPreview} busy={busy}/></QueuePanel></section>
    </div>
  </>;
}
