import { formatPeso } from '@/utils/pricing';

/** Render saved calculations, never reconstruct a historical bill from today's rates. */
export default function FeeBreakdown({ breakdown, amount, title, payment = false }) {
  let saved = breakdown;
  if (typeof saved === 'string') { try { saved = JSON.parse(saved); } catch { saved = null; } }
  if (saved?.fee_pending) return <p className="text-xs text-gray-700 dark:text-gray-200">Fee not yet set. Admin must confirm the rate before this request can be billed.</p>;
  if (!saved?.items) return <p className="text-xs text-gray-700 dark:text-gray-200">Recorded charge: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatPeso(amount)}</span>. Detailed calculation was not saved for this older record.</p>;
  if (payment) return <section className="trace-payment-breakdown" aria-label={title || 'Fee calculation'}>
    <header><h5 className="trace-payment-label">{title || 'How the amount was worked out'}</h5><span className="trace-payment-count"><img src="/student-figma/payment-2148.svg" alt="" aria-hidden="true" />{saved.stage === 'estimate' ? 'Estimated charges' : 'Confirmed charges'} · {saved.source === 'college' ? 'College fee schedule' : 'Default fee schedule'}</span></header>
    {saved.stage === 'estimate' && <p className="text-xs">Actual printed pages determine the final bill.</p>}
    <dl>{saved.items.map((item, index) => <div key={index}><div className="min-w-0"><dt className="font-semibold">{item.label}</dt><dd className="text-xs text-slate-500 dark:text-gray-400">{item.calculation}</dd></div><dd className="font-mono">{formatPeso(item.amount)}</dd></div>)}</dl>
    <p className="flex flex-wrap items-center justify-between gap-2 font-semibold"><span>{saved.stage === 'estimate' ? 'Estimate' : 'Total'}</span><strong className="text-lg">{formatPeso(saved.total)}</strong></p>
  </section>;
  return <section className="space-y-2 text-xs text-gray-700 dark:text-gray-200" aria-label={title || 'Fee calculation'}>
    <h4 className="font-bold">{title || 'How the Amount Was Worked Out'}</h4>
    <p>{saved.stage === 'estimate' ? 'Estimated charges — actual printed pages determine the final bill.' : 'Confirmed charges'} · {saved.source === 'college' ? 'College fee schedule' : 'Default fee schedule'}</p>
    <dl className="space-y-2">{saved.items.map((item, index) => <div key={index} className="flex justify-between gap-3">
      <div className="min-w-0 break-words"><dt className="font-semibold">{item.label}</dt><dd>{item.calculation}</dd></div>
      <dd className="shrink-0 font-mono">{formatPeso(item.amount)}</dd>
    </div>)}</dl>
    <p className="font-bold">{saved.stage === 'estimate' ? 'Estimate' : 'Total'}: {formatPeso(saved.total)}</p>
  </section>;
}
