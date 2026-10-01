import { formatPeso } from '@/utils/pricing';

/** Render saved calculations, never reconstruct a historical bill from today's rates. */
export default function FeeBreakdown({ breakdown, amount, title }) {
  let saved = breakdown;
  if (typeof saved === 'string') { try { saved = JSON.parse(saved); } catch { saved = null; } }
  if (!saved?.items) return <p className="text-xs text-gray-600 dark:text-gray-300">Recorded charge: {formatPeso(amount)}. Detailed calculation was not saved for this older record.</p>;
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
