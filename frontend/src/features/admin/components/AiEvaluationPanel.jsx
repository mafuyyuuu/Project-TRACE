import useAiEvaluation from '@/features/admin/useAiEvaluation';
import Button from '@/components/Button';
import { ocrFieldDetection } from '@/utils/ocrFieldDetection';

const number = value => value == null ? 'Not measured' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
const models = [
  { name: 'EasyOCR · text extraction', purpose: 'Reads document intake forms, school IDs and official receipts. Pattern matching extracts expected fields; ID checks compare recognized text with submitted details.',
    why: 'TRACE already runs a Python image pipeline. EasyOCR provides pretrained detection and recognition locally on CPU, reducing manual entry without sending school records to a cloud OCR provider.',
    alternatives: 'Tesseract is a reasonable local alternative for printed documents. Cloud OCR offers managed processing but adds a provider, network dependence and data-handling decisions. A custom neural model would require labeled school documents and ongoing training. TRACE has not benchmarked these alternatives.',
    limits: 'Blur, glare, handwriting and unfamiliar layouts can cause incorrect values. Automatic text matching does not establish document authenticity. Staff review and manual entry remain necessary.',
    measurement: 'Saved OCR confidence is the percentage of three expected fields found, not EasyOCR recognition confidence or accuracy. Registration and receipt OCR do not have a saved labeled evaluation dataset. Measure field exact-match accuracy, character/word error rates, and ID false acceptance/rejection on human-labeled examples.',
    href: 'https://www.jaided.ai/easyocr/documentation/', source: 'EasyOCR documentation' },
  { name: 'Prophet · request demand', purpose: 'Estimates incoming document rows for tomorrow and the following six Manila days using up to 90 complete days of daily request counts. One multi-document request can contribute several rows.',
    why: 'A daily series maps directly to Prophet’s trend and weekly seasonality. It fits the Python service and provides a manageable starting model for short-term staffing estimates. TRACE enables weekly seasonality; daily and yearly seasonality are disabled for this window.',
    alternatives: 'The weekday mean is the simple benchmark below. ARIMA/SARIMA are valid statistical alternatives requiring order and seasonality selection. Random Forest regression needs lag/calendar features and a time-aware validation design. LSTM/Transformer models need a separate training and tuning effort. No evidence currently establishes Prophet as the best of these models for PLP.',
    limits: 'Forecasts reflect recorded requests, including recognized generated rows. Gaps are counted as zero recorded requests; missing imports or outages may instead mean missing observations. Holidays and academic calendar effects are not separately modeled.',
    measurement: 'Train on earlier days and hold out the following seven days. Compare MAE, RMSE and WAPE against the same weekday baseline. One historical window is diagnostic evidence, not a validated real-world accuracy percentage. Repeat across periods and independently verified real data.',
    href: 'https://facebook.github.io/prophet/docs/diagnostics.html', source: 'Prophet evaluation documentation' },
  { name: 'Workflow rules · operational advice', purpose: 'Summarizes recorded queue counts, waiting times and support aggregates into reviewable suggestions. n8n routes requests using workflow rules.',
    why: 'Explicit rules can be traced to actual counts and desk policies. They keep operational advice understandable while labeled outcomes for a learned recommendation model are unavailable.',
    alternatives: 'A learned classifier would need representative labeled bottlenecks and an independent test set. An LLM could phrase suggestions, but would add inference cost and a separate grounding/evaluation requirement. Neither is established as more effective for TRACE’s current workflow.',
    limits: 'An earlier Random Forest demonstration used four hand-authored examples and has been retired from active advice. Current suggestions use aggregate rules and cannot prove a bottleneck cause or a staffing improvement.',
    measurement: 'No recommendation accuracy has been measured. Evaluate labeled bottleneck precision/recall, staff acceptance and subsequent turnaround changes. Rules and routing are automation; they do not have an ML accuracy score.',
    href: 'https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html', source: 'Random Forest documentation' },
];

function Metrics({ evaluation }) {
  return <div role="region" aria-label="Scrollable forecast errors" tabIndex={0} className="max-h-[60vh] overflow-y-auto overflow-x-auto">
    <table aria-label="Forecast error comparison" className="w-full min-w-[32rem] text-left text-sm">
      <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900"><tr>{['Model', 'MAE · requests/day', 'RMSE · requests/day', 'WAPE'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
      <tbody>{[['Prophet', evaluation.prophet], ['Weekday mean baseline', evaluation.baseline]].map(([name, value]) => <tr key={name} className="border-t border-gray-100 dark:border-gray-700">
        <th scope="row" className="p-3">{name}</th><td className="p-3">{number(value?.mae)}</td><td className="p-3">{number(value?.rmse)}</td><td className="p-3">{value?.wape == null ? 'Not measured' : `${number(value.wape)}%`}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

export default function AiEvaluationPanel() {
  const r = useAiEvaluation();
  const d = r.data?.dataset, e = r.data?.evaluation;
  const ocr = ocrFieldDetection({ method: d?.ocr_measurement_method, score: d?.ocr_field_detection,
    samples: d?.ocr_samples, total_scored: d?.ocr_total_scored ?? d?.ocr_samples,
    unverified_samples: d?.ocr_unverified_samples, synthetic_samples: d?.ocr_synthetic_samples });
  return <div className="trace-page min-w-0 text-sm text-gray-700 dark:text-gray-300">
    <section className="trace-section trace-section-body space-y-3">
      <h3 className="trace-section-title">What TRACE uses and why</h3>
      <p>Model choices below describe TRACE’s design rationale. A claim that one model is more accurate than another requires a comparable benchmark.</p>
      <p>Forecast error is measured against held-out recorded counts. OCR field detection and unvalidated recommendations have different evidence and must be reported separately.</p>
    </section>
    <section aria-label="Dataset reconciliation" className="trace-section trace-section-body space-y-3">
      <h3 className="trace-section-title">Where the record counts come from</h3>
      {d ? <>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[["Document rows", number(d.total)], ['Recognized synthetic rows', number(d.synthetic)], ['Unmarked rows · origin unverified', number(d.unmarked)], ['Recorded date range · Manila', `${d.first_date || 'No records'} → ${d.last_date || 'No records'}`]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt><dd className="select-text break-words font-semibold mt-1">{value}</dd></div>)}
        </dl>
        <p>Reports count matching document rows; one row can have many desk events. There are {number(r.data.logs.activity_events)} activity events in total. Activity and Security Log views show the latest 100 events, so 100 is a view limit, not the document total.</p>
        <p>The live forecast uses at most {r.data.live_window.start} through {r.data.live_window.end}. Archived dates do not move the live forecast back in time.</p>
      </> : <p>{r.loading ? 'Loading recorded dataset counts…' : 'Dataset counts are unavailable.'}</p>}
      <p>The generator creates tracking numbers beginning TRC-MOCK- and dates from January 2020 through July 20, 2026. That marker identifies known generated rows. Unmarked rows still need provenance verification. Generated scores demonstrate the evaluation process; they do not prove accuracy on real PLP demand.</p>
    </section>
    <section aria-label="Historical forecast evaluation" className="trace-section trace-section-body space-y-4">
      <h3 className="trace-section-title">Historical forecast evaluation</h3>
      <p>Select the last day of a seven-day test period. The model trains on up to 90 earlier days, then skips one simulated current day to match the live forecast; no held-out counts are sent to the model.</p>
      <form onSubmit={r.evaluate} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 min-w-0">Test period ending · Manila<input type="date" className="trace-control w-full" value={r.endDate} onChange={event => r.setEndDate(event.target.value)} /></label>
        <label className="grid gap-1 min-w-0 max-w-full">Dataset<select className="trace-control w-full" value={r.cohort} onChange={event => r.setCohort(event.target.value)}>
          <option value="all">All document rows</option><option value="synthetic">Recognized synthetic only</option><option value="unmarked">Unmarked · origin unverified</option>
        </select></label>
        <Button type="submit" disabled={r.loading} className="trace-button trace-button-primary">{r.loading ? 'Evaluating…' : 'Evaluate period'}</Button>
      </form>
      <p className="text-xs">Leave the date empty for the latest complete Manila day. Evaluation reads existing records and does not alter them.</p>
      {r.error && <p role="alert" className="text-red-700 dark:text-red-300">{r.error} {e ? 'The previously loaded period remains below.' : ''}</p>}
      {r.loading && <p role="status">Computing evaluation; any results below still describe the previously loaded period.</p>}
      {e && <div className="space-y-3" aria-live="polite">
        <p className="font-semibold">Loaded dataset: {e.cohort === 'all' ? 'All document rows' : e.cohort === 'synthetic' ? 'Recognized synthetic only' : 'Unmarked · origin unverified'}</p>
        <p>Training: {e.train_start || 'No recorded history'} through {e.train_end} · {number(e.train_days)} calendar days · {number(e.train_requests)} requests. Skipped current day: {e.simulated_today}. Test: {e.test_start} through {e.test_end} · {number(e.test_requests)} requests.</p>
        <p>{number(e.synthetic_requests)} recognized synthetic requests occur across this training/test window. Zero days mean no recorded requests; confirm collection was complete before interpreting them as zero actual demand.</p>
        {e.status === 'insufficient_data' && <p>Not enough evidence to evaluate: use at least 28 preceding calendar days with recorded training requests and a test period with recorded requests. Try an archived period within the dataset range.</p>}
        {e.status === 'prophet_unavailable' && <p>Prophet is unavailable or returned unusable predictions. Only the baseline was evaluated; Prophet accuracy remains unmeasured.</p>}
        <Metrics evaluation={e} />
        {e.improvement_percent != null && <p>Prophet MAE change against baseline: {number(e.improvement_percent)}% ({e.improvement_percent > 0 ? 'lower error' : e.improvement_percent < 0 ? 'higher error' : 'equal error'}). Positive means improvement; a negative result means Prophet did worse in this window.</p>}
        <p className="text-xs">Lower MAE/RMSE/WAPE is better. MAE is average absolute daily error; RMSE gives large misses more weight. WAPE is total absolute error ÷ total recorded requests × 100; it is undefined when the recorded total is zero. These are errors, not an accuracy percentage.</p>
        <div role="region" aria-label="Scrollable daily predictions" tabIndex={0} className="max-h-[60vh] overflow-y-auto overflow-x-auto"><table aria-label="Held-out daily predictions" className="w-full min-w-[28rem] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900"><tr>{['Manila day', 'Recorded', 'Prophet', 'Weekday mean'].map(label => <th key={label} className="p-3">{label}</th>)}</tr></thead>
          <tbody>{e.daily.map(row => <tr key={row.date} className="border-t border-gray-100 dark:border-gray-700"><th scope="row" className="p-3">{row.date}</th><td className="p-3">{number(row.actual)}</td><td className="p-3">{number(row.prophet)}</td><td className="p-3">{number(row.baseline)}</td></tr>)}</tbody>
        </table></div>
      </div>}
    </section>
    <section aria-label="OCR measurement status" className="trace-section trace-section-body space-y-3">
      <h3 className="trace-section-title">OCR measurements</h3>
      <p>Recorded intake field detection: <strong>{ocr.score == null ? 'Not measured' : `${number(ocr.score)}%`}</strong> from {number(ocr.samples)} document scans measured with the current three-field method. Each document contributes its latest saved measurement; this is not a count of all OCR attempts.</p>
      <p>Excluded from this measurement: {number(ocr.unverified)} historical/unverified scores and {number(ocr.synthetic)} marked synthetic scores. Old saved confidence values are not treated as current field-detection evidence.</p>
      <p>Recognition accuracy: <strong>Not measured.</strong> TRACE has no human-labeled ground truth evaluation for extracted values, registration checks or receipts. A score of 100% can mean all fields were found even if their values are wrong.</p>
    </section>
    {models.map(model => <article key={model.name} className="trace-section trace-section-body space-y-3">
      <h3 className="trace-section-title">{model.name}</h3><p>{model.purpose}</p>
      <h4 className="font-semibold">Why TRACE uses this</h4><p>{model.why}</p>
      <h4 className="font-semibold">Compared with alternatives</h4><p>{model.alternatives}</p>
      <h4 className="font-semibold">Limitations</h4><p>{model.limits}</p>
      <h4 className="font-semibold">How to measure it</h4><p>{model.measurement}</p>
      <a href={model.href} target="_blank" rel="noreferrer" className="text-[#15803d] dark:text-green-300 underline focus-visible:outline">{model.source}</a>
    </article>)}
  </div>;
}
