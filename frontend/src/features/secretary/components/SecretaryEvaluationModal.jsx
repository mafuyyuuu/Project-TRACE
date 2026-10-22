import { useId, useRef, useState } from 'react';
import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { secretaryPurpose } from '@/utils/secretaryPresentation';
import RequestMessagesPanel from '@/components/RequestMessagesPanel';
import ModalShell from '@/components/ModalShell';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import SecretaryIcon, { SecretaryHeaderIcon } from './SecretaryIcon';
import SecretaryCaseSummary from './SecretaryCaseSummary';
import {addWorkingDays,calendarDate,estimate} from '@/utils/releasePolicy';

function EvaluationForm({ selectedDoc, evalStudentId, setEvalStudentId, evalStudentName, setEvalStudentName, evalDocType, setEvalDocType, documentTypes, documentTypesError, estimatedReadyDate, setEstimatedReadyDate, clerkNotes, setClerkNotes, busy }) {
  const id = useId(), purpose = secretaryPurpose(selectedDoc.purpose);
  const policy=estimate({...selectedDoc,document_type:evalDocType || selectedDoc.document_type,
    release_working_days:evalDocType && evalDocType!==selectedDoc.document_type ? null : selectedDoc.release_working_days},
    {user_type:selectedDoc.student_user_type,enrollment_status:selectedDoc.student_enrollment_status});
  return <>
    {purpose.length > 0 && <section className="trace-secretary-purpose" aria-label="Student purpose"><h4><SecretaryIcon name="1e0a7" />Student purpose</h4><dl>{purpose.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></section>}
    <section className="trace-secretary-evaluation-form" aria-label="Evaluation details"><h4><SecretaryIcon name="49830" />Evaluation details</h4><div className="trace-secretary-field-grid">
      <label className="trace-label" htmlFor={id+'-id'}>Student ID<div className="trace-secretary-input"><SecretaryIcon name="a7dfb" /><input id={id+'-id'} maxLength={INPUT_LIMITS.id} value={evalStudentId} onChange={e=>setEvalStudentId(e.target.value)} disabled={busy} className="trace-control" /></div></label>
      <label className="trace-label" htmlFor={id+'-name'}>Student Name<div className="trace-secretary-input"><SecretaryIcon name="150b0" /><input id={id+'-name'} maxLength={INPUT_LIMITS.name} value={evalStudentName} onChange={e=>setEvalStudentName(e.target.value)} disabled={busy} className="trace-control" /></div></label>
      <label className="trace-label" htmlFor={id+'-type'}>Document Type<div className="trace-secretary-input"><SecretaryIcon name="3132d" /><select id={id+'-type'} value={evalDocType} onChange={e=>setEvalDocType(e.target.value)} disabled={busy} className="trace-control">{!documentTypes.some(type=>type.name===evalDocType) && <option value={evalDocType}>{evalDocType}</option>}{documentTypes.map(type=><option key={type.id || type.name} value={type.name}>{type.name}</option>)}</select></div>{documentTypesError && <span role="alert" className="trace-inline-error">{documentTypesError}</span>}</label>
      <label className="trace-label" htmlFor={id+'-ready'}>Ready By <span className="text-red-600 dark:text-red-300">*</span><input id={id+'-ready'} type="date" value={policy.date || estimatedReadyDate || ''} readOnly={Boolean(policy.date)} onChange={e=>setEstimatedReadyDate(e.target.value)} min={calendarDate(selectedDoc.created_at) || undefined} max={addWorkingDays(selectedDoc.created_at,15) || undefined} disabled={busy} className="trace-control w-full" /><span className="trace-secretary-field-hint">{policy.date ? `Automatically calculated: ${policy.working_days} working days from submission, Monday–Thursday. ` : 'Choose a Monday–Thursday date within 15 working days of submission. '}Sent to the student; the amount is set after printing.</span></label>
    </div><label className="trace-label block" htmlFor={id+'-notes'}>Secretary Notes<textarea id={id+'-notes'} maxLength={INPUT_LIMITS.notes} value={clerkNotes} onChange={e=>setClerkNotes(e.target.value)} disabled={busy} placeholder="Add any remarks…" className="trace-control w-full min-h-28 resize-y" /></label></section>
  </>;
}

export default function SecretaryEvaluationModal({ user, selectedDoc, setActiveModal, evalStudentId, setEvalStudentId, evalStudentName, setEvalStudentName, evalDocType, setEvalDocType, documentTypes = [], documentTypesError, estimatedReadyDate, setEstimatedReadyDate, clerkNotes, setClerkNotes, actionLoading, handleSecretaryEvaluate, setViewImageUrl }) {
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const toggle = useRef(null), discussionId = useId();
  if (!selectedDoc) return null;
  const props = { selectedDoc, evalStudentId, setEvalStudentId, evalStudentName, setEvalStudentName, evalDocType, setEvalDocType, documentTypes, documentTypesError, estimatedReadyDate, setEstimatedReadyDate, clerkNotes, setClerkNotes, busy: actionLoading };
  return <ModalShell open onClose={()=>{if(!actionLoading)setActiveModal(null);}} busy={actionLoading}
    title={selectedDoc.file_path ? 'AI Data Extraction Review' : 'Digital Request Evaluation'} subtitle={selectedDoc.file_path ? 'Verify extracted data against the original document.' : 'Evaluate and process the student’s digital request. Discussion stays separate from these fields.'}
    headerIcon={<SecretaryHeaderIcon name="ff0f5" />} headerBadge={<span className="trace-secretary-stage-badge">Step 1 · Initial Evaluation</span>} closeButtonIcon={<SecretaryIcon name="e5af3" />}
    panelClassName="trace-modal-panel trace-secretary-dialog trace-secretary-evaluation max-w-[1200px] h-[min(940px,92dvh)]" bodyClassName="trace-modal-body trace-secretary-evaluation-body"
    footer={<div className="trace-secretary-modal-actions"><p className="trace-secretary-footer-note"><SecretaryIcon name="1163a" />Ready By is sent to the student. The amount is set later.</p><div className="trace-actions"><Button type="button" disabled={actionLoading} onClick={()=>handleSecretaryEvaluate('reject')} className="trace-button trace-secretary-return"><SecretaryIcon name="b6f44" />Return to Window 1</Button><Button type="button" disabled={actionLoading} onClick={()=>handleSecretaryEvaluate('approve')} className="trace-button trace-button-primary"><SecretaryIcon name="c7c6c" />Accept for Processing</Button></div></div>}>
    <Button ref={toggle} type="button" aria-expanded={discussionOpen} aria-controls={discussionId} onClick={()=>{setDiscussionOpen(value=>!value);toggle.current?.focus({preventScroll:true});}} className="trace-button trace-button-secondary trace-secretary-discussion-toggle">{discussionOpen ? 'Back to evaluation' : 'Open discussion'}</Button>
    <div className="trace-secretary-evaluation-columns"><section aria-label="Evaluation fields" className={'trace-secretary-evaluation-fields ' + (discussionOpen ? 'trace-secretary-mobile-hidden' : '')}>
      {selectedDoc.file_path && <section className="trace-secretary-scan"><h4>Original Scan <span>{selectedDoc.original_filename || 'Uploaded document'}</span></h4><AuthedFilePreview path={selectedDoc.file_path} alt="Scanned Document" iframeTitle="PDF Preview" className="max-h-72 w-full object-contain" onClick={()=>setViewImageUrl(selectedDoc.file_path)} wrapperClassName="w-full" /></section>}
      <SecretaryCaseSummary document={selectedDoc} studentId={evalStudentId} studentName={evalStudentName} documentType={evalDocType} routing /><EvaluationForm {...props} />
    </section><section id={discussionId} aria-label="Request discussion" className={'trace-secretary-discussion ' + (!discussionOpen ? 'trace-secretary-mobile-hidden' : '')}><h4>Discussion <span className="trace-secretary-tracking-chip">{selectedDoc.tracking_number || selectedDoc.id}</span></h4><div className="min-h-0 flex-1"><RequestMessagesPanel initialDocumentId={selectedDoc.id} user={user} compact autoFocusConversation={false} /></div></section></div>
  </ModalShell>;
}
