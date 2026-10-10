import { useEffect, useState } from 'react';
import Button from '@/components/Button';
import useRequestAttachments from '@/hooks/useRequestAttachments';
import SupportRequirementDialog, { RequirementBubble } from '@/components/SupportRequirement';
export default function RequestAttachments({ documentId,user,onIntakeState }) {
  const state=useRequestAttachments(documentId);
  useEffect(() => {
    onIntakeState?.({ ready: !state.loading && !state.error, blocked: state.rows.some(row => Number(row.blocks_intake) === 1 && !row.superseded_at && row.status !== 'accepted') });
  }, [onIntakeState, state.loading, state.error, state.rows]);
  const [selection,setSelection]=useState(null);
  const registrar=user.role==='admin' || ['Window 1','Receiving Desk','Secretary'].includes(user.desk_assignment);
  return <section aria-label="Case-specific attachments" className="min-w-0 space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="trace-section-title">Supporting Documents</h3><Button type="button" onClick={state.refresh} className="trace-action underline">Refresh attachments</Button></div>
    {state.loading && <p role="status">Loading attachments…</p>}
    {state.error && <p role="alert" className="trace-inline-error">{state.error}</p>}
    {!state.loading && !state.rows.length && <p className="text-sm">No additional documents requested for this case.</p>}
    {state.rows.map(row=><article key={row.id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-700"><RequirementBubble row={row} user={user} readOnly={state.readOnly} onAction={setSelection} /></article>)}
    {registrar && !state.readOnly && <Button type="button" disabled={state.loading} onClick={()=>setSelection({new:true})} className="trace-button trace-button-secondary">📎 Request supporting document</Button>}
    {selection && <SupportRequirementDialog key={`${documentId}:${selection.id || 'new'}:${Boolean(selection.replacement)}`} documentId={documentId} user={user} selection={selection.new ? null : selection} onClose={()=>setSelection(null)} onSaved={()=>{void state.refresh();}} />}
  </section>;
}
