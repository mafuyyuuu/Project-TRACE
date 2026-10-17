import ReviewIcon from '@/components/ReviewIcon';
import { useRef } from 'react';
import ModalShell from '@/components/ModalShell';
import Button from '@/components/Button';
import FileUploadField from '@/components/FileUploadField';
import StudentIcon from './StudentIcon';

export function RequestSteps({ step = 1, review = false }) {
  const current = review ? 3 : step;
  return <ol className="trace-student-request-steps" aria-label={`Step ${current} of 3: ${['Select documents', 'Fill up details', 'Review'][current - 1]}`}>{['Select documents', 'Fill up details', 'Review'].map((label, i) => <li key={label} className={i + 1 < current ? 'trace-step-done' : i + 1 === current ? 'trace-step-current' : ''} aria-current={i + 1 === current ? 'step' : undefined}><span>{i + 1 < current ? <StudentIcon name="check-88a55" /> : <b>{i + 1}</b>}{label}</span>{i < 2 && <i aria-hidden="true" />}</li>)}</ol>;
}
export default function StudentRequestConfirmation({ request, loading, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  return <ModalShell open={!!request} title="Confirm Document Request" subtitle={`Submit ${request?.count || 0} document${request?.count === 1 ? '' : 's'} as one request?`} headerIcon={<span className="trace-student-modal-heading-icon"><StudentIcon name="clip-ff0f5" /></span>} maxWidth="max-w-[560px]" panelClassName="trace-modal-panel trace-student-request-confirm max-w-[560px]" busy={loading} onClose={onCancel} closeOnEsc={!loading} closeOnBackdrop={!loading} initialFocusRef={cancelRef} closeButtonIcon={<StudentIcon name="x-e5af3" />} footer={<div className="flex w-full flex-wrap items-center justify-between gap-3"><Button type="button" disabled={loading} onClick={onCancel} className="trace-action flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300"><StudentIcon name="back-5e52e" />Edit selection</Button><div className="trace-actions"><Button ref={cancelRef} type="button" disabled={loading} onClick={onCancel} className="trace-button trace-button-secondary">Cancel</Button><Button type="button" disabled={loading} onClick={onConfirm} className="trace-button trace-button-primary"><StudentIcon name="check1-40428" />{loading ? 'Submitting…' : 'Confirm Request'}</Button></div></div>}>
    <RequestSteps review />
    <StudentRequestReview request={request} />
  </ModalShell>;
}

export function StudentRequestReview({ request }) {
  const icons = { Name: 'user-32190', 'Student ID': 'id-61511', Documents: 'file-e961e', 'Year Started': 'cal-cfb1c', Attachments: 'paper-23a8e' };
  return <div className="trace-student-request-review space-y-4"><section className="trace-student-review-section"><h3>STUDENT</h3><dl>{request?.summary?.filter(([label]) => ['Name','Student ID'].includes(label)).map(([label,value]) => <div key={label}><dt><StudentIcon name={icons[label]} />{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <section className="trace-student-review-section"><h3>DOCUMENTS · {request?.count || 0}</h3>{request?.items?.length ? <ul className="trace-request-review-documents">{request.items.map(item => <li key={item.name}><ReviewIcon name="c65aa" /><div><strong>{item.name}</strong><p>Purpose: {item.purpose || 'Not entered'}{item.year_started ? ` · Year Started: ${item.year_started}` : ''}{item.year_graduated ? ` · Year Graduated: ${item.year_graduated}` : ''}</p>{item.requestingSchool && <p>Requesting school / company: {item.requestingSchool}</p>}<p>Attachment: {item.file?.name || 'None'}</p></div><span>{item.copies} {Number(item.copies) === 1 ? 'copy' : 'copies'}</span></li>)}</ul> : <dl>{request?.summary?.filter(([label]) => !['Name','Student ID'].includes(label)).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}</section>
      {!!request?.attachments?.length && <section aria-label="Attached Files" className="grid gap-3 sm:grid-cols-2">{request.attachments.map(({ label, file }) => <FileUploadField key={label} label={label} file={file} allowReplace={false} compactPreview />)}</section>}
      <p className="trace-student-information"><StudentIcon name="info-24570" /><span>Nothing is paid now. The College Secretary confirms the final amount after your documents are printed.</span></p>
    </div>;
}
