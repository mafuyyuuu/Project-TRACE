import PdfExportButton from '@/components/PdfExportButton';
import AnalyticsAdvice from '@/components/AnalyticsAdvice';
import PaginatedTable from '@/components/PaginatedTable';
import AdminIcon from '@/features/admin/components/AdminIcon';
import { useId, useState } from 'react';
import Button from '@/components/Button';
import useSupportAnalytics from '@/hooks/useSupportAnalytics';
import { supportMetricNumber, supportMetricTotal, supportPeriodTime } from '@/utils/supportAnalyticsPresentation';

const durationLabels = {
  initial_queue: 'Initial Queue Wait',
  requeue: 'Requeue Wait',
  first_response: 'First Human Response',
  resolution_service: 'Resolution (Service Time, Excluding Awaiting Student)',
  resolution_wall: 'Resolution (Wall Time)',
  awaiting_student: 'Awaiting Student Pause',
  student_reply: 'Requested Student Reply / Timeout',
};

function MetricValue({ value, percent = false }) {
  const formatted = supportMetricNumber(value);
  return <span className={formatted === 'No data' ? 'trace-analytics-missing' : undefined}>{formatted}{percent && formatted !== 'No data' ? '%' : ''}</span>;
}

function MetricCard({ label, value, context, percent, admin = false }) {
  return (
    <div className="trace-section trace-section-body trace-card-info trace-admin-support-metric flex flex-col">
      <dt className="trace-analytics-label">{label}{admin && <span className={'trace-admin-analytics-metric-icon ' + (label === 'Unresolved Backlog' ? 'trace-admin-analytics-icon-warn' : label === 'Escalations' ? 'trace-admin-analytics-icon-neutral' : '')}><AdminIcon name={{ 'New Tickets': 'support-metric-file', Escalations: 'support-metric-alert', 'Unresolved Backlog': 'support-metric-clock', 'FAQ Views': 'support-metric-eye', 'Explicit FAQ Resolutions': 'support-metric-check', 'Staff Assigned Episodes': 'support-metric-users' }[label]} /></span>}</dt>
      <dd className={"trace-analytics-value select-text " + (label === 'Unresolved Backlog' ? 'trace-admin-backlog-value' : '')}><MetricValue value={value} percent={percent} /></dd>
      <dd className="trace-analytics-context">{context}</dd>
    </div>
  );
}

function SummaryPanel({ title, description, entries, empty, labels = false }) {
  return (
    <section aria-label={title} className="trace-section trace-section-body space-y-4">
      <div><h4 className="trace-section-title">{title}</h4><p className="trace-page-description">{description}</p></div>
      {entries.length ? <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{entries.map(([name, count]) => (
        <div key={name} className="trace-analytics-tally">
          <dt className="min-w-0 break-words text-sm text-gray-600 dark:text-gray-300">{labels ? name.replaceAll('_', ' ') : name}</dt>
          <dd className="select-text shrink-0 text-xl font-semibold tabular-nums text-pine-700 dark:text-green-300"><MetricValue value={count} /></dd>
        </div>
      ))}</dl> : <p className="trace-analytics-missing text-sm">{empty}</p>}
    </section>
  );
}

// Pure presentation: metric definitions and authorization remain in the report API.
export default function SupportAnalytics({ admin = false }) {
  const state = useSupportAnalytics(), data = state.data;
  const [from, setFrom] = useState(''), [to, setTo] = useState('');
  const id = useId();
  const applyPeriod = event => {
    event.preventDefault();
    if (!state.loading) void state.load({ dateFrom: from || undefined, dateTo: to || undefined });
  };

  return (
    <section aria-label="Support analytics" className={'trace-page ' + (admin ? 'trace-admin-support-analytics' : '')}>
      <div className={admin ? 'trace-section trace-admin-support-period' : undefined}>
      <div className={'trace-page-header ' + (admin ? 'trace-admin-support-period-header' : '')}>
        <div className="sm:flex-1 sm:basis-72">
          <h3 className="trace-page-title">Support <span className="text-pine-700 dark:text-green-300">Analytics</span></h3>
          <p className="trace-page-description">Ticket-service metrics, separate from document turnaround. Defaults to the last 30 days.</p>
        </div>
        <form aria-label="Support reporting period" onSubmit={applyPeriod} className="flex min-w-0 max-w-full flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 basis-36"><label htmlFor={`${id}-from`} className="trace-label">From</label><input id={`${id}-from`} type="date" value={from} onChange={event => setFrom(event.target.value)} className="trace-control mt-1 block w-full" /></div>
          <div className="min-w-0 flex-1 basis-36"><label htmlFor={`${id}-to`} className="trace-label">Through</label><input id={`${id}-to`} type="date" min={from || undefined} value={to} onChange={event => setTo(event.target.value)} className="trace-control mt-1 block w-full" /></div>
          <Button type="submit" disabled={state.loading} className="trace-button trace-button-primary">{admin && <AdminIcon name="support-metric-apply" />}Apply period</Button>
          {admin && <PdfExportButton kind="support" filters={state.appliedFilters} disabled={!data || state.loading || Boolean(state.error)}/>}
        </form>
      </div>
      {data && <>
        <div className="trace-analytics-period">
          <span className="font-semibold flex items-center gap-2">{admin && <AdminIcon name="support-metric-calendar" />}Loaded period · Manila</span>
          <span className="select-text break-words">{supportPeriodTime(data.period.from)} → {supportPeriodTime(data.period.to_exclusive)} <span className="font-normal">(end exclusive)</span></span>
        </div>
      </>}
      </div>


      {state.loading && <p role="status" className="text-sm text-gray-600 dark:text-gray-300">{data ? 'Refreshing support metrics; these are the previous loaded results.' : 'Loading support metrics…'}</p>}
      {state.error && <div role="alert" className="trace-error"><p>{state.error}</p>{data && <p className="mt-1">The previous loaded period remains below. Choose Apply period to retry.</p>}</div>}

      {data && <>
        <AnalyticsAdvice analysis={data.analysis}/>


        <dl aria-label="Support summary metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard admin={admin} label="New Tickets" value={data.created} context={<><MetricValue value={data.imported} /> imported tickets, counted separately</>} />
          <MetricCard admin={admin} label="Escalations" value={data.escalation.percent} percent context={<><MetricValue value={data.escalation.numerator} /> / <MetricValue value={data.escalation.denominator} /> FAQ-assisted tickets escalated</>} />
          <MetricCard admin={admin} label="Unresolved Backlog" value={supportMetricTotal(Object.values(data.backlog))} context="Unresolved at the reporting cutoff" />
          <MetricCard admin={admin} label="FAQ Views" value={data.faq.views} context={<><MetricValue value={data.faq.helpful} /> helpful · <MetricValue value={data.faq.not_helpful} /> not helpful</>} />
          <MetricCard admin={admin} label="Explicit FAQ Resolutions" value={data.faq.resolved} context="Recorded resolved actions" />
          <MetricCard admin={admin} label="Staff Assigned Episodes" value={supportMetricTotal(data.workload.map(row => row.assignments))} context="Volume, not a performance ranking" />
        </dl>

        <section aria-label="Measured durations" className="trace-section overflow-hidden">
          <div className="trace-section-body pb-0 sm:pb-0">
            <h4 className="trace-section-title">Measured Durations <span className="font-normal text-gray-600 dark:text-gray-300">(Minutes)</span></h4>
            <p id={`${id}-durations-context`} className="trace-page-description">Service time uses recorded Manila calendars. Imported histories are excluded from duration samples.</p>
          </div>
          <div role="region" aria-label="Measured duration table" tabIndex={0} className="trace-analytics-scroller">
            <PaginatedTable label="duration metrics" aria-describedby={`${id}-durations-context ${id}-durations-help`} className="trace-analytics-table min-w-[38rem]">
              <caption className="sr-only">Measured Durations (Minutes)</caption>
              <thead><tr>{['Metric', 'Median', 'p90', 'Samples', 'Missing'].map((label, index) => <th scope="col" key={label} className={index === 0 ? 'text-left' : 'text-right'}>{label}</th>)}</tr></thead>
              <tbody>{Object.entries(data.durations).map(([name, row]) => (
                <tr key={name}>
                  <th scope="row" className="w-2/5 min-w-56 text-left">{durationLabels[name] || name}</th>
                  <td><MetricValue value={row.median_minutes} /></td><td><MetricValue value={row.p90_minutes} /></td><td><MetricValue value={row.samples} /></td><td><span className={admin && row.missing > 0 ? 'trace-admin-missing-count' : undefined}><MetricValue value={row.missing} /></span></td>
                </tr>
              ))}</tbody>
            </PaginatedTable>
          </div>
          <p id={`${id}-durations-help`} className={admin ? 'trace-admin-duration-note' : 'trace-page-description p-4'}>Missing measurements are not zeros. p90 is the 90th percentile. On smaller screens, scroll horizontally for all columns.</p>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SummaryPanel title="New Ticket Categories" description="Non-imported tickets created in the selected period, by recorded category at cutoff." entries={Object.entries(data.categories)} empty="No new tickets in this period." />
          <SummaryPanel title="Unresolved Backlog at Cutoff" description="Historical states at the end of the loaded period; unknown history remains visible." entries={Object.entries(data.backlog)} labels empty="No recorded unresolved backlog." />
        </div>

        <div className={admin ? 'grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-2 trace-admin-support-tables' : 'space-y-6'}>
        <section aria-label="Explicit FAQ feedback" className="trace-section overflow-hidden">
          <div className="trace-section-body pb-0 sm:pb-0"><h4 className="trace-section-title">Explicit FAQ Feedback</h4><p className="trace-page-description">Recorded actions by topic in the selected period. Views, helpful responses and explicit resolutions measure different actions.</p></div>
          <div role="region" aria-label="FAQ feedback table" tabIndex={0} className="trace-analytics-scroller">
            <PaginatedTable label="FAQ topics" className="trace-analytics-table min-w-[38rem]">
              <caption className="sr-only">Explicit FAQ Feedback by Topic</caption>
              <thead><tr>{['Topic', 'Views', 'Helpful', 'Not Helpful', 'Resolved'].map((label, index) => <th scope="col" key={label} className={index === 0 ? 'text-left' : 'text-right'}>{label}</th>)}</tr></thead>
              <tbody>{Object.entries(data.faq.topics).map(([topic, row]) => <tr key={topic}><th scope="row" className="text-left">{topic}</th><td><MetricValue value={row.views} /></td><td><MetricValue value={row.helpful} /></td><td><MetricValue value={row.not_helpful} /></td><td><MetricValue value={row.resolved} /></td></tr>)}{!Object.keys(data.faq.topics).length && <tr><td colSpan={5} className={admin ? 'trace-analytics-empty trace-analytics-missing' : '!text-left trace-analytics-missing'}>{admin && <span className="trace-admin-analytics-empty-icon"><AdminIcon name="support-metric-inbox" /></span>}<strong className="block">No recorded FAQ actions in this period.</strong>{admin && <span className="block mt-2 text-xs">FAQ views and ratings will be listed here by topic.</span>}</td></tr>}</tbody>
            </PaginatedTable>
          </div>
        </section>

        <section aria-label="Clerk workload" className="trace-section overflow-hidden">
          <div className="trace-section-body pb-0 sm:pb-0"><h4 className="trace-section-title">Clerk Workload</h4><p className="trace-page-description">Assigned and responded episodes are separate recorded activity counts; reopened tickets can have multiple episodes.</p></div>
          <div role="region" aria-label="Clerk workload table" tabIndex={0} className="trace-analytics-scroller">
            <PaginatedTable label="staff episodes" className="trace-analytics-table min-w-[30rem]">
              <caption className="sr-only">Clerk Workload Episodes</caption>
              <thead><tr>{['Clerk', 'Assigned Episodes', 'Responded Episodes'].map((label, index) => <th scope="col" key={label} className={index === 0 ? 'text-left' : 'text-right'}>{label}</th>)}</tr></thead>
              <tbody>{data.workload.map(row => <tr key={row.id}><th scope="row" className="text-left">{row.name}</th><td><MetricValue value={row.assignments} /></td><td><MetricValue value={row.response_episodes} /></td></tr>)}{!data.workload.length && <tr><td colSpan={3} className={admin ? 'trace-analytics-empty trace-analytics-missing' : '!text-left trace-analytics-missing'}>{admin ? <><span className="trace-admin-analytics-empty-icon"><AdminIcon name="support-metric-inbox" /></span><strong className="block">No recorded staff assignments or responses.</strong><span className="block mt-2 text-xs">Clerk activity will appear here by name with assigned and response episodes.</span></> : 'No recorded staff assignments or responses in this period.'}</td></tr>}</tbody>
            </PaginatedTable>
          </div>
        </section>

        </div>
        {data.manual_faq && <section aria-label="FAQ improvement suggestions" className="trace-section trace-section-body space-y-4">
          <div><h4 className="trace-section-title">FAQ Improvement Suggestions</h4><p className="trace-page-description">User Manual responses from every account type in the loaded period: {data.manual_faq.helpful} helpful · {data.manual_faq.not_helpful} not helpful. Latest response per account/question; suggestions are visible only to Admin.</p></div>
          {data.manual_faq.suggestions.length ? <ul className="space-y-3">{data.manual_faq.suggestions.map((row,index)=><li className="trace-analytics-tally !block" key={row.submitted_at+'-'+index}><p className="font-semibold text-sm">{row.question}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{row.suggestion}</p><p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{supportPeriodTime(row.submitted_at)}</p></li>)}</ul> : <p className="trace-analytics-missing text-sm">No improvement suggestions were submitted in this period.</p>}
          {data.manual_faq.suggestion_count>100 && <p className="trace-page-description">Showing the latest 100 of {data.manual_faq.suggestion_count} suggestions. Apply a shorter period to inspect the others.</p>}
        </section>}
        <section aria-label="Support metric definitions" className="trace-section trace-section-body space-y-2">
          <h4 className="trace-section-title flex items-center gap-2">{admin && <AdminIcon name="analytics-info" />}Measurement Notes</h4>
          <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600 dark:text-gray-300">{data.notes.map(note => <li key={note}>{note}</li>)}</ul>
        </section>
      </>}
    </section>
  );
}
