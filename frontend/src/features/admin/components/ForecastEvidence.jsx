import ForecastValidation from './ForecastValidation';
import PaginatedTable from '@/components/PaginatedTable';
import {formatDateTime} from '@/utils/formatters';
import InfoButton from '@/components/InfoButton';
export default function ForecastEvidence({forecast={},details=false}) {
  const history=forecast.history || [],method=forecast.source==='prophet'?'Prophet':forecast.source==='historical_weekday_average'?'Historical weekday average (fallback)':'No estimate available';
  return <InfoButton title="About this forecast" maxWidth="max-w-[800px]">
    {forecast.loading ? <p role="status">Loading forecast evidence…</p> : forecast.error ? <p role="alert" className="trace-inline-error">{forecast.error}</p> : <div className="min-w-0 space-y-3 break-words text-sm select-text">
    <p><strong>Method: {method}.</strong> {forecast.message}</p>
    <p>Solid line: recorded requests from the latest 14 complete days, when history is available. Dashed line: next seven days predicted. Dates use Manila time; today is excluded as incomplete.</p>
    {Number.isFinite(forecast.history_days) && <p>Input: {forecast.sample_size} recorded document requests across {forecast.history_days} complete Manila days{history.length?` (${history[0].date} to ${history.at(-1).date})`:''}. Each requested document counts once, including documents in a multi-document request.</p>}
    {forecast.as_of && <p className="trace-page-description">Snapshot: {formatDateTime(forecast.as_of)} Manila.</p>}
    <p className="trace-page-description">Forecast accuracy has not been validated on held-out real history.</p>
    {!details && <p>Choose Expand on the forecast card to inspect daily source counts and run held-out validation using its info icon.</p>}
    {details && <details className="trace-section trace-section-body">
      <summary className="cursor-pointer font-semibold">View forecast data source and daily counts</summary>
      <div className="mt-4 space-y-3">
        <p>Source: saved document requests, grouped by requested date in Manila time (documents.created_at). The complete model input is listed below, up to 90 days. Zero-request days are included; today is excluded because it is incomplete. No student identities are sent to Prophet.</p>
        <p>Records in a demonstration database may be synthetic. These counts do not certify that the input is real institutional history or prove predictive accuracy.</p>
        {history.length?<PaginatedTable aria-label="Forecast input daily counts" label="input days" resetKey={forecast.as_of} pageSize={10} className="trace-analytics-table min-w-[18rem]"><thead><tr><th scope="col" className="text-left">Manila date</th><th scope="col" className="text-right">Recorded document requests</th></tr></thead><tbody>{history.map(row=><tr key={row.date}><th scope="row" className="text-left whitespace-nowrap">{row.date}</th><td>{row.volume}</td></tr>)}</tbody></PaginatedTable>:<p>No daily input details are available. Refresh with the matching backend; fewer than 14 complete days cannot produce an estimate.</p>}
        <p><strong>Validation status:</strong> No measured forecast-error result is available. Forecasting should be evaluated on unseen later dates against a baseline. Scan field detection and passing software tests are separate from model accuracy.</p>
      </div>
    </details>}
    {details && <ForecastValidation key={`${forecast.as_of || 'initial'}:${forecast.document_type || 'All'}`} documentType={forecast.document_type}/>}
    </div>}
  </InfoButton>;
}
