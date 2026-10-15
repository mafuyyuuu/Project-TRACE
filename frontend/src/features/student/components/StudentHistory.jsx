import { useState } from 'react';
import Button from '@/components/Button';
import FilterSelect from '@/components/FilterSelect';
import QueueTabs from '@/components/QueueTabs';
import FeeBreakdown from '@/components/FeeBreakdown';
import StudentIcon from './StudentIcon';
import { STATUS, getStatusLabel, getStatusTone } from '@/utils/documentStatus';
import { formatPeso } from '@/utils/pricing';

const date = value => value ? new Date(value).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const hasPrice = doc => doc.priced_at || doc.payment_status === 'PAID' || [STATUS.PENDING_STUDENT_PAYMENT, STATUS.PENDING_FINANCE_VERIFICATION, STATUS.PAID_PENDING_SEC_RELEASE, STATUS.SEC_OR_VERIFIED, STATUS.READY_FOR_RELEASE, STATUS.COMPLETED].includes(doc.current_status);

export default function StudentHistory({ documents, view, onView, onReceipt }) {
  const [filters, setFilters] = useState({});
  const { query = '', status = 'all' } = filters[view] || {};
  const update = patch => setFilters(current => ({ ...current, [view]: { ...current[view], ...patch } }));
  const payments = view === 'payments';
  const cohort = documents.filter(doc => !payments || doc.payment_status === 'PAID' || doc.gcash_reference_no);
  const rows = cohort.filter(doc => [doc.tracking_number, doc.document_type, ...(payments ? [doc.gcash_reference_no, doc.or_number] : [])].join(' ').toLowerCase().includes(query.trim().toLowerCase()) && (status === 'all' || (payments ? (doc.payment_status || 'PENDING') === status : doc.current_status === status)));
  const receipt = doc => doc.official_receipt_path ? <Button type="button" onClick={() => onReceipt(doc.official_receipt_path)} className="trace-button trace-student-receipt"><StudentIcon name="receipt-a6b61" />View Receipt</Button> : <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><StudentIcon name="minus-533b5" />No digital copy</span>;
  const amount = doc => hasPrice(doc) ? <details className="trace-student-amount"><summary className="cursor-pointer font-bold">{formatPeso(doc.amount)}<StudentIcon name="chevr-37739" /></summary><FeeBreakdown breakdown={doc.fee_breakdown} amount={doc.amount} /></details> : <span className="text-xs text-gray-500 dark:text-gray-400">Pending Secretary pricing</span>;
  const payment = doc => <span className={`trace-student-payment ${doc.payment_status === 'PAID' ? 'trace-student-payment-paid' : 'trace-student-payment-pending'}`}><StudentIcon name={doc.payment_status === 'PAID' ? 'check-00044' : 'clock-00e30'} />{doc.payment_status || 'PENDING'}</span>;
  return <section className="trace-page trace-student-history">
    <h2 className="trace-page-title">History</h2>
    <QueueTabs semantics="filters" label="History filters" idPrefix="student-history" tabs={[{ key: 'all', label: 'All Requests' }, { key: 'payments', label: 'Payments' }]} activeKey={view} onChange={onView} />
    <section className="trace-section overflow-hidden" aria-label={payments ? 'Payment history' : 'Request history'}>
      <header className="trace-section-header"><div><h3 className="trace-section-title">{payments ? 'Payments' : 'All Requests'}</h3><p className="trace-page-description">{payments ? 'Payment status and receipts for your requests' : 'Your document requests with their payment details'}</p></div>
        <div className="trace-actions"><label className="trace-student-search"><StudentIcon name="search-2552c" /><span className="sr-only">{payments ? 'Search payment history' : 'Search request history'}</span><input type="search" maxLength={255} value={query} onChange={event => update({ query: event.target.value })} placeholder={payments ? 'Search reference or document' : 'Search tracking no. or document'} /></label>
          <FilterSelect aria-label={payments ? 'Payment status' : 'Request status'} value={status} onChange={event => update({ status: event.target.value })}><option value="all">{payments ? 'All payments' : 'All statuses'}</option>{(payments ? ['PAID', 'UNPAID', 'PENDING'] : [...new Set(cohort.map(doc => doc.current_status))]).map(value => <option key={value} value={value}>{payments ? value[0] + value.slice(1).toLowerCase() : getStatusLabel(value)}</option>)}</FilterSelect></div>
      </header>
      <div role="region" aria-label={payments ? 'Payment records' : 'Request records'} tabIndex={0} className="trace-student-history-scroller overflow-auto">
        <table className={`trace-student-table w-full table-fixed text-left ${payments ? 'trace-student-payments-table min-w-[60rem]' : 'trace-student-requests-table min-w-[75rem]'}`}>
          <colgroup>{(payments ? ['w-[20%]', 'w-[26%]', 'w-[14%]', 'w-[11%]', 'w-[13%]', 'w-[16%]'] : ['w-[10%]', 'w-[11.7%]', 'w-[16.6%]', 'w-[13.2%]', 'w-[9.3%]', 'w-[10.3%]', 'w-[15.3%]', 'w-[13.6%]']).map((width, index) => <col key={index} className={width} />)}</colgroup>
          <thead><tr>{(payments ? ['Payment Reference', 'Document', 'Requested', 'Amount', 'Payment Status', 'Receipt'] : ['Requested', 'Tracking', 'Document', 'Request Status', 'Amount', 'Payment Status', 'Payment Reference', 'Receipt']).map(label => <th key={label}>{label}</th>)}</tr></thead>
          <tbody>{rows.map(doc => <tr key={doc.id}>{payments ? <><td className="font-mono">{doc.gcash_reference_no || doc.or_number || '—'}</td><td><strong>{doc.document_type}</strong><span className="block mt-1 text-xs font-mono text-gray-500 dark:text-gray-400">{doc.tracking_number || doc.id}</span></td><td>{date(doc.created_at)}</td><td>{amount(doc)}</td><td>{payment(doc)}</td><td>{receipt(doc)}</td></> : <><td>{date(doc.created_at)}</td><td className="font-mono">{doc.tracking_number || doc.id}</td><td className="font-semibold">{doc.document_type}</td><td><span className={`trace-student-status ${getStatusTone(doc.current_status)}`}>{getStatusLabel(doc.current_status)}</span></td><td>{amount(doc)}</td><td>{payment(doc)}</td><td className="font-mono">{doc.gcash_reference_no || doc.or_number || '—'}</td><td>{receipt(doc)}</td></>}</tr>)}</tbody>
        </table>
        {!rows.length && <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No records match this filter.</p>}
      </div>
      <footer className="trace-student-table-footer"><span>Showing {rows.length} of {cohort.length} {payments ? 'payments' : 'records'}</span>{payments && <div className="trace-actions"><span className="trace-student-total-paid">Total paid <strong>{formatPeso(rows.filter(doc => doc.payment_status === 'PAID').reduce((sum, doc) => sum + Number(doc.amount || 0), 0))}</strong></span><span className="trace-student-total-awaiting">Awaiting payment <strong>{formatPeso(rows.filter(doc => doc.payment_status !== 'PAID' && hasPrice(doc)).reduce((sum, doc) => sum + Number(doc.amount || 0), 0))}</strong></span></div>}</footer>
    </section>
  </section>;
}
