import {useId} from 'react';
import Button from '@/components/Button';
export default function FaqFeedback({question,reviews}){
  const id=useId(),choice=reviews?.selected[question] ?? reviews?.feedback[question]?.action;
  return <><div className="trace-admin-manual-feedback"><span>Was this helpful?</span>{[['Yes','helpful'],['No','not_helpful']].map(([label,value])=><Button key={value} type="button" className="trace-action" disabled={!reviews || reviews.pending[question]} aria-pressed={choice===value} onClick={()=>reviews.choose(question,value)}>{label}</Button>)}</div>
    {choice==='not_helpful' && <form aria-label={`Suggestion for ${question}`} className="trace-manual-suggestion" onSubmit={event=>{event.preventDefault();void reviews.saveSuggestion(question);}}>
      <label htmlFor={id} className="trace-label">What should we improve? <span className="font-normal">(optional)</span></label>
      <textarea id={id} className="trace-control w-full" maxLength={2000} rows={3} value={reviews.drafts[question] ?? reviews.feedback[question]?.suggestion ?? ''} onChange={event=>reviews.setDraft(question,event.target.value)} placeholder="Tell us what was missing. Avoid passwords or private student records."/>
      <Button type="submit" disabled={reviews.pending[question]} className="trace-button trace-button-secondary">Send suggestion</Button>
    </form>}
    {reviews?.pending[question] && <p role="status" className="trace-manual-feedback-status">Saving feedback…</p>}
    {reviews?.errors[question] && <div role="alert" className="trace-manual-feedback-status trace-inline-error">{reviews.errors[question]} <Button type="button" className="trace-action" onClick={()=>reviews.choose(question,choice)} disabled={reviews.pending[question]}>Retry feedback</Button></div>}
    {reviews?.notices[question] && <p role="status" className="trace-manual-feedback-status">{reviews.notices[question]}</p>}
  </>;
}
