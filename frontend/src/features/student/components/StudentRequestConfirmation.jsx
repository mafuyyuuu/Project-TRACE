import { useRef } from 'react';
import ModalShell from '@/components/ModalShell';
import Button from '@/components/Button';
import FileUploadField from '@/components/FileUploadField';
import StudentIcon from './StudentIcon';

export function RequestSteps({ review = false }) {
  return <div className="trace-student-request-steps" aria-label={review ? 'Step 2 of 2: Review' : 'Step 1 of 2: Select documents'}><span className={review ? 'trace-step-done' : 'trace-step-current'}>{review ? <StudentIcon name="check-88a55" /> : <b>1</b>}Select documents</span><i aria-hidden="true" /><span className={review ? 'trace-step-current' : ''}><b>2</b>Review</span></div>;
}
export default function StudentRequestConfirmation({ request, loading, onConfirm, onCancel }) {
  const cancelRef = useRef(null);
  const icons = { Name: 'user-32190', 'Student ID': 'id-61511', Documents: 'file-e961e', 'Year Started': 'cal-cfb1c', Attachments: 'paper-23a8e' };
  return <ModalShell open={!!request} title="Confirm Document Request" subtitle={`Submit ${request?.count || 0} document${request?.count === 1 ? '' : 's'} as one request?`} headerIcon={<span className="trace-student-modal-heading-icon"><StudentIcon name="clip-ff0f5" /></span>} maxWidth="max-w-[560px]" panelClassName="trace-modal-panel trace-student-request-confirm max-w-[560px]" busy={loading} onClose={onCancel} closeOnEsc={!loading} closeOnBackdrop={!loading} initialFocusRef={cancelRef} closeButtonIcon={<StudentIcon name="x-e5af3" />} footer={<div className="flex w-full flex-wrap items-center justify-between gap-3"><Button type="button" disabled={loading} onClick={onCancel} className="trace-action flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-gray-300"><StudentIcon name="back-5e52e" />Edit selection</Button><div className="trace-actions"><Button ref={cancelRef} type="button" disabled={loading} onClick={onCancel} className="trace-button trace-button-secondary">Cancel</Button><Button type="button" disabled={loading} onClick={onConfirm} className="trace-button trace-button-primary"><StudentIcon name="check1-40428" />{loading ? 'Submitting…' : 'Confirm Request'}</Button></div></div>}>
    <RequestSteps review />
    <div className="trace-student-request-review space-y-4">{[['STUDENT', request?.summary?.filter(([label]) => ['Name', 'Student ID'].includes(label)) || []], ['REQUEST DETAILS', request?.summary?.filter(([label]) => !['Name', 'Student ID'].includes(label)) || []]].map(([heading, entries]) => <section key={heading} className="trace-student-review-section"><h3>{heading}</h3><dl>{entries.map(([label, value]) => <div key={label}><dt><StudentIcon name={icons[label] || 'cal-cfb1c'} />{label}</dt><dd>{value || 'Not provided'}</dd></div>)}</dl></section>)}
      {!!request?.attachments?.length && <section aria-label="Attached Files" className="grid gap-3 sm:grid-cols-2">{request.attachments.map(({ label, file }) => <FileUploadField key={label} label={label} file={file} allowReplace={false} compactPreview />)}</section>}
      <p className="trace-student-information"><StudentIcon name="info-24570" /><span>Nothing is paid now. The College Secretary confirms the final amount after your documents are printed.</span></p>
    </div>
  </ModalShell>;
}
