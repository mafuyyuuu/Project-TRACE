import { isCollegeOrFinance } from '@/utils/secretaryPresentation';
import SecretaryIcon, { SecretaryHeaderIcon } from '@/features/secretary/components/SecretaryIcon';
import SecretaryRequirementPreview from '@/features/secretary/components/SecretaryRequirementPreview';
import { formatDateTime } from '@/utils/formatters';
import { useState } from 'react';
import Button from '@/components/Button';
import AdminIcon from '@/features/admin/components/AdminIcon';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import FileUploadField from '@/components/FileUploadField';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import useRequestAttachments from '@/hooks/useRequestAttachments';
import useRequirementHistory from '@/hooks/useRequirementHistory';

function RequirementHistory({row,ticketId,sourcePresentation=false}) {
  const history=useRequirementHistory({ticketId,documentId:row.document_id,requirementId:row.id});
  return <div className="space-y-2">
    <Button type="button" aria-expanded={history.open} disabled={history.loading} onClick={()=>history.open ? history.close() : void history.load()} className={sourcePresentation ? 'trace-secretary-history-action' : 'trace-action underline'}>{sourcePresentation && <SecretaryIcon name="a82cf" />}<span>{history.open ? 'Hide' : 'View'} upload and review history</span>{sourcePresentation && <SecretaryIcon name="a917c" />}</Button>
    {history.open && <div className="space-y-3 rounded-lg border border-current/20 p-3">
      {history.loading && <p role="status">Loading requirement history…</p>}
      {history.error && <p role="alert">{history.error} <Button type="button" onClick={()=>void history.load()} className="trace-action underline">Retry history</Button></p>}
      {!history.loading && !history.error && !history.events.length && <p>Detailed events were not recorded for this older requirement. Its retained upload and last review appear above.</p>}
      {history.events.map(event=><article key={event.id} className="space-y-1 border-b border-current/20 pb-2">
        <p className="font-semibold">{event.event_type.replaceAll('_',' ')} · {event.actor_name || 'Recorded account'}</p>
        <time dateTime={event.created_at}>{formatDateTime(event.created_at)} (Manila)</time>
        {event.snapshot.review_notes && <p className="break-words whitespace-pre-wrap">{event.snapshot.review_notes}</p>}
        {event.snapshot.file_path && <AuthedFilePreview path={event.snapshot.file_path} alt={row.label} iframeTitle={row.label} className="max-h-32 max-w-full object-contain" />}
      </article>)}
      {history.next_cursor && <Button type="button" disabled={history.loading} onClick={()=>void history.load(history.next_cursor)} className="trace-button trace-button-secondary">Load older requirement events</Button>}
    </div>}
  </div>;
}
export function RequirementBubble({ row,user,readOnly,onAction,ticketId,variant }) {
  if(!row) return <p className="text-sm">Requirement details are loading. Retry conversation if they remain unavailable.</p>;
  if (isCollegeOrFinance(user)) return <div className="trace-secretary-requirement"><header><span className="trace-secretary-requirement-file"><SecretaryIcon name="03d50" /></span><div className="min-w-0"><h4>{row.label}</h4><p><SecretaryIcon name="9adde" /><span className="min-w-0 flex-1 break-words">Requested by {row.requested_by_name || 'Registrar'} · {formatDateTime(row.created_at)} (Manila)</span></p></div></header>
    {Number(row.blocks_intake) === 1 && !row.superseded_at && <p className="trace-secretary-warning">Intake clearance requirement · {row.status === 'accepted' ? 'Cleared' : 'Routing blocked until accepted'}</p>}
    <div className="trace-secretary-requirement-content">{row.file_path && <AuthedFilePreview path={row.file_path} alt={row.label} iframeTitle={row.label} className="w-full max-h-40 rounded-lg object-contain" />}<div className="min-w-0 space-y-3"><span className={'trace-secretary-payment '+(row.status==='accepted'?'trace-secretary-payment-paid':'trace-secretary-payment-unpaid')}><SecretaryIcon name="e17ee" />{row.superseded_at ? 'Replaced — retained history' : {requested:'Awaiting upload',uploaded:'Submitted — awaiting review',accepted:'Accepted',rejected:'Rejected — upload a corrected copy'}[row.status] || 'Recorded requirement'}</span><div className="trace-secretary-requirement-instructions"><span>Instructions</span><p>{row.instructions}</p></div><RequirementHistory key={`${ticketId || row.document_id}:${row.id}`} row={row} sourcePresentation ticketId={ticketId} />{row.review_notes && <p className="whitespace-pre-wrap break-words">Review: {row.review_notes}</p>}{row.reviewed_by_name && <p>Reviewed by {row.reviewed_by_name}</p>}</div></div>
    {!readOnly && !row.superseded_at && <footer>{row.status==='uploaded' && <Button type="button" onClick={()=>onAction(row)} className="trace-button trace-button-primary"><SecretaryIcon name="66566" />Review {row.label}</Button>}<Button type="button" onClick={()=>onAction({...row,replacement:true})} className="trace-button trace-button-secondary"><SecretaryIcon name="f385c" />Request replacement</Button></footer>}
  </div>;
  if (user.role === 'admin' && variant === 'linked') return <div className="trace-admin-linked-requirement">
    <div className="space-y-5 p-5"><header className="flex flex-wrap items-center justify-between gap-3"><h4 className="flex items-center gap-3 text-lg font-semibold"><span className="trace-admin-neutral-icon"><AdminIcon name="linked-file-text" /></span>{row.label}</h4><span className="trace-admin-timezone"><AdminIcon name="linked-clock3" />{row.superseded_at ? 'Replaced — retained history' : {requested:'Awaiting upload',uploaded:'Submitted — awaiting review',accepted:'Accepted',rejected:'Rejected — upload a corrected copy'}[row.status] || 'Recorded requirement'}</span></header>
      {Number(row.blocks_intake) === 1 && !row.superseded_at && <p className="text-sm text-amber-800 dark:text-amber-300">Intake clearance requirement · {row.status === 'accepted' ? 'Cleared' : 'Routing blocked until accepted'}</p>}
      <div><p className="trace-admin-caption">Request note</p><p className="mt-2 select-text whitespace-pre-wrap break-words text-sm">{row.instructions}</p></div>
      <div className="space-y-2 border-t border-gray-100 pt-4 text-xs text-[#647084] dark:border-gray-700 dark:text-gray-400"><p>Requested by <strong className="text-trace-ink dark:text-gray-100">{row.requested_by_name || 'Registrar'}</strong></p><time dateTime={row.created_at}>{formatDateTime(row.created_at)} (Manila)</time></div>
      {row.review_notes && <p className="select-text whitespace-pre-wrap break-words text-sm">Review: {row.review_notes}</p>}{row.reviewed_by_name && <p className="text-sm">Reviewed by {row.reviewed_by_name}</p>}
    </div><footer className="space-y-4 border-t border-gray-100 bg-[#fafbfc] p-5 dark:border-gray-700 dark:bg-gray-800">{row.file_path ? <AuthedFilePreview path={row.file_path} alt={row.label} iframeTitle={row.label} className="max-h-40 max-w-full object-contain" /> : <p className="text-xs text-[#647084] dark:text-gray-400">No files uploaded yet.</p>}<RequirementHistory key={`${ticketId || row.document_id}:${row.id}`} row={row} ticketId={ticketId} /></footer>
  </div>;
  return <div className="space-y-2">
    <h4 className="font-bold break-words">{row.label}</h4>
    {Number(row.blocks_intake) === 1 && !row.superseded_at && <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Intake clearance requirement · {row.status === 'accepted' ? 'Cleared' : 'Routing blocked until accepted'}</p>}
    <p className="whitespace-pre-wrap break-words select-text">{row.instructions}</p>
    <p className="text-sm">Requested by {row.requested_by_name || 'Registrar'} · {formatDateTime(row.created_at)} (Manila)</p>
    <p className="font-semibold">{row.superseded_at ? 'Replaced — retained history' : {requested:'Awaiting upload',uploaded:'Submitted — awaiting review',accepted:'Accepted',rejected:'Rejected — upload a corrected copy'}[row.status]}</p>
    {row.review_notes && <p className="whitespace-pre-wrap break-words">Review: {row.review_notes}</p>}
    {row.reviewed_by_name && <p className="text-sm">Reviewed by {row.reviewed_by_name}</p>}
    {row.file_path && <AuthedFilePreview path={row.file_path} alt={row.label} iframeTitle={row.label} className="max-h-40 max-w-full object-contain" />}
    <RequirementHistory key={`${ticketId || row.document_id}:${row.id}`} row={row} ticketId={ticketId} />
    {!readOnly && !row.superseded_at && user.role==='student' && ['requested','rejected'].includes(row.status) && <Button type="button" onClick={() => onAction(row)} className="trace-button trace-button-secondary">Upload file for {row.label}</Button>}
    {!readOnly && !row.superseded_at && (user.role !== 'admin' && ['Window 1','Receiving Desk','Secretary'].includes(user.desk_assignment)) && row.status==='uploaded' && <Button type="button" onClick={() => onAction(row)} className="trace-button trace-button-secondary">Review {row.label}</Button>}
    {!readOnly && !row.superseded_at && (user.role !== 'admin' && ['Window 1','Receiving Desk','Secretary'].includes(user.desk_assignment)) && <Button type="button" onClick={() => onAction({...row,replacement:true})} className="trace-button trace-button-secondary">Request replacement</Button>}
  </div>;
}

export default function SupportRequirementDialog({ documentId,user,selection,onClose,onSaved }) {
  const state = useRequestAttachments(documentId);
  const [catalogId,setCatalogId] = useState(selection?.replacement && selection.catalog_id ? String(selection.catalog_id) : ''), [instructions,setInstructions] = useState(''), [file,setFile] = useState(null), [notes,setNotes] = useState('');
  const secretary = isCollegeOrFinance(user);
  const upload = user.role==='student', review = selection && !selection.replacement && !upload;
  const available = state.types.filter(type => !state.rows.some(row => Number(row.catalog_id)===Number(type.id) && !row.superseded_at && row.status!=='rejected') || Number(type.id)===Number(selection?.catalog_id));
  const stage = () => state.stage(upload ? {kind:'upload',id:selection.id,file} : review ? {kind:'review',id:selection.id,action:'accept',notes} : {kind:'request',catalog_id:Number(catalogId),replacement_of:selection?.replacement ? selection.id : undefined,instructions:instructions.trim()});
  return <>
    <ModalShell open busy={state.saving} headerIcon={secretary ? <SecretaryHeaderIcon name={review ? 'e8d23' : selection?.replacement ? 'd8a74' : 'ef562'} /> : undefined} headerBadge={secretary && review ? <span className="trace-secretary-payment trace-secretary-payment-unpaid">Awaiting review</span> : undefined} subtitle={secretary ? review ? 'Check the submitted document, then accept it or ask for a corrected copy.' : selection?.replacement ? 'Ask the student to upload a new copy of this document.' : 'Ask the student for an additional document for this case.' : undefined} panelClassName={secretary ? `trace-modal-panel trace-secretary-dialog trace-secretary-requirement-dialog ${review ? 'max-w-[640px]' : selection?.replacement ? 'max-w-[560px]' : 'max-w-[540px]'}` : undefined} title={upload ? `Upload ${selection.label}` : review ? `Review ${selection.label}` : selection?.replacement ? secretary ? 'Replace Document' : `Replace ${selection.label}` : 'Request Supporting Document'} onClose={() => { if(!state.saving) onClose(); }} footer={<div className={secretary ? "trace-secretary-modal-actions" : "trace-actions"}>{secretary && !review && <p className="trace-secretary-footer-note"><SecretaryIcon name="1163a" />{catalogId ? 'Review the case instructions' : 'Select a type to continue'}</p>}<div className="trace-actions">{secretary && (review ? <Button type="button" disabled={state.saving || state.loading || state.readOnly || !notes.trim()} onClick={()=>state.stage({kind:'review',id:selection.id,action:'resubmit',notes})} className="trace-button trace-secretary-return"><SecretaryIcon name="e8a8f" />Request corrected copy</Button> : <Button type="button" disabled={state.saving} onClick={onClose} className="trace-button trace-button-secondary">Cancel</Button>)}<Button type="button" disabled={state.saving || state.loading || state.readOnly || (upload ? !file : review ? false : !catalogId || !instructions.trim() || (secretary && !available.some(type=>Number(type.id)===Number(catalogId))))} onClick={stage} className="trace-button trace-button-primary">{secretary && <SecretaryIcon name={review ? 'c7c6c' : '99653'} />}{upload ? 'Submit document' : review ? 'Accept document' : 'Request document'}</Button></div></div>}>
      <div className="space-y-4">
        {state.loading && <p role="status">Loading case requirements…</p>}
        {state.error && <p role="alert" className="text-red-700 dark:text-red-300">{state.error}</p>}
        {state.readOnly && <p>Closed cases are read-only.</p>}
        {upload ? <FileUploadField label={selection.label} file={file} onChange={setFile} accept=".jpg,.jpeg,.png,.pdf" maxBytes={10*1024*1024} disabled={state.saving} /> : review ? <>
          {secretary ? <SecretaryRequirementPreview requirement={selection} /> : selection.file_path && <AuthedFilePreview path={selection.file_path} alt={selection.label} iframeTitle={selection.label} className="max-h-64 max-w-full object-contain" />}
          <label className="trace-label block">Review Notes {secretary && <span className="trace-secretary-optional">Optional</span>}<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} className="trace-control mt-1 w-full" /></label>
          {!secretary && <Button type="button" disabled={state.saving || !notes.trim()} onClick={() => state.stage({kind:'review',id:selection.id,action:'resubmit',notes})} className="trace-button trace-button-danger">Request corrected copy</Button>}
        </> : <>
          <label className="trace-label block">Required Document<select value={catalogId} onChange={e => setCatalogId(e.target.value)} disabled={state.saving || Boolean(selection?.replacement && selection.catalog_id)} className="trace-control mt-1 w-full"><option value="">Choose an approved type</option>{available.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          {selection?.replacement && selection.catalog_id && !available.some(type=>Number(type.id)===Number(selection.catalog_id)) && <p role="alert">This document type is inactive. Ask Admin to restore it before requesting a replacement.</p>}
          {!state.loading && !available.length && <div className={secretary ? 'trace-secretary-warning' : 'text-sm'}>{secretary && <SecretaryIcon name="f61b5" />}<p>{secretary && <strong className="block mb-1">No approved types yet</strong>}No new document types are available. Admin must enter Registrar-approved types, or review an existing requirement.</p></div>}{secretary && catalogId && available.length > 0 && <div className="trace-secretary-notice"><SecretaryIcon name="f61b5" /><div><strong>The student will be notified</strong><p>They’ll see this case request and its upload instructions.</p></div></div>}
          <label className="trace-label block">Case-specific Instructions{secretary && <span className="text-red-600 dark:text-red-300"> *</span>}<textarea maxLength={2000} value={instructions} onChange={e => setInstructions(e.target.value)} className="trace-control mt-1 w-full" /></label>
          {selection?.replacement && <p className="text-sm">Prior uploads and reviews remain in history. Explain why a replacement is needed.</p>}
        </>}
      </div>
    </ModalShell>
    <ConfirmDialog open={Boolean(state.staged)} title="Confirm Document Action" message={state.error || 'Save this action for the selected document case?'} loading={state.saving} onCancel={state.cancel} onConfirm={async () => { if(await state.confirm()) { onSaved(); onClose(); } }} />
  </>;
}
