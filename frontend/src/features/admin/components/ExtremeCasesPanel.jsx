import {formatDuration,formatDateTime} from '@/utils/formatters';
const labels={long_desk_wait:'Long desk wait',beyond_15_days:'Beyond 15 working days',past_estimate:'Past Ready By'};
export default function ExtremeCasesPanel({data}){
  if(!data)return null;
  return <section aria-label="Current extreme cases" className="trace-section overflow-hidden">
    <div className="trace-section-header"><div><h3 className="trace-section-title">Current Extreme Cases</h3><p className="trace-page-description">{data.status==='ready' ? `Current open requests · ${formatDateTime(data.as_of)} · independent of the historical chart period.` : data.message}</p></div></div>
    {data.status==='ready' && <div className="trace-section-body space-y-4">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">{Object.entries(labels).map(([key,label])=><div key={key} className="trace-analytics-tally"><dt className="text-sm">{label}</dt><dd className="text-xl font-bold tabular-nums">{data.counts[key]}</dd></div>)}</dl>
      <p className="trace-page-description">{data.total} flagged of {data.active_documents} open documents. A document can have several flags. {data.unmeasured_desk_waits} lack sufficient desk history for an outlier comparison.</p>
      <div role="region" aria-label="Extreme cases table" tabIndex={0} className="max-h-80 overflow-auto"><table aria-label="Flagged document cases" className="trace-admin-data-table min-w-[48rem]"><thead><tr>{['Tracking / document','Current stage','Elapsed working days','Ready By','Desk wait','Flags'].map(label=><th scope="col" key={label} className={['Elapsed working days','Desk wait'].includes(label) ? 'trace-table-number' : 'text-left'}>{label}</th>)}</tr></thead><tbody>
        {data.rows.map(row=><tr key={row.id}><th scope="row" className="text-left"><span className="font-mono">{row.tracking_number}</span><span className="block mt-1 font-normal">{row.document_type}</span></th><td>{row.stage_label}</td><td className="trace-table-number">{row.working_days_elapsed ?? 'Not measured'}</td><td>{row.estimated_ready_date || 'Not set'}</td><td className="trace-table-number">{row.stage_wait_minutes==null ? 'Not measured' : formatDuration(row.stage_wait_minutes)}{row.stage_p90_minutes!=null && <span className="block text-xs mt-1">Stage p90: {formatDuration(row.stage_p90_minutes)} · {row.stage_samples} intervals</span>}</td><td>{row.flags.map(flag=><span key={flag} className="block text-amber-700 dark:text-amber-300">{labels[flag]}</span>)}</td></tr>)}
        {!data.rows.length && <tr><td colSpan={6}>No open documents meet the measured flag criteria.</td></tr>}
      </tbody></table></div>
      {data.total>100 && <p className="trace-page-description">Showing the first 100 flagged documents, ordered by number of flags and elapsed working days.</p>}
      <p className="trace-page-description">Review the tracking number in Document Tracker, check the recorded handoffs and contact the responsible desk or student before deciding an action.</p>
      <details><summary className="cursor-pointer text-sm font-semibold">How these flags are measured</summary><ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-gray-600 dark:text-gray-300">{data.notes.map(note=><li key={note}>{note}</li>)}</ul></details>
    </div>}
  </section>;
}
