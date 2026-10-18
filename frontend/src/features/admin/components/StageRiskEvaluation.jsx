const percent = value => value == null ? 'Not measured' : `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
const number = value => Number(value || 0).toLocaleString();

export default function StageRiskEvaluation({ report }) {
  const ready = report?.status === 'ready';
  return <section aria-label="Random Forest evaluation" className="trace-section trace-section-body space-y-3 min-w-0">
    <h3 className="trace-section-title">Random Forest · experimental wait risk</h3>
    <p>Predicts whether a case may stay in its current stage for another 24 hours. Dashboard Insights applies it to the oldest case with a recorded entry time in each active stage, then shows the matching workflow action. It does not automatically move cases or assign staff.</p>
    {ready ? <>
      <p>Model <span className="select-text break-all">{report.model_id}</span>. Training: <strong>{number(report.training.simulated_documents)} simulated episodes</strong> and <strong>{number(report.training.recorded_documents)} saved document groups</strong> ({number(report.training.marked_synthetic_documents)} marked mock; {number(report.training.unmarked_unverified_documents)} unmarked, origin unverified). These produced {number(report.training.samples)} observations at different waiting ages.</p>
      <p>Database candidates: {number(report.data.candidate_intervals)} stage intervals; {number(report.data.eligible_intervals)} eligible; {number(report.data.excluded_intervals)} excluded. At most {number(report.data.interval_limit)} recent candidate intervals are read. Legacy statuses are not converted into modern stages. Missing timestamps, illegal transitions and waits over 720 hours are excluded.</p>
      <p>Saved history is divided by whole document: earlier completed groups train the model; later groups test it. {number(report.training.overlapping_intervals_excluded)} intervals crossing the split are excluded. With fewer than 10 eligible document groups, saved history is used for training only and its test score remains unmeasured. The synthetic test uses a separate seed and separate episodes.</p>
      <div role="region" aria-label="Scrollable Random Forest scores" tabIndex={0} className="max-h-[60vh] overflow-y-auto overflow-x-auto">
        <table aria-label="Random Forest test results" className="w-full min-w-[48rem] text-left text-sm [overflow-wrap:normal]">
          <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900"><tr>{['Test source', 'Documents', 'Observations', 'Accuracy', 'Precision', 'Recall', 'F1', 'Majority baseline'].map(label => <th key={label} className="p-3 whitespace-nowrap">{label}</th>)}</tr></thead>
          <tbody>{[['simulation', 'New simulated cases'], ['recorded', 'All held-out saved groups'], ['marked_synthetic', 'Saved marked mock groups'], ['unmarked_unverified', 'Saved unmarked · unverified']].map(([key, label]) => {
            const score = report.evaluation[key];
            return <tr key={key} className="border-t border-gray-100 dark:border-gray-700"><th scope="row" className="p-3">{label}</th><td className="p-3">{score ? number(score.documents) : 'Not measured'}</td><td className="p-3">{score ? number(score.samples) : 'Not measured'}</td>{['accuracy', 'precision', 'recall', 'f1', 'baseline_accuracy'].map(field => <td key={field} className="p-3">{percent(score?.[field])}</td>)}</tr>;
          })}</tbody>
        </table>
      </div>
      <p className="text-xs">Scroll across the table to view every score on a small screen.</p>
      <p>Accuracy: correct classifications divided by test observations. Precision: how often a predicted long wait was observed. Recall: how many observed long waits were flagged. F1 balances precision and recall. The majority baseline always predicts the most common training label; higher scores are better. Multiple observations from the same document are related, so also read the document count.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(report.evaluation).filter(([, score]) => score).map(([key, score]) => <div key={key} className="min-w-0">
          <p className="font-semibold">{key === 'simulation' ? 'Simulated test' : key === 'recorded' ? 'All saved test groups' : key === 'marked_synthetic' ? 'Marked mock test' : 'Unmarked test · unverified'}</p>
          <p>Correct short-wait predictions: {number(score.confusion_matrix[0][0])}. False alerts: {number(score.confusion_matrix[0][1])}. Missed long waits: {number(score.confusion_matrix[1][0])}. Correct long-wait predictions: {number(score.confusion_matrix[1][1])}.</p>
          {(!score.positives || !score.negatives) && <p>Only one outcome class appears in this test. It cannot demonstrate performance on both kinds of case.</p>}
        </div>)}
      </div>
      <p className="text-xs">This model uses current saved history as of {new Date(report.data.as_of).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })} Manila. The forecast date and dataset controls below apply to Prophet, not this model.</p>
    </> : <p>Random Forest evaluation is unavailable. Dashboard Insights uses workflow rules when the model or its recorded-history read fails. No Random Forest score is inferred.</p>}
    <p><strong>Real-world accuracy: not established.</strong> Simulated training assumes different stage durations and longer waits near weekends. These assumptions are not measured PLP capacity. Unmarked saved records are not certified real data. Completed episodes can underrepresent very long unfinished cases. The model uses stage, Manila weekday/hour and hours already waiting; it does not know staffing, holidays, document complexity or the reason for a delay. Dashboard predictions cover waiting ages up to 168 hours. A predicted probability is not an accuracy score.</p>
  </section>;
}
