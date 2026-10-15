import Button from '@/components/Button';

/** Shared list view; membership and paging are supplied by the authorized API. */
export default function TicketArchiveTabs({ view, onChange, disabled = false }) {
  return <div role="group" aria-label="Ticket views" className="trace-ticket-archive-tabs">{[['active','Active'],['archive','Archive']].map(([value,label]) => <Button key={value} type="button" disabled={disabled} aria-pressed={view===value} onClick={()=>onChange(value)} className={`trace-button ${view===value ? 'trace-admin-button-soft' : 'trace-button-secondary'}`}>{label}</Button>)}</div>;
}
