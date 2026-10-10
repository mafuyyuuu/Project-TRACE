import { useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import SupportConversation from '@/components/SupportConversation';
import SupportAnalytics from '@/components/SupportAnalytics';
import useSupportTickets from '@/hooks/useSupportTickets';
import useSupportRequestChoices from '@/hooks/useSupportRequestChoices';
const labels = { FAQ_ASSISTANCE:'FAQ assistance',QUEUED:'Queued',IN_PROGRESS:'In progress',AWAITING_STUDENT:'Awaiting student',RESOLVED:'Resolved' };
function SettingsForm({ config,onStage,busy }) {
  const [draft,setDraft] = useState(() => ({...config,closed_dates:config.closed_dates.join('\n')}));
  const time = minutes => `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
  const update = (name,value) => setDraft(previous => ({...previous,[name]:value}));
  return <form id="support-settings-form" onSubmit={event => { event.preventDefault(); onStage({kind:'settings',settings:{...draft,closed_dates:draft.closed_dates.split(/\s+/).filter(Boolean)}}); }} className="space-y-4">
    <p className="text-sm">Global settings affect live claims and future reply clocks. Existing clocks retain their starting settings. FAQ access and ticket submission stay available outside hours. All times use Asia/Manila.</p>
    <fieldset><legend className="trace-label">Live Support Days</legend><div className="mt-2 flex flex-wrap gap-3">{['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,index) => <label key={day} className="flex items-center gap-2 text-sm"><input type="checkbox" className="trace-choice" checked={draft.weekdays.includes(index)} disabled={busy} onChange={event => update('weekdays',event.target.checked ? [...draft.weekdays,index].sort() : draft.weekdays.filter(value => value !== index))} />{day}</label>)}</div></fieldset>
    <div className="trace-form-grid">{[['open_minute','Opening Time'],['close_minute','Closing Time']].map(([name,label]) => <label key={name} className="trace-label">{label}<input required type="time" value={time(draft[name])} disabled={busy} onChange={event => { const [hours,minutes] = event.target.value.split(':').map(Number); update(name,hours*60+minutes); }} className="trace-control mt-1 w-full" /></label>)}</div>
    <label className="trace-label block">Closed Dates<textarea value={draft.closed_dates} disabled={busy} onChange={event => update('closed_dates',event.target.value)} placeholder="YYYY-MM-DD, one date per line" className="trace-control mt-1 w-full" /></label>
    <div className="trace-form-grid">{[['warning_minutes','Reply Warning (Service Minutes)'],['timeout_minutes','Reply Timeout (Service Minutes)']].map(([name,label]) => <label key={name} className="trace-label">{label}<input required type="number" min="1" max="60" step="1" value={draft[name]} disabled={busy} onChange={event => update(name,Number(event.target.value))} className="trace-control mt-1 w-full" /></label>)}</div>
    <p className="text-sm">Warning must come before timeout. The explicit Request student reply action starts the clock; ordinary staff messages do not. Timeout releases the clerk and moves the ticket to Awaiting student, never Resolved.</p>
  </form>;
}
export default function SupportWorkspace({user,initialDocumentId,compact = false}) {
  const state = useSupportTickets(user,initialDocumentId), choices = useSupportRequestChoices(user);
  const [form,setForm] = useState(null), [subject,setSubject] = useState(''), [documentId,setDocumentId] = useState(initialDocumentId ? String(initialDocumentId) : '');
  const [staged,setStaged] = useState(null), [showTickets,setShowTickets]=useState(false);
  const windowClerk = user.role === 'clerk' && ['Window 1','Receiving Desk'].includes(user.desk_assignment);
  const canGeneral = ['student','admin'].includes(user.role) || windowClerk;
  const stage = action => setStaged(action);
  return <section className="flex h-full min-h-0 min-w-0 flex-col gap-3" aria-label="Support workspace">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <h2 className={compact ? 'sr-only' : 'trace-page-title'}>Support</h2>
      <div className="flex flex-wrap gap-2">
        {compact && state.selected && <Button type="button" aria-expanded={showTickets} onClick={()=>setShowTickets(value=>!value)} className="trace-button trace-button-secondary">{showTickets ? 'Hide tickets' : 'Tickets'}</Button>}
        <details open={!compact} className={compact ? 'relative' : 'contents'}><summary className={compact ? 'trace-button trace-button-secondary cursor-pointer' : 'hidden'}>Support actions</summary><div className="flex flex-wrap gap-2">
        <Button type="button" onClick={() => setForm('create')} className="trace-button trace-button-primary">{user.role==='student' ? 'New ticket' : 'Open linked case'}</Button>
        {windowClerk && <>
          <Button type="button" disabled={state.busy || !state.settings} aria-pressed={Boolean(state.settings?.available)} onClick={() => stage({kind:'availability',available:!state.settings.available})} className="trace-button trace-button-secondary">{state.settings?.available ? 'Available' : 'Unavailable'}</Button>
          <Button type="button" disabled={state.busy || !state.settings?.available} onClick={() => stage({kind:'claim'})} className="trace-button trace-button-primary">Claim oldest ticket</Button>
        </>}
        {state.settings?.can_manage && <Button type="button" onClick={() => setForm('settings')} className="trace-button trace-button-secondary">Support settings</Button>}
        {state.settings?.can_manage && <Button type="button" onClick={() => setForm('analytics')} className="trace-button trace-button-secondary">Support analytics</Button>}
        </div></details>
      </div>
    </header>
    {state.error && <p role="alert" className="trace-inline-error text-sm">{state.error} <Button type="button" onClick={state.retry} className="trace-action underline">Retry support</Button></p>}
    {state.notice && <p role="status" className="text-sm">{state.notice}</p>}
    {!canGeneral && <p className="text-sm">Linked request tickets only. Your existing desk and college permissions apply.</p>}
    <div className={`grid min-h-0 min-w-0 flex-1 gap-3 ${compact ? 'grid-rows-[auto_minmax(0,1fr)]' : 'min-h-[32rem] h-[75dvh] grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(14rem,1fr)_minmax(0,3fr)] lg:grid-rows-1'}`}>
      <aside aria-label="Support tickets" hidden={compact && Boolean(state.selected) && !showTickets} className="max-h-32 min-h-0 space-y-2 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-gray-700 lg:max-h-none">
        {state.loading && <p role="status">Loading tickets…</p>}
        {!state.loading && !state.tickets.length && <p className="text-sm">No tickets yet{user.role === 'student' ? '. Choose New ticket for FAQ assistance or staff support.' : '.'}</p>}
        {state.tickets.map(ticket => <Button key={ticket.id} type="button" aria-pressed={String(ticket.id) === String(state.selected)} onClick={() => {state.setSelected(String(ticket.id));setShowTickets(false);}} className={`trace-button trace-button-secondary w-full text-left ${String(ticket.id) === String(state.selected) ? 'border-green-700 bg-green-50 ring-2 ring-green-700 dark:bg-green-950' : ''}`}>
          <span className="block min-w-0"><span className="block break-words font-bold">#{ticket.id} {ticket.subject}</span><span className="block break-words text-xs">{labels[ticket.state]}{ticket.read_only && ' · Read-only'}{ticket.student_name && user.role !== 'student' && ` · ${ticket.student_name}`}</span></span>
        </Button>)}
        {state.cursor && <Button type="button" onClick={() => void state.refresh(state.cursor)} className="trace-button trace-button-secondary w-full">Load older tickets</Button>}
      </aside>
      <div className="min-h-0 min-w-0">{state.selected ? <SupportConversation key={`${user.id}:${state.selected}`} ticketId={state.selected} user={user} topics={state.topics} onTicketChanged={state.refresh} /> : <div className="trace-section trace-section-body h-full"><p>Select a ticket to read its conversation.</p>{user.role === 'student' && <p className="mt-2 text-sm">You can ask for help without a document request. Only one unresolved general ticket is allowed; opening another returns to that ticket.</p>}</div>}</div>
    </div>
    <ModalShell open={Boolean(form)} onClose={() => { if (!state.busy) setForm(null); }} title={form === 'settings' ? 'Support Settings' : form==='analytics' ? 'Support Analytics' : 'New Support Ticket'} busy={state.busy} footer={form==='analytics' ? <Button type="button" onClick={()=>setForm(null)} className="trace-button trace-button-secondary">Close</Button> : <Button type="submit" form={form === 'settings' ? 'support-settings-form' : 'support-create-form'} disabled={state.busy} className="trace-button trace-button-primary">Review and save</Button>}>
      {form==='analytics' && <SupportAnalytics />}
      {form === 'settings' && state.settings && <SettingsForm key="settings" config={state.settings.settings} onStage={stage} busy={state.busy} />}
      {form === 'create' && <form id="support-create-form" onSubmit={event => { event.preventDefault(); stage({kind:'create',payload:{subject:subject.trim(),document_id:documentId ? Number(documentId) : null,client_key:crypto.randomUUID()}}); }} className="space-y-4">
        <p className="text-sm">{user.role==='student' ? 'Start with approved FAQ assistance. You can choose Talk to staff afterwards. An existing unresolved general ticket is reused.' : 'Choose an authorized open document case. Existing support is reused; a new case ticket enters the Registrar queue.'}</p>
        <label className="trace-label block">Subject<input required maxLength={255} value={subject} onChange={event => setSubject(event.target.value)} disabled={state.busy} className="trace-control mt-1 w-full" /></label>
        <label className="trace-label block">{user.role==='student' ? 'Linked Request (Optional)' : 'Linked Request'}<select required={user.role!=='student'} value={documentId} onChange={event => setDocumentId(event.target.value)} disabled={state.busy} className="trace-control mt-1 w-full"><option value="">{user.role==='student' ? 'General support — no document request' : 'Choose an open case'}</option>{choices.rows.map(row => <option key={row.id} value={row.id}>{row.tracking_number} · {row.document_type}</option>)}</select></label>
        {choices.busy && <p role="status">Loading open requests…</p>}
        {choices.error && <p role="alert">{choices.error} <Button type="button" onClick={choices.retry} className="trace-action underline">Retry request choices</Button></p>}
        {choices.hasMore && <Button type="button" disabled={choices.busy} onClick={choices.more} className="trace-button trace-button-secondary">Load more request choices</Button>}
      </form>}
    </ModalShell>
    <ConfirmDialog open={Boolean(staged)} title="Confirm Support Action" message={state.error || (staged?.kind === 'claim' ? 'Claim the oldest eligible queued ticket? You can have only one live conversation.' : 'Save this support action?')} loading={state.busy} onCancel={() => { if (!state.busy) setStaged(null); }} onConfirm={async () => { if (await state.execute(staged)) { if (['create','settings'].includes(staged.kind)) { setForm(null); setSubject(''); } setStaged(null); } }} />
  </section>;
}
