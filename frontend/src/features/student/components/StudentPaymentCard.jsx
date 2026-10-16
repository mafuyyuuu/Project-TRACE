import { useState } from 'react';
import Button from '@/components/Button';
import FeeBreakdown from '@/components/FeeBreakdown';
import { formatPeso } from '@/utils/pricing';

const ICONS = { alert: 2107, check: 2116, current: 2121, file: 2132, copy: 2141, confirmed: 2148, card: 2169, arrow: 2173, download: 2176 };
export function PaymentIcon({ name }) {
  return <img src={`/student-figma/payment-${ICONS[name]}.svg`} alt="" aria-hidden="true" className={`shrink-0 trace-payment-icon trace-payment-icon-${name}`} />;
}

/** Saved request-group pricing remains the source of every amount and action. */
export default function StudentPaymentCard({ group, onPay, onSlip }) {
  const [copyResult, setCopyResult] = useState('');
  const copyRequest = async () => {
    try { await navigator.clipboard.writeText(String(group.groupId)); setCopyResult('Request ID copied.'); }
    catch { setCopyResult('Could not copy. Select and copy the request ID.'); }
  };
  return <section className="trace-student-payment-card" aria-label={`Payment for request ${group.groupId}`}>
    <header className="trace-payment-alert">
      <div className="flex min-w-0 items-center gap-[14px]">
        <span className="trace-payment-alert-icon"><PaymentIcon name="alert" /></span>
        <div className="min-w-0"><h3>Action Required — Payment</h3><p>Your documents are ready. Pay online here, or bring your payment slip to the Finance Office.</p></div>
      </div>
      <ol className="trace-payment-steps" aria-label="Payment progress">
        <li><span className="trace-payment-step-done"><PaymentIcon name="check" /></span>Price set</li><li aria-current="step"><PaymentIcon name="current" />Payment</li><li><span className="trace-payment-step-future" />Verification</li>
      </ol>
    </header>
    <div className="trace-payment-body">
      <div className="min-w-0"><ul className="space-y-4" aria-label="Documents awaiting payment">{group.docs.map((doc, index) => <li key={doc.id} className="trace-payment-summary">
        <div className="trace-payment-document">
          <span className="trace-payment-document-icon"><PaymentIcon name="file" /></span>
          <div className="min-w-0 flex-1"><p className="trace-payment-label">Document</p><h4 className="select-text break-words">{doc.document_sequence_number || doc.document_type}</h4></div>
          {index === 0 && <div className="trace-payment-request"><span>Request</span><span className="select-text break-all font-mono">{group.groupId}</span><Button type="button" aria-label={`Copy request ${group.groupId}`} onClick={copyRequest} className="trace-action inline-flex min-h-8 min-w-8 items-center justify-center"><PaymentIcon name="copy" /></Button></div>}
        </div>
        <FeeBreakdown breakdown={doc.fee_breakdown} amount={doc.amount} payment />
      </li>)}</ul>{copyResult && <p role="status" className="text-xs">{copyResult}</p>}</div>
      <aside className="trace-payment-total" aria-label="Amount due">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="trace-payment-label">Total amount due</p><span className="trace-payment-count">{group.docs.length} {group.docs.length === 1 ? 'document' : 'documents'}</span></div>
        <p className="trace-payment-amount select-text">{formatPeso(group.total)}</p>
        <div className="mt-auto space-y-3">
          <Button type="button" aria-label={`Pay ${formatPeso(group.total)} (${group.docs.length} ${group.docs.length === 1 ? 'document' : 'documents'})`} onClick={onPay} className="trace-button trace-button-primary trace-payment-pay"><PaymentIcon name="card" />Pay {formatPeso(group.total)}<PaymentIcon name="arrow" /></Button>
          <Button type="button" aria-haspopup="dialog" onClick={onSlip} className="trace-button trace-button-secondary trace-payment-slip"><PaymentIcon name="download" />Download payment slip</Button>
          <p className="text-center text-[.6875rem] text-slate-500 dark:text-gray-400">or bring your payment slip to the Finance Office</p>
        </div>
      </aside>
    </div>
  </section>;
}
