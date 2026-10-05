import { useState } from 'react';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import useSupportingDocuments from '@/hooks/useSupportingDocuments';
export default function SupportingDocumentsPanel() {
  const state = useSupportingDocuments();
  const [name,setName] = useState(''), [staged,setStaged] = useState(null);
  return <section className="trace-section trace-section-body space-y-4" aria-label="Supporting-document catalog">
    <h3 className="trace-section-title">Supporting Documents</h3>
    <p className="text-sm">Enter only Registrar-approved supporting-document types. Staff choose these stable types when requesting case documents. Deactivation hides new choices while retaining previous requirements and files.</p>
    {state.loading && <p role="status">Loading supporting-document types…</p>}
    {state.error && <p role="alert" className="trace-inline-error">{state.error} <Button type="button" onClick={state.retry} className="trace-action underline">Retry catalog</Button></p>}
    <form onSubmit={event => {event.preventDefault();setStaged({name:name.trim(),is_active:true});}} className="flex flex-wrap items-end gap-3">
      <label className="trace-label min-w-0 flex-1">Approved Document Name<input required maxLength={255} value={name} disabled={state.busy} onChange={event=>setName(event.target.value)} className="trace-control mt-1 w-full" /></label>
      <Button type="submit" disabled={state.busy || !name.trim()} className="trace-button trace-button-primary">Add type</Button>
    </form>
    <ul className="space-y-3">{state.types.map(type=><li key={type.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-700"><span className="min-w-0 break-words">{type.name} · {type.is_active ? 'Active' : 'Inactive'}</span><Button type="button" disabled={state.busy} onClick={()=>setStaged({id:type.id,name:type.name,is_active:!type.is_active})} className={`trace-button ${type.is_active ? 'trace-button-danger' : 'trace-button-secondary'}`}>{type.is_active ? 'Deactivate' : 'Restore'}</Button></li>)}</ul>
    <ConfirmDialog open={Boolean(staged)} title="Confirm Supporting-document Type" message={state.error || `Save ${staged?.name}? Existing requirements remain unchanged.`} loading={state.busy} onCancel={()=>{if(!state.busy)setStaged(null);}} onConfirm={async()=>{if(await state.save(staged)){if(!staged.id)setName('');setStaged(null);}}} />
  </section>;
}
