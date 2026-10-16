import { useId } from 'react';
import Button from '@/components/Button';
import FilterSelect from '@/components/FilterSelect';
import FinanceIcon from './FinanceIcon';

/** Compact source toolbar; the caller still owns draft/apply/reset semantics. */
export default function FinanceHistoryFilters({ draft, update, options, loading, optionsError, onRetry, onApply, onReset, error }) {
  const prefix = useId();
  return <section aria-label="History filters" className="trace-finance-history-filters">
    <div className="trace-finance-history-toolbar">
      <details className="trace-finance-date-range"><summary><FinanceIcon name="4d36c" /><span>{draft.from || draft.to ? `${draft.from || 'Any'} – ${draft.to || 'Any'}` : 'Cleared date range'}</span></summary><div className="trace-finance-date-fields">{[['from','Payment cleared From'],['to','Payment cleared To']].map(([key,label])=><label key={key} className="trace-label">{label}<input type="date" value={draft[key] || ''} onChange={event=>update(key,event.target.value)} className="trace-control block w-full" /></label>)}</div></details>
      <label className="trace-finance-history-search"><span className="sr-only">Student ID / Name</span><FinanceIcon name="36a6a" /><input maxLength={255} value={draft.studentSearch || ''} onChange={event=>update('studentSearch',event.target.value)} placeholder="Student ID or name" /></label>
      <div className="trace-finance-history-filter"><label className="sr-only" htmlFor={prefix+'-college'}>College / Department</label><FilterSelect id={prefix+'-college'} disabled={loading || Boolean(optionsError) || options?.college_locked} value={draft.collegeId || ''} onChange={event=>update('collegeId',event.target.value)} className="trace-control w-full"><option value="">{options?.college_locked?options.colleges[0]?.name || 'Assigned college only':'All authorized colleges'}</option>{options?.colleges?.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</FilterSelect></div>
      <div className="trace-finance-history-filter"><label className="sr-only" htmlFor={prefix+'-document'}>Document Type</label><FilterSelect id={prefix+'-document'} disabled={loading || Boolean(optionsError)} value={draft.documentType || ''} onChange={event=>update('documentType',event.target.value)} className="trace-control w-full"><option value="">All document types</option>{options?.document_types?.map(row=><option key={row.id} value={row.name}>{row.name}{Number(row.is_active)===0?' (historical)':''}</option>)}</FilterSelect></div>
      <div className="trace-finance-history-filter"><label className="sr-only" htmlFor={prefix+'-or'}>OR status</label><FilterSelect id={prefix+'-or'} value={draft.receipt} onChange={event=>update('receipt',event.target.value)} className="trace-control w-full"><option value="all">OR status: All</option><option value="pending">Issuance pending</option><option value="copy-pending">Digital copy pending</option><option value="issued">Issued</option></FilterSelect></div>
      <div className="trace-actions"><Button type="button" onClick={onReset} className="trace-button trace-button-secondary">Reset</Button><Button type="button" onClick={onApply} disabled={loading || Boolean(optionsError)} className="trace-button trace-button-primary">Apply Filters</Button></div>
    </div>
    <p className="trace-admin-caption flex items-start gap-2"><FinanceIcon name="0d87e" />Search matches an exact student ID or part of the saved name, case-insensitively. Dates use Manila time. College/Department uses the existing College catalog.</p>
    {loading && <p role="status">Loading filter options…</p>}{optionsError && <p role="alert">{optionsError} <Button type="button" onClick={onRetry} className="trace-action underline">Retry options</Button></p>}{error && <p role="alert" className="trace-inline-error">{error}</p>}
  </section>;
}
