import PaginatedTable from '@/components/PaginatedTable';
import { useState } from 'react';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import useSupportingDocuments from '@/hooks/useSupportingDocuments';
import CatalogGuidelines from './CatalogGuidelines';
import AdminIcon from './AdminIcon';
export default function SupportingDocumentsPanel() {
  const state = useSupportingDocuments();
  const [name,setName] = useState(''), [staged,setStaged] = useState(null);
  return <div className="trace-admin-catalog-grid"><section className="trace-section trace-admin-catalog-panel space-y-4" aria-label="Supporting-document catalog">
    <h3 className="trace-section-title">Supporting Documents</h3>
    <p className="text-sm">Enter only Registrar-approved supporting-document types. Staff choose these stable types when requesting case documents. Deactivation hides new choices while retaining previous requirements and files.</p>
    {state.loading && <p role="status">Loading supporting-document types…</p>}
    {state.error && <p role="alert" className="trace-inline-error">{state.error} <Button type="button" onClick={state.retry} className="trace-action underline">Retry catalog</Button></p>}
    <form onSubmit={event => {event.preventDefault();setStaged({name:name.trim(),is_active:true});}} className="flex flex-wrap items-end gap-3">
      <label className="trace-label min-w-0 flex-1">Approved Document Name<input required maxLength={255} placeholder="Enter approved document name" value={name} disabled={state.busy} onChange={event=>setName(event.target.value)} className="trace-control mt-1 w-full" /></label>
      <Button type="submit" disabled={state.busy || !name.trim()} className="trace-button trace-button-primary"><AdminIcon name="supporting-plus" />Add type</Button>
    </form>
    <div className="trace-table-scroll"><PaginatedTable label="supporting document types" className="trace-data-table min-w-[32rem]"><thead><tr><th scope="col">Document name</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{state.types.map(type=><tr key={type.id}><td>{type.name}</td><td><span className={'trace-admin-badge ' + (type.is_active ? 'trace-admin-badge-green' : 'trace-admin-badge-neutral')}>{type.is_active ? 'Active' : 'Inactive'}</span></td><td><Button type="button" disabled={state.busy} onClick={()=>setStaged({id:type.id,name:type.name,is_active:!type.is_active})} className={`trace-button ${type.is_active ? 'trace-button-danger' : 'trace-button-secondary'}`}>{type.is_active ? 'Deactivate' : 'Restore'}</Button></td></tr>)}{!state.loading && !state.error && !state.types.length && <tr><td colSpan={3}><div className="trace-admin-catalog-empty"><span className="trace-admin-catalog-empty-icon"><AdminIcon name="supporting-file" /></span><h4>No supporting document types yet</h4><p>Add the first Registrar-approved type above. It will then be available to staff when requesting case documents.</p></div></td></tr>}</tbody></PaginatedTable></div>
    <ConfirmDialog open={Boolean(staged)} title="Confirm Supporting-document Type" message={state.error || `Save ${staged?.name}? Existing requirements remain unchanged.`} loading={state.busy} onCancel={()=>{if(!state.busy)setStaged(null);}} onConfirm={async()=>{if(await state.save(staged)){if(!staged.id)setName('');setStaged(null);}}} />
  </section><CatalogGuidelines supporting /></div>;
}
