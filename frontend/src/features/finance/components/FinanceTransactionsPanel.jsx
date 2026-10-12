import Button from '@/components/Button';
import ReportFiltersModal from '@/components/ReportFiltersModal';
import useReportFilterOptions from '@/hooks/useReportFilterOptions';
import {EMPTY_FINANCE_FILTERS,appliedFilterSummary} from '@/utils/reportFilters';
import { formatPeso } from '@/utils/pricing';
import { formatDateTime } from '@/utils/formatters';
import { receiptWait } from '@/utils/receiptTiming';
export default function FinanceTransactionsPanel({ state, onUpload, onProfile, onViewReceipt, onPrint }) {
  const reference=useReportFilterOptions(true);
  return <section className="space-y-4 min-w-0" aria-label="Finance payment history">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="trace-page-title min-w-0 max-w-full break-words">Payment History</h2>
    </div>
    <p className="text-sm">Review all cleared payments. Upload the OR copy here when it is available. Waiting time shows how long a payment has lacked a copy; it does not change the document stage.</p>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="trace-page-description select-text" aria-label="Applied filters">{appliedFilterSummary(state.filters,reference.options)}</p>
      <Button type="button" onClick={state.refresh} disabled={state.loading} className="trace-button trace-button-secondary">Refresh</Button>
    </div>
    {<ReportFiltersModal inline history filters={state.filters} defaults={EMPTY_FINANCE_FILTERS} options={reference.options} optionsLoading={reference.loading} optionsError={reference.error} onRetryOptions={reference.retry} onApply={state.applyFilters} finance error={state.error}/>}
    {state.error && <div role="alert" className="text-red-700 dark:text-red-300">{state.error} <Button type="button" onClick={state.refresh} className="trace-action underline">Retry</Button></div>}
    {state.loading ? <p role="status">Loading payments…</p> : state.loadFailed ? null : <>
      <p className="font-bold">{state.total} cleared requests · {formatPeso(state.amount)}</p>
      {!state.transactions.length ? <p>No cleared payments match these filters.</p> : <div className="max-h-[60vh] overflow-y-auto overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[780px] text-sm text-left"><thead className="sticky top-0 bg-white dark:bg-gray-900 z-10"><tr className="bg-gray-50 dark:bg-gray-800">{['Request / documents', 'Student', 'Payment cleared', 'Paid amount', 'OR status', 'Actions'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
          <tbody>{state.transactions.map(row => <tr key={row.request_group_id} className="border-t border-gray-200 dark:border-gray-700">
            <td className="p-3 select-text break-words">{row.request_group_id}<div>#{row.tracking_number}</div><div>{row.document_type}</div></td>
            <td className="p-3"><Button type="button" onClick={() => onProfile(row.student_id)} disabled={!row.student_id} className="trace-action text-blue-700 dark:text-blue-300 underline text-left">{row.student_name || row.student_id}</Button></td>
            <td className="p-3">{row.payment_cleared_at ? formatDateTime(row.payment_cleared_at) : 'Historical date not recorded'}</td>
            <td className="p-3">{formatPeso(row.amount)}</td>
            <td className="p-3">{!row.or_number ? <><strong>Issuance pending</strong><div>{receiptWait(row.payment_cleared_at, state.now)}</div>{row.or_earliest_issue_date && <div>Earliest eligible date: {row.or_earliest_issue_date}</div>}</> : <><div className="flex flex-wrap items-center gap-2"><span className="font-mono select-text">{row.or_number}</span>{row.receipt_id && <Button type="button" onClick={()=>onPrint(row.receipt_id)} className="trace-button trace-button-secondary">Print / View</Button>}</div><div className="text-xs">{row.cashier_name && `Cashier: ${row.cashier_name} · `}{row.or_date || ''}</div><div>{row.official_receipt_path ? 'Digital OR available' : 'Issued; digital copy pending'}</div>{!row.official_receipt_path && <div className="text-xs text-amber-800 dark:text-amber-300">{receiptWait(row.payment_cleared_at, state.now, 'OR copy')}</div>}</>}</td>
            <td className="p-3"><div className="flex flex-wrap gap-2">{row.official_receipt_path
              ? <Button type="button" onClick={() => onViewReceipt(row.official_receipt_path)} className="trace-button trace-button-secondary">View OR</Button>
              : <Button type="button" disabled={state.uploadingReceipt} onClick={() => onUpload(row)} className="trace-button trace-button-secondary">{row.or_number ? 'Upload OR' : 'Issue pending OR'}</Button>}</div></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <nav className="flex flex-wrap justify-between gap-3" aria-label="Finance transaction pages"><Button type="button" disabled={state.page <= 1} onClick={() => state.setPage(state.page - 1)} className="trace-button trace-button-secondary">Previous</Button><span>Page {state.page} of {Math.max(1, Math.ceil(state.total / 25))}</span><Button type="button" disabled={state.page * 25 >= state.total} onClick={() => state.setPage(state.page + 1)} className="trace-button trace-button-secondary">Next</Button></nav>
    </>}
  </section>;
}
