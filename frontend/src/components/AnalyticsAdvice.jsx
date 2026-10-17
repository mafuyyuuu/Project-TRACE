/** Advice accompanies measured values and never replaces their saved evidence. */
export default function AnalyticsAdvice({analysis}) {
  return <section aria-label="Analytics analysis" className="trace-section trace-section-body space-y-3">
    <div><h3 className="trace-section-title">Analysis</h3><p className="trace-page-description">{analysis?.source==='ai_engine_aggregate_rules' ? 'AI service analysis of the loaded report aggregates. Recommendations use recorded measurements and explicit rules.' : 'AI service analysis is unavailable. Measured report values remain available below.'}</p></div>
    {analysis?.insights?.map((row,index)=><article key={index} className="trace-support-conversation-note select-text"><h4 className="font-bold">{row.title}</h4><p className="mt-1 break-words">{row.message}</p>{Number.isFinite(row.sample_size) && <p className="mt-1">{row.sample_size} recorded observations</p>}</article>)}
  </section>;
}
