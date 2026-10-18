import useAiEvaluation from '@/features/admin/useAiEvaluation';
import Button from '@/components/Button';
import { ocrFieldDetection } from '@/utils/ocrFieldDetection';
import StageRiskEvaluation from '@/features/admin/components/StageRiskEvaluation';

const number = value => value == null ? 'Not measured' : Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
const models = [
  { name: 'EasyOCR · text extraction', purpose: 'Reads text from scanned forms, IDs and receipts, then suggests values for the form. Staff still check the result.',
    why: 'It is ready to read English text and works on our server without a graphics card. We use it to reduce typing. We did not need to build and train a new text reader from scratch.',
    alternatives: 'Tesseract is another reasonable choice. Cloud OCR would use another provider. A custom reader would need training examples with checked answers. We chose the existing local EasyOCR setup; we have not proved it reads PLP forms better than these alternatives.',
    limits: 'Blur, glare, handwriting and unfamiliar layouts can cause incorrect values. Automatic text matching does not establish document authenticity. Staff review and manual entry remain necessary.',
    measurement: 'Saved OCR confidence is the percentage of three expected fields found, not EasyOCR recognition confidence or accuracy. Registration and receipt OCR do not have a saved labeled evaluation dataset. Measure field exact-match accuracy, character/word error rates, and ID false acceptance/rejection on human-labeled examples.',
    href: 'https://www.jaided.ai/easyocr/documentation/', source: 'EasyOCR documentation' },
  { name: 'Prophet · request demand', purpose: 'Estimates incoming document rows for tomorrow and the following six Manila days using up to 90 complete days of daily request counts. One multi-document request can contribute several rows.',
    why: 'Our question is: how many documents may be requested each day? Prophet can learn a changing trend and weekday patterns from dated counts. It works with our Python service and is a practical starting model for this task.',
    alternatives: 'We test Prophet against a simple average of earlier matching weekdays. ARIMA/SARIMA, Random Forest and neural models are other options, but each needs its own setup and fair test. We selected Prophet for its trend and weekday handling, not because we proved it is the best. If the simple average wins, we show that result.',
    limits: 'Forecasts reflect recorded requests, including recognized generated rows. Gaps are counted as zero recorded requests; missing imports or outages may instead mean missing observations. Holidays and academic calendar effects are not separately modeled.',
    measurement: 'Train on earlier days and hold out the following seven days. Compare MAE, RMSE and WAPE against the same weekday baseline. One historical window is diagnostic evidence, not a validated real-world accuracy percentage. Repeat across periods and independently verified real data.',
    href: 'https://facebook.github.io/prophet/docs/diagnostics.html', source: 'Prophet evaluation documentation' },
  { name: 'Random Forest · operational advice', purpose: 'An experimental classifier predicts another 24 hours in the same stage using simulated episodes plus eligible completed stage history. Workflow rules turn the prediction into a concrete review action; n8n routing and support advice remain rule-based.',
    why: 'Random Forest can learn nonlinear relationships between stage, calendar and waiting age from structured examples. It is suitable for this small tabular experiment and can run on our existing CPU service. Its usefulness must still be compared with simpler approaches.',
    alternatives: 'We report an always-majority baseline. Logistic regression, a single decision tree and direct workflow thresholds are reasonable alternatives; we have not established that Random Forest outperforms all of them. An LLM would need separate grounding and evaluation.',
    limits: 'The earlier four hand-authored examples are replaced by a reproducible simulation and eligible recorded intervals. The target is a further 24-hour stage wait, not the cause of a bottleneck. Mock outcomes and unverified records do not establish real-world accuracy. Model failure or missing stage-entry evidence retains workflow guidance.',
    measurement: 'Show accuracy, precision, recall, F1, false alerts and missed long waits on separate simulated episodes and held-out saved document groups. Saved unmarked test results remain unverified. A risk probability for one case is different from test accuracy; staff review and outcome monitoring remain necessary.',
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
      <h3 className="trace-section-title">AI explained in simple terms</h3>
      <p>EasyOCR reads text. Prophet estimates future request counts. Experimental Random Forest estimates stage-wait risk, with workflow rules supplying suggested actions and fallback guidance.</p>
      <p>We test each task separately. A forecast mistake, a missing field and a wrong recommendation are different problems; one overall AI accuracy percentage would hide those differences.</p>
    </section>
    <section aria-label="How to judge whether the AI is useful" className="trace-section trace-section-body space-y-3">
      <h3 className="trace-section-title">How can we trust the results?</h3>
      <ol className="list-decimal pl-5 space-y-2">
        <li><strong>Test on answers the model has not seen.</strong> Learn from earlier dates, then compare predictions with the next seven recorded days.</li>
        <li><strong>Compare with a simple method.</strong> Show whether Prophet makes fewer mistakes than the weekday average, including when it does worse.</li>
        <li><strong>Check where the data came from.</strong> Made-up demo records test the process; they cannot prove performance on actual PLP demand.</li>
        <li><strong>Check the task separately.</strong> OCR needs scans with human-checked answers. Random Forest scores describe its stage-wait test, with simulated and saved test sources shown separately.</li>
      </ol>
      <p>Staff review helps catch mistakes, but it is not proof that a model is accurate. Where testing is missing, we say <strong>Not measured</strong> and treat the result as assistance, not a guaranteed answer.</p>
    </section>
    <StageRiskEvaluation report={r.data?.random_forest} />
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
      <p>Choose the last day of a seven-day test. Prophet learns from earlier dates, then predicts the seven test days without seeing their answers. We skip one day between learning and testing to match the live forecast.</p>
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
        {e.status === 'insufficient_data' && <p>Not enough evidence to evaluate: choose a period with at least 28 earlier calendar days and some requests in both the learning and test periods. An older recorded period may work.</p>}
        {e.status === 'prophet_unavailable' && <p>Prophet is unavailable or returned unusable predictions. Only the baseline was evaluated; Prophet accuracy remains unmeasured.</p>}
        <Metrics evaluation={e} />
        {e.prophet && e.baseline && <p aria-label="Forecast result in plain language">In these test days, Prophet was off by about <strong>{number(e.prophet.mae)} requests per day</strong>. The simple weekday average was off by about <strong>{number(e.baseline.mae)} requests per day</strong>. {e.prophet.mae < e.baseline.mae ? 'Prophet made fewer mistakes in this test.' : e.prophet.mae > e.baseline.mae ? 'The simple average made fewer mistakes in this test.' : 'Both had the same average daily miss in this test.'} This result applies to the loaded data and dates.</p>}

        {e.improvement_percent != null && <p>Prophet MAE change against baseline: {number(e.improvement_percent)}% ({e.improvement_percent > 0 ? 'lower error' : e.improvement_percent < 0 ? 'higher error' : 'equal error'}). Positive means improvement; a negative result means Prophet did worse in this window.</p>}
        <p className="text-xs">Lower errors are better. MAE means the average daily miss: MAE 2 means about 2 requests off per day. RMSE gives extra weight to large mistakes. WAPE compares total mistakes with total recorded requests; it cannot be calculated if that total is zero. WAPE 20% does not mean 80% accuracy.</p>
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
