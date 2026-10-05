import { useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import FileUploadField from '@/components/FileUploadField';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import useRequestAttachments from '@/hooks/useRequestAttachments';
import useRequirementHistory from '@/hooks/useRequirementHistory';

function RequirementHistory({row,ticketId}) {
  const history=useRequirementHistory({ticketId,documentId:row.document_id,requirementId:row.id});
  return <div className="space-y-2">
    <Button type="button" aria-expanded={history.open} disabled={history.loading} onClick={()=>history.open ? history.close() : void history.load()} className="trace-action underline">{history.open ? 'Hide' : 'View'} upload and review history</Button>
    {history.open && <div className="space-y-3 rounded-lg border border-current/20 p-3">
      {history.loading && <p role="status">Loading requirement history…</p>}
      {history.error && <p role="alert">{history.error} <Button type="button" onClick={()=>void history.load()} className="trace-action underline">Retry history</Button></p>}
      {!history.loading && !history.error && !history.events.length && <p>Detailed events were not recorded for this older requirement. Its retained upload and last review appear above.</p>}
      {history.events.map(event=><article key={event.id} className="space-y-1 border-b border-current/20 pb-2">
        <p className="font-semibold">{event.event_type.replaceAll('_',' ')} · {event.actor_name || 'Recorded account'}</p>
        <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})} (Manila)</time>
        {event.snapshot.review_notes && <p className="break-words whitespace-pre-wrap">{event.snapshot.review_notes}</p>}
        {event.snapshot.file_path && <AuthedFilePreview path={event.snapshot.file_path} alt={row.label} iframeTitle={row.label} className="max-h-32 max-w-full object-contain" />}
      </article>)}
      {history.next_cursor && <Button type="button" disabled={history.loading} onClick={()=>void history.load(history.next_cursor)} className="trace-button trace-button-secondary">Load older requirement events</Button>}
    </div>}
  </div>;
}
export function RequirementBubble({ row,user,readOnly,onAction,ticketId }) {
  if(!row) return <p className="text-sm">Requirement details are loading. Retry conversation if they remain unavailable.</p>;
  return <div className="space-y-2">
    <h4 className="font-bold break-words">{row.label}</h4>
    <p className="whitespace-pre-wrap break-words select-text">{row.instructions}</p>
    <p className="text-sm">Requested by {row.requested_by_name || 'Registrar'} · {new Date(row.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})} (Manila)</p>
    <p className="font-semibold">{row.superseded_at ? 'Replaced — retained history' : {requested:'Awaiting upload',uploaded:'Submitted — awaiting review',accepted:'Accepted',rejected:'Rejected — upload a corrected copy'}[row.status]}</p>
    {row.review_notes && <p className="whitespace-pre-wrap break-words">Review: {row.review_notes}</p>}
    {row.file_path && <AuthedFilePreview path={row.file_path} alt={row.label} iframeTitle={row.label} className="max-h-40 max-w-full object-contain" />}
    <RequirementHistory key={`${ticketId || row.document_id}:${row.id}`} row={row} ticketId={ticketId} />
    {!readOnly && !row.superseded_at && user.role==='student' && ['requested','rejected'].includes(row.status) && <Button type="button" onClick={() => onAction(row)} className="trace-button trace-button-secondary">Upload file for {row.label}</Button>}
    {!readOnly && !row.superseded_at && (user.role==='admin' || ['Window 1','Receiving Desk','Secretary'].includes(user.desk_assignment)) && row.status==='uploaded' && <Button type="button" onClick={() => onAction(row)} className="trace-button trace-button-secondary">Review {row.label}</Button>}
    {!readOnly && !row.superseded_at && (user.role==='admin' || ['Window 1','Receiving Desk','Secretary'].includes(user.desk_assignment)) && <Button type="button" onClick={() => onAction({...row,replacement:true})} className="trace-button trace-button-secondary">Request replacement</Button>}
  </div>;
}

export default function SupportRequirementDialog({ documentId,user,selection,onClose,onSaved }) {
  const state = useRequestAttachments(documentId);
  const [catalogId,setCatalogId] = useState(selection?.replacement && selection.catalog_id ? String(selection.catalog_id) : ''), [instructions,setInstructions] = useState(''), [file,setFile] = useState(null), [notes,setNotes] = useState('');
  const upload = user.role==='student', review = selection && !selection.replacement && !upload;
  const available = state.types.filter(type => !state.rows.some(row => Number(row.catalog_id)===Number(type.id) && !row.superseded_at && row.status!=='rejected') || Number(type.id)===Number(selection?.catalog_id));
  const stage = () => state.stage(upload ? {kind:'upload',id:selection.id,file} : review ? {kind:'review',id:selection.id,action:'accept',notes} : {kind:'request',catalog_id:Number(catalogId),replacement_of:selection?.replacement ? selection.id : undefined,instructions:instructions.trim()});
  return <>
    <ModalShell open title={upload ? `Upload ${selection.label}` : review ? `Review ${selection.label}` : selection?.replacement ? `Replace ${selection.label}` : 'Request Supporting Document'} onClose={() => { if(!state.saving) onClose(); }} footer={<Button type="button" disabled={state.saving || state.loading || state.readOnly || (upload ? !file : review ? false : !catalogId || !instructions.trim())} onClick={stage} className="trace-button trace-button-primary">{upload ? 'Submit document' : review ? 'Accept document' : 'Request document'}</Button>}>
      <div className="space-y-4">
        {state.loading && <p role="status">Loading case requirements…</p>}
        {state.error && <p role="alert" className="text-red-700 dark:text-red-300">{state.error}</p>}
        {state.readOnly && <p>Closed cases are read-only.</p>}
        {upload ? <FileUploadField label={selection.label} file={file} onChange={setFile} accept=".jpg,.jpeg,.png,.pdf" maxBytes={10*1024*1024} disabled={state.saving} /> : review ? <>
          {selection.file_path && <AuthedFilePreview path={selection.file_path} alt={selection.label} iframeTitle={selection.label} className="max-h-64 max-w-full object-contain" />}
          <label className="trace-label block">Review Notes<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} className="trace-control mt-1 w-full" /></label>
          <Button type="button" disabled={state.saving || !notes.trim()} onClick={() => state.stage({kind:'review',id:selection.id,action:'resubmit',notes})} className="trace-button trace-button-danger">Request corrected copy</Button>
        </> : <>
          <label className="trace-label block">Required Document<select value={catalogId} onChange={e => setCatalogId(e.target.value)} disabled={state.saving || Boolean(selection?.replacement && selection.catalog_id)} className="trace-control mt-1 w-full"><option value="">Choose an approved type</option>{available.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          {selection?.replacement && selection.catalog_id && !available.some(type=>Number(type.id)===Number(selection.catalog_id)) && <p role="alert">This document type is inactive. Ask Admin to restore it before requesting a replacement.</p>}
          {!available.length && <p className="text-sm">No new document types are available. Admin must enter Registrar-approved types, or review an existing requirement.</p>}
          <label className="trace-label block">Case-specific Instructions<textarea maxLength={2000} value={instructions} onChange={e => setInstructions(e.target.value)} className="trace-control mt-1 w-full" /></label>
          {selection?.replacement && <p className="text-sm">Prior uploads and reviews remain in history. Explain why a replacement is needed.</p>}
        </>}
      </div>
    </ModalShell>
    <ConfirmDialog open={Boolean(state.staged)} title="Confirm Document Action" message={state.error || 'Save this action for the selected document case?'} loading={state.saving} onCancel={state.cancel} onConfirm={async () => { if(await state.confirm()) { onSaved(); onClose(); } }} />
  </>;
}
