import { isCollegeOrFinance } from '@/utils/secretaryPresentation';
import SecretaryIcon from '@/features/secretary/components/SecretaryIcon';
import WindowIcon from '@/features/window1/components/WindowIcon';
import { useEffect, useState } from 'react';
import Button from '@/components/Button';
import AdminIcon from '@/features/admin/components/AdminIcon';
import useRequestAttachments from '@/hooks/useRequestAttachments';
import SupportRequirementDialog, { RequirementBubble } from '@/components/SupportRequirement';
export default function RequestAttachments({ documentId,user,onIntakeState, intakePresentation = false, guidance }) {
  const state=useRequestAttachments(documentId);
  useEffect(() => {
    onIntakeState?.({ ready: !state.loading && !state.error, blocked: state.rows.some(row => Number(row.blocks_intake) === 1 && !row.superseded_at && row.status !== 'accepted') });
  }, [onIntakeState, state.loading, state.error, state.rows]);
  const [selection,setSelection]=useState(null);
  const secretary=isCollegeOrFinance(user);
  const registrar=user.role !== 'admin' && ['Window 1','Receiving Desk','Secretary'].includes(user.desk_assignment);
  return <section aria-label="Case-specific attachments" className={secretary ? "trace-secretary-attachments min-w-0 space-y-4" : "min-w-0 space-y-3"}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className={intakePresentation ? "trace-window-form-heading mb-0" : "trace-section-title"}>{intakePresentation && <WindowIcon name="clip"/>}Supporting Documents{secretary && state.rows.length > 0 && <span className="trace-secretary-stage-badge ml-2">{state.rows.length}</span>}</h3><Button type="button" aria-label={intakePresentation ? "Refresh attachments" : undefined} onClick={state.refresh} className={secretary ? 'trace-button trace-button-secondary trace-secretary-refresh' : user.role === 'admin' || intakePresentation ? 'trace-button trace-button-secondary' : 'trace-action underline'}>{secretary ? <SecretaryIcon name="27ccc" /> : intakePresentation ? <WindowIcon name="refresh"/> : user.role === 'admin' && <AdminIcon name="linked-refresh-cw" />}{intakePresentation ? "Refresh" : "Refresh attachments"}</Button></div>
    {guidance && <p className="trace-window-attachment-guidance">{guidance}</p>}
    {state.loading && <p role="status">Loading attachments…</p>}
    {state.error && <p role="alert" className="trace-inline-error">{state.error}</p>}
    {!state.loading && !state.rows.length && <div className={secretary ? "trace-secretary-attachments-empty" : "text-sm"}>{secretary && <span><SecretaryIcon name="73c2d" /></span>}<p>No additional documents requested for this case.</p>{secretary && registrar && !state.readOnly && <Button type="button" disabled={Boolean(state.error)} onClick={()=>setSelection({new:true})} className="trace-button trace-button-primary"><SecretaryIcon name="10c68" />Request supporting document</Button>}</div>}
    {state.rows.map(row=><article key={row.id} className={'rounded-xl border border-gray-200 dark:border-gray-700 ' + (user.role === 'admin' || secretary ? 'overflow-hidden' : 'p-3')}><RequirementBubble variant={user.role === 'admin' ? 'linked' : undefined} row={row} user={user} readOnly={state.readOnly} onAction={setSelection} /></article>)}
    {registrar && !state.readOnly && (!secretary || state.rows.length > 0) && <Button type="button" disabled={state.loading} onClick={()=>setSelection({new:true})} className="trace-button trace-button-secondary">{secretary ? <SecretaryIcon name="81d37" /> : intakePresentation ? <WindowIcon name="clip"/> : "📎 "}Request supporting document</Button>}
    {selection && <SupportRequirementDialog key={`${documentId}:${selection.id || 'new'}:${Boolean(selection.replacement)}`} documentId={documentId} user={user} selection={selection.new ? null : selection} onClose={()=>setSelection(null)} onSaved={()=>{void state.refresh();}} />}
  </section>;
}
