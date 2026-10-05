import Button from '@/components/Button';
import { formatPeso } from '@/utils/pricing';
import { formatDateTime } from '@/utils/formatters';
import { receiptWait } from '@/utils/receiptTiming';
export default function FinanceTransactionsPanel({ state, onUpload, onProfile }) {
  return <section className="space-y-4 min-w-0" aria-label="Finance transactions and export">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-lg font-bold">Transactions & OR Copies</h3>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={state.refresh} disabled={state.loading} className="trace-button trace-button-secondary">Refresh</Button>
        <Button type="button" onClick={state.exportCsv} disabled={state.exporting} className="trace-button trace-button-primary">{state.exporting ? 'Exporting…' : 'Export CSV'}</Button>
      </div>
    </div>
    <p className="text-sm">Payment acknowledgment is separate from the Official Receipt. At or after 4:00 PM Manila time, new OR issuance is deferred. Waiting time is informational; no fixed issue deadline is promised.</p>
    <div className="flex flex-wrap gap-3">
      <label className="trace-label">From (Manila)<input type="date" value={state.filters.from} onChange={e => state.updateFilter('from', e.target.value)} className="trace-control block max-w-full" /></label>
      <label className="trace-label">Through (Manila)<input type="date" value={state.filters.to} onChange={e => state.updateFilter('to', e.target.value)} className="trace-control block max-w-full" /></label>
      <label className="trace-label">OR status<select value={state.filters.receipt} onChange={e => state.updateFilter('receipt', e.target.value)} className="trace-control block max-w-full">
        <option value="all">All</option><option value="pending">Issuance pending</option><option value="copy-pending">Digital copy pending</option><option value="issued">Issued</option>
      </select></label>
    </div>
    {state.error && <div role="alert" className="text-red-700 dark:text-red-300">{state.error} <Button type="button" onClick={state.refresh} className="trace-action underline">Retry</Button></div>}
    {state.loading ? <p role="status">Loading payments…</p> : <>
      <p className="font-bold">{state.total} cleared requests · {formatPeso(state.amount)}</p>
      {!state.transactions.length ? <p>No cleared payments match these filters.</p> : <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-[780px] text-sm text-left"><thead><tr className="bg-gray-50 dark:bg-gray-800">{['Request / documents', 'Student', 'Payment cleared', 'Paid amount', 'OR status', 'Action'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
          <tbody>{state.transactions.map(row => <tr key={row.request_group_id} className="border-t border-gray-200 dark:border-gray-700">
            <td className="p-3 select-text break-words">{row.request_group_id}<div>#{row.tracking_number}</div><div>{row.document_type}</div></td>
            <td className="p-3"><Button type="button" onClick={() => onProfile(row.student_id)} disabled={!row.student_id} className="trace-action text-blue-700 dark:text-blue-300 underline text-left">{row.student_name || row.student_id}</Button></td>
            <td className="p-3">{row.payment_cleared_at ? formatDateTime(row.payment_cleared_at) : 'Historical date not recorded'}</td>
            <td className="p-3">{formatPeso(row.amount)}</td>
            <td className="p-3">{!row.or_number ? <><strong>Issuance pending</strong><div>{receiptWait(row.payment_cleared_at, state.now)}</div>{row.or_earliest_issue_date && <div>Earliest eligible date: {row.or_earliest_issue_date}</div>}</> : <><span className="select-text">{row.or_number}</span><div>{row.official_receipt_path ? 'Digital OR available' : 'Issued; digital copy pending'}</div></>}</td>
            <td className="p-3">{!row.official_receipt_path && <Button type="button" onClick={() => onUpload(row)} className="trace-button trace-button-secondary">{row.or_number ? 'Upload OR copy' : 'Issue OR & upload'}</Button>}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <nav className="flex flex-wrap justify-between gap-3" aria-label="Finance transaction pages"><Button type="button" disabled={state.page <= 1} onClick={() => state.setPage(state.page - 1)} className="trace-button trace-button-secondary">Previous</Button><span>Page {state.page} of {Math.max(1, Math.ceil(state.total / 25))}</span><Button type="button" disabled={state.page * 25 >= state.total} onClick={() => state.setPage(state.page + 1)} className="trace-button trace-button-secondary">Next</Button></nav>
    </>}
  </section>;
}
