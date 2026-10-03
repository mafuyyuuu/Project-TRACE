import { useState } from 'react';
import useRequestAttachments from '@/hooks/useRequestAttachments';
import FileUploadField from '@/components/FileUploadField';
import AuthedFilePreview from '@/components/AuthedFilePreview';
import ConfirmDialog from '@/components/ConfirmDialog';
function AttachmentItem({ row, canReview, state }) {
  const [file, setFile] = useState(null), [notes, setNotes] = useState('');
  return <article className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-3 min-w-0">
    <h4 className="font-bold break-words">{row.label}</h4>
    <p className="text-sm whitespace-pre-wrap break-words select-text">{row.instructions}</p>
    <p className="text-sm font-semibold">{row.status === 'accepted' ? 'Accepted by Registrar' : row.status === 'uploaded' ? 'Submitted — awaiting review' : 'Document requested'}</p>
    {row.review_notes && <p className="text-sm whitespace-pre-wrap break-words select-text">Review: {row.review_notes}</p>}
    {row.file_path && <AuthedFilePreview path={row.file_path} alt={row.label} iframeTitle={row.label} className="max-h-48 max-w-full object-contain" />}
    {row.status === 'requested' && <>
      <FileUploadField label={`Upload ${row.label}`} file={file} onChange={setFile} accept=".jpg,.jpeg,.png,.pdf" maxBytes={10 * 1024 * 1024} disabled={state.saving} />
      <button type="button" disabled={!file || state.saving} onClick={() => state.stage({ kind: 'upload', id: row.id, file })} className="trace-button trace-button-secondary">Submit pertinent document</button>
    </>}
    {canReview && row.status === 'uploaded' && <>
      <label className="trace-label block">Review notes<textarea maxLength={2000} value={notes} onChange={e => setNotes(e.target.value)} className="trace-control block w-full" /></label>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={state.saving} onClick={() => state.stage({ kind: 'review', id: row.id, action: 'accept', notes })} className="trace-button trace-button-secondary">Accept document</button>
        <button type="button" disabled={state.saving || !notes.trim()} onClick={() => state.stage({ kind: 'review', id: row.id, action: 'resubmit', notes })} className="trace-button trace-button-secondary">Request resubmission</button></div>
    </>}
  </article>;
}
export default function RequestAttachments({ documentId, user }) {
  const state = useRequestAttachments(documentId);
  const [label, setLabel] = useState(''), [instructions, setInstructions] = useState('');
  const canReview = user.role === 'admin' || (user.role === 'clerk' && ['Window 1', 'Receiving Desk', 'Secretary'].includes(user.desk_assignment));
  return <section className="space-y-3 min-w-0" aria-label="Case-specific attachments">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-bold text-lg">Attachments</h3><button type="button" onClick={state.refresh} className="trace-action underline text-sm">Refresh attachments</button></div>
    <p className="text-sm">The Registrar may request additional documents for this case. Follow each instruction below.</p>
    {state.loading && <p role="status">Loading attachments…</p>}
    {state.error && <p role="alert" className="text-red-700 dark:text-red-300">{state.error}</p>}
    {state.success && <p role="status" className="text-green-700 dark:text-green-300">{state.success}</p>}
    {!state.loading && !state.rows.length && <p className="text-sm">No additional documents requested for this case.</p>}
    {state.rows.map(row => <AttachmentItem key={row.id} row={row} canReview={canReview} state={state} />)}
    {canReview && <div className="space-y-3 border-t pt-3">
      <label className="trace-label block">Required document<input maxLength={255} value={label} onChange={e => setLabel(e.target.value)} className="trace-control block w-full" /></label>
      <label className="trace-label block">Case-specific instructions<textarea maxLength={2000} value={instructions} onChange={e => setInstructions(e.target.value)} className="trace-control block w-full" /></label>
      <button type="button" disabled={state.saving || !label.trim() || !instructions.trim()} onClick={() => state.stage({ kind: 'request', label: label.trim(), instructions: instructions.trim() })} className="trace-button trace-button-secondary">Request additional document</button>
    </div>}
    <ConfirmDialog open={Boolean(state.staged)} title="Save Attachment Action" message={state.error || 'Save this attachment action for the selected request?'} confirmLabel="Save" loading={state.saving} onCancel={state.cancel} onConfirm={async () => {
      const kind = state.staged?.kind;
      if (await state.confirm() && kind === 'request') { setLabel(''); setInstructions(''); }
    }} />
  </section>;
}
