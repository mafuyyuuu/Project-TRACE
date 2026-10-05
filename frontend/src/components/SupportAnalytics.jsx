import { useState } from 'react';
import Button from '@/components/Button';
import useSupportAnalytics from '@/hooks/useSupportAnalytics';
const labels={initial_queue:'Initial Queue Wait',requeue:'Requeue Wait',first_response:'First Human Response',resolution_service:'Resolution (Service Time, Excluding Awaiting Student)',resolution_wall:'Resolution (Wall Time)',awaiting_student:'Awaiting Student Pause',student_reply:'Requested Student Reply / Timeout'};
const number=value=>value===null || value===undefined ? 'No data' : Number(value).toLocaleString('en-PH',{maximumFractionDigits:1});
export default function SupportAnalytics() {
  const state=useSupportAnalytics(),data=state.data;
  const [from,setFrom]=useState(''),[to,setTo]=useState('');
  return <section aria-label="Support analytics" className="space-y-4 min-w-0">
    <h3 className="trace-section-title">Support Analytics</h3>
    <p className="text-sm">Ticket-service metrics, separate from document turnaround. Defaults to the last 30 days. Service time uses recorded Manila calendars; imported histories are excluded from duration samples.</p>
    <form onSubmit={event=>{event.preventDefault();void state.load({dateFrom:from || undefined,dateTo:to || undefined});}} className="flex flex-wrap items-end gap-3">
      <label className="trace-label min-w-0">From<input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="trace-control mt-1 block max-w-full" /></label>
      <label className="trace-label min-w-0">Through<input type="date" value={to} onChange={e=>setTo(e.target.value)} className="trace-control mt-1 block max-w-full" /></label>
      <Button type="submit" disabled={state.loading} className="trace-button trace-button-secondary">Apply period</Button>
    </form>
    {state.loading && <p role="status">Loading support metrics…</p>}
    {state.error && <p role="alert" className="trace-inline-error">{state.error}</p>}
    {data && <>
      <p className="text-sm">{new Date(data.period.from).toLocaleString('en-PH',{timeZone:'Asia/Manila'})} to {new Date(data.period.to_exclusive).toLocaleString('en-PH',{timeZone:'Asia/Manila'})} (end exclusive, Manila). {state.loading && 'Refreshing; these are the previous loaded results.'}</p>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[['New Tickets',data.created],['Imported Tickets in Cohort',data.imported],['Escalations / FAQ-assisted Creation Cohort',`${data.escalation.numerator}/${data.escalation.denominator} · ${number(data.escalation.percent)}${data.escalation.percent===null ? '' : '%'}`]].map(([label,value])=><div key={label} className="trace-section trace-section-body"><dt className="text-sm font-semibold">{label}</dt><dd className="mt-2 text-xl font-bold">{value}</dd></div>)}</dl>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700"><table className="min-w-[36rem] w-full text-left text-sm"><caption className="p-3 text-left font-bold">Measured Durations (Minutes)</caption><thead><tr>{['Metric','Median','p90','Samples','Missing'].map(label=><th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{Object.entries(data.durations).map(([name,row])=><tr key={name} className="border-t border-gray-200 dark:border-gray-700"><th scope="row" className="p-3 max-w-64 whitespace-normal">{labels[name] || name}</th><td className="p-3">{number(row.median_minutes)}</td><td className="p-3">{number(row.p90_minutes)}</td><td className="p-3">{row.samples}</td><td className="p-3">{row.missing}</td></tr>)}</tbody></table></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div><h4 className="font-bold">New Ticket Categories</h4><ul className="mt-2 space-y-2">{Object.entries(data.categories).map(([name,count])=><li key={name}>{name}: {count}</li>)}</ul>{!Object.keys(data.categories).length && <p>No new tickets in this period.</p>}</div>
        <div><h4 className="font-bold">Unresolved Backlog at Cutoff</h4><ul className="mt-2 space-y-2">{Object.entries(data.backlog).map(([name,count])=><li key={name}>{name.replaceAll('_',' ')}: {count}</li>)}</ul>{!Object.keys(data.backlog).length && <p>No recorded unresolved backlog.</p>}</div>
      </div>
      <div className="space-y-2"><h4 className="font-bold">Explicit FAQ Feedback</h4><p className="text-sm">{data.faq.views} views · {data.faq.helpful} helpful / {data.faq.feedback_denominator} helpful-or-not-helpful responses · {data.faq.resolved} explicit resolved actions. Silence is not a resolution.</p>{Object.entries(data.faq.topics).map(([topic,row])=><p key={topic} className="text-sm">{topic}: {row.views} views · {row.helpful} helpful · {row.not_helpful} not helpful · {row.resolved} resolved</p>)}</div>
      <div className="overflow-x-auto"><table className="min-w-[28rem] w-full text-left text-sm"><caption className="p-3 text-left font-bold">Clerk Workload</caption><thead><tr>{['Clerk','Assigned Episodes','Responded Episodes'].map(label=><th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{data.workload.map(row=><tr key={row.id} className="border-t border-gray-200 dark:border-gray-700"><th scope="row" className="p-3 break-words">{row.name}</th><td className="p-3">{row.assignments}</td><td className="p-3">{row.response_episodes}</td></tr>)}</tbody></table>{!data.workload.length && <p>No recorded staff assignments or responses in this period.</p>}</div>
      {data.notes.map(note=><p key={note} className="text-sm">{note}</p>)}
    </>}
  </section>;
}
