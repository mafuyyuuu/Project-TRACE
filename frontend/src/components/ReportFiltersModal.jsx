import FilterSelect from '@/components/FilterSelect';
import { useId, useState } from 'react';
import ModalShell from '@/components/ModalShell';
import Button from '@/components/Button';
import QueueTabs from '@/components/QueueTabs';
import { PIPELINE, LEGACY_STATUS, getStatusLabel } from '@/utils/documentStatus';

/** Shared presentation; draft filters are local until explicitly applied. */
export default function ReportFiltersModal({ filters, defaults, options, optionsLoading, optionsError, onRetryOptions, onApply, onClose, onExport, exporting, exportReady, finance = false, secretary = false, error = '', inline = false, exportOpen = false, history = false, admin = false, scopeText = 'All authorized records' }) {
  const [draft,setDraft] = useState({...filters}), [dataset,setDataset] = useState('documents'), [validation,setValidation] = useState('');
  const prefix=useId();
  const update=(key,value)=>{setValidation('');setDraft(current=>({...current,[key]:value,...(key==='status'?{recordSet:''}:{})}));};
  const dirty=JSON.stringify(draft)!==JSON.stringify(filters);
  const from=finance?'from':'dateFrom',to=finance?'to':'dateTo';
  const apply=()=>{
    if(draft[from] && draft[to] && draft[from]>draft[to]) {setValidation('From must be on or before To.');return;}
    const next={...draft,studentSearch:(draft.studentSearch||'').trim()};setDraft(next);onApply(next);
  };
  const field=(key,label,control)=><div className="trace-field min-w-0"><label htmlFor={`${prefix}-${key}`} className="trace-label">{label}</label>{control(`${prefix}-${key}`)}</div>;
  const applyControl=<Button type="button" className="trace-button trace-button-primary" onClick={apply} disabled={Boolean(exporting)||optionsLoading||Boolean(optionsError)}>{admin && <img src="/admin-figma/plus.svg" alt="" aria-hidden="true" className="shrink-0" />}Apply Filters</Button>;
  const resetControl = <Button type="button" className="trace-button trace-button-secondary" onClick={()=>{setDraft({...defaults});setValidation('');}} disabled={Boolean(exporting)}>Reset draft</Button>;
  const filterBody=<div className={admin ? 'trace-admin-filter-body' : 'space-y-4'}>
      {admin && <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="trace-section-title">Filters</h3><p className="trace-admin-caption">Edit a draft, then apply. Reset clears only the draft; exports use the applied report.</p></div><span className="trace-admin-badge trace-admin-badge-green">● Scope: {scopeText}</span></div>}
      <p className={admin ? 'sr-only' : 'trace-page-description'}>{history ? 'Apply filters to search payment history. Reset clears the draft.' : 'Edit a draft, then Apply Filters to update the report. Reset clears only the draft; exports use the applied report.'}</p>
      {optionsLoading && <p role="status">Loading filter options…</p>}
      {optionsError && <div role="alert" className="trace-inline-error">{optionsError} <Button type="button" className="trace-action underline" onClick={onRetryOptions}>Retry options</Button></div>}
      {(validation||error) && <p role="alert" className="trace-inline-error">{validation||error}</p>}
      {secretary && <QueueTabs semantics="filters" label="Record views" idPrefix={`${prefix}-views`} tabs={[{key:'all',label:'All records'},{key:'cleared',label:'Secretary-cleared'},{key:'completed',label:'Completed only'}]} activeKey={draft.recordSet==='secretary-cleared'?'cleared':draft.status==='COMPLETED'?'completed':!draft.status?'all':null} onChange={view=>setDraft(current=>({...current,recordSet:view==='cleared'?'secretary-cleared':'',status:view==='completed'?'COMPLETED':''}))}/>}
      <div className={admin ? 'trace-admin-filter-grid' : 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
        {field(from,finance?'Payment cleared From':'From',id=><input id={id} type="date" className="trace-control w-full" value={draft[from]||''} onChange={e=>update(from,e.target.value)}/>)}
        {field(to,finance?'Payment cleared To':'To',id=><input id={id} type="date" className="trace-control w-full" value={draft[to]||''} onChange={e=>update(to,e.target.value)}/>)}
        {field('studentSearch','Student ID / Name',id=><div className={admin ? 'trace-admin-search !w-full' : undefined}>{admin && <img src="/admin-figma/search.svg" alt="" aria-hidden="true" className="shrink-0" />}<input id={id} maxLength={255} className={admin ? 'w-full' : 'trace-control w-full'} placeholder="Exact ID or part of a name" value={draft.studentSearch||''} onChange={e=>update('studentSearch',e.target.value)}/></div>)}
        {field('collegeId','College / Department',id=><FilterSelect id={id} className="trace-control w-full" disabled={optionsLoading||Boolean(optionsError)||options?.college_locked} value={draft.collegeId||''} onChange={e=>update('collegeId',e.target.value)}><option value="">{options?.college_locked?options.colleges[0]?.name||'Assigned college only':'All authorized colleges'}</option>{options?.colleges?.map(college=><option key={college.id} value={college.id}>{college.name}</option>)}</FilterSelect>)}
        {field('documentType','Document Type',id=><FilterSelect id={id} className="trace-control w-full" disabled={optionsLoading||Boolean(optionsError)} value={draft.documentType||''} onChange={e=>update('documentType',e.target.value)}><option value="">All document types</option>{options?.document_types?.map(type=><option key={type.id} value={type.name}>{type.name}{Number(type.is_active)===0?' (historical)':''}</option>)}</FilterSelect>)}
        {finance ? field('receipt','OR status',id=><FilterSelect id={id} className="trace-control w-full" value={draft.receipt} onChange={e=>update('receipt',e.target.value)}><option value="all">All</option><option value="pending">Issuance pending</option><option value="copy-pending">Digital copy pending</option><option value="issued">Issued</option></FilterSelect>) : <>
          {field('status','Status',id=><FilterSelect id={id} className="trace-control w-full" value={draft.status} onChange={e=>update('status',e.target.value)}><option value="">{draft.recordSet?'Secretary-cleared':'All statuses'}</option>{[...PIPELINE,LEGACY_STATUS.REJECTED,LEGACY_STATUS.APPROVED].map(status=><option key={status} value={status}>{getStatusLabel(status)}</option>)}</FilterSelect>)}
          {field('paymentStatus','Payment',id=><FilterSelect id={id} className="trace-control w-full" value={draft.paymentStatus} onChange={e=>update('paymentStatus',e.target.value)}><option value="">Any</option><option value="PAID">Paid</option><option value="UNPAID">Unpaid</option></FilterSelect>)}
        </>}
        {admin && <div className="trace-actions self-end justify-end">{resetControl}{applyControl}</div>}
      </div>
      <p className={admin ? 'trace-admin-caption' : 'text-xs text-gray-600 dark:text-gray-300'}>Search matches an exact student ID or part of the saved name, case-insensitively. Dates use Manila time. College/Department uses the existing College catalog.</p>
      {!admin && <div className="flex flex-wrap gap-2">{resetControl}{inline&&applyControl}</div>}
    </div>;
  const exportBody=<section className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700" aria-label="Export configuration">
        <h3 className="trace-section-title">Export configuration</h3>
        {field('format','Format',id=><select id={id} className="trace-control w-full" value="csv" disabled><option value="csv">CSV · UTF-8 · Manila timestamps</option></select>)}
        {field('dataset','Dataset',id=><select id={id} className="trace-control w-full" value={dataset} disabled={Boolean(exporting)} onChange={e=>setDataset(e.target.value)}><option value="documents">Filtered document records</option>{!finance && [['active','Active Students'],['alumni','Graduates / Alumni'],['others','Others'],['all','All Students']].map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>)}
        <p className="text-xs text-gray-600 dark:text-gray-300">{finance?'Filters select complete paid request groups. CSV includes every document in those groups; per-document amounts sum to the grouped total.':dataset==='documents'?'One row per document across the complete applied result set, including college, processing and authorized payment fields.':'One row per student in this category. Applied Student ID / Name and college filters apply; document, date and payment filters do not apply to student records.'}</p>
        {dirty && <p role="status" className="text-sm text-amber-700 dark:text-amber-300">Apply the draft before exporting.</p>}
        <Button type="button" className="trace-button trace-button-primary w-full" disabled={dirty||!exportReady||Boolean(exporting)||optionsLoading||Boolean(optionsError)} onClick={()=>onExport(dataset)}>{exporting?'Exporting…':'Export CSV'}</Button>
      </section>;
  return <>
    {inline&&<section aria-label={history ? 'History filters' : 'Report filters'} className="trace-section trace-section-body">{filterBody}</section>}
    {!history && <ModalShell open={inline?exportOpen:true} title={inline?'Export':'Filters & Export'} maxWidth="max-w-[535px]" onClose={onClose} busy={Boolean(exporting)} showCloseButton={!exporting} closeOnEsc={!exporting} closeOnBackdrop={!exporting}
      footer={<div className="flex flex-wrap justify-end gap-2"><Button type="button" className="trace-button trace-button-secondary" onClick={onClose} disabled={Boolean(exporting)}>{inline?'Close export':'Cancel'}</Button>{!inline&&applyControl}</div>}>
      {!inline&&filterBody}{exportBody}
    </ModalShell>}
  </>;
}
