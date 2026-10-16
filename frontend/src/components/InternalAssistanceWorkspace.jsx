import { isCollegeOrFinance } from '@/utils/secretaryPresentation';
import SecretaryIcon, { SecretaryHeaderIcon } from '@/features/secretary/components/SecretaryIcon';
import TicketArchiveTabs from '@/components/TicketArchiveTabs';
import { isWindowClerk } from '@/utils/windowPresentation';
import WindowIcon from '@/features/window1/components/WindowIcon';
import FilterSelect from '@/components/FilterSelect';
import { Fragment,useEffect,useLayoutEffect,useRef,useState } from 'react';
import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import ConfirmDialog from '@/components/ConfirmDialog';
import SupportToasts from '@/components/SupportToasts';
import { MessageDateSeparator,SupportIcon,TicketAvatar } from '@/components/SupportVisuals';
import { supportDay,supportTime } from '@/utils/supportPresentation';
import useInternalAssistance,{useInternalConversation} from '@/hooks/useInternalAssistance';
import useMotion from '@/hooks/useMotion';
const labels = {QUEUED:'Queued',IN_PROGRESS:'In progress',AWAITING_STAFF:'Awaiting staff',RESOLVED:'Resolved'};
function InternalConversation({ticketId,user,onNotice,onChanged,onTicketState,active=true}) {
  const chat = useInternalConversation(ticketId,user,onNotice,onChanged), ticket = chat.data?.ticket;
  const observedId=ticket?.id,observedState=ticket?.state;
  useEffect(()=>{if(observedId)onTicketState?.({id:observedId,state:observedState});},[observedId,observedState,onTicketState]);
  const [staged,setStaged] = useState(null), [resolving,setResolving] = useState(false), [note,setNote] = useState('');
  const history = useRef(null), pinned = useRef(true), older = useRef(null);
  useMotion(history,ticketId,'context');
  useLayoutEffect(() => {
    const node = history.current;
    if (!node) return;
    if (older.current && !chat.loadingOlder) {node.scrollTop = node.scrollHeight-older.current.height+older.current.top;older.current = null;}
    else if (pinned.current) node.scrollTop = node.scrollHeight;
  },[chat.messages,chat.loadingOlder]);
  const stage = (action,extra = {}) => setStaged({action,version:ticket.version,client_key:crypto.randomUUID(),...extra});
  return <section aria-label="Selected internal ticket" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
    <header tabIndex={0} aria-label="Internal ticket context" className="max-h-[35%] shrink-0 space-y-3 overflow-y-auto border-b border-gray-200 bg-gray-100 p-4 focus-visible:outline focus-visible:outline-green-700 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3">{ticket && <TicketAvatar ticket={{...ticket,student_name:ticket.creator_name}} />}<div className="min-w-0">
        <h3 className="break-words font-bold">{ticket ? `#${ticket.id} ${ticket.subject}` : 'Internal concern'}</h3>
        {ticket && <p className="select-text break-words text-sm">{labels[ticket.state]} · {ticket.creator_name} · {ticket.creator_desk}</p>}
      </div></div>
      {ticket && <>
        <p className="select-text break-words text-xs text-gray-600 dark:text-gray-300">Assigned Admin: {ticket.admin_name || 'Awaiting assignment'} · Created {supportDay(ticket.created_at)}, {supportTime(ticket.created_at)} (Manila)</p>
        <div className="flex flex-wrap gap-2">
          {ticket.can_claim && <Button type="button" disabled={chat.busy} onClick={() => stage('claim')} className="trace-button trace-button-primary"><SupportIcon name="ticket" />{ticket.assigned_to ? 'Take over ticket' : 'Claim ticket'}</Button>}
          {ticket.can_manage && ticket.state === 'IN_PROGRESS' && <Button type="button" disabled={chat.busy} onClick={() => stage('await_staff')} className="trace-button trace-button-secondary">Await staff reply</Button>}
          {ticket.can_manage && ticket.state === 'AWAITING_STAFF' && <Button type="button" disabled={chat.busy} onClick={() => stage('resume')} className="trace-button trace-button-secondary">Resume handling</Button>}
          {ticket.can_manage && ticket.state !== 'RESOLVED' && <Button type="button" disabled={chat.busy} onClick={() => setResolving(true)} className="trace-button trace-button-secondary">Resolve concern</Button>}
          {ticket.can_reopen && <Button type="button" disabled={chat.busy} onClick={() => stage('reopen')} className="trace-button trace-button-secondary">Reopen concern</Button>}
        </div>
        {ticket.state === 'RESOLVED' && <p className="text-sm">Read-only resolution history. Reopen to continue the concern.</p>}
        {user.role === 'admin' && !ticket.can_send && ticket.state !== 'RESOLVED' && <p className="text-sm">{ticket.can_claim ? 'Claim this ticket to reply.' : 'The assigned Admin handles replies; other Admins can monitor this ticket.'}</p>}
      </>}
    </header>
    <div ref={history} tabIndex={0} aria-label="Internal conversation history" onScroll={event => {const node = event.currentTarget;pinned.current = node.scrollHeight-node.scrollTop-node.clientHeight < 32;}} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 focus-visible:outline focus-visible:outline-green-700">
      {chat.loading && <p role="status">Loading internal conversation…</p>}
      {chat.cursor && <Button type="button" disabled={chat.loadingOlder} onClick={() => {const node = history.current;older.current = {height:node.scrollHeight,top:node.scrollTop};pinned.current = false;void chat.refresh(chat.cursor);}} className="trace-button trace-button-secondary">Load older messages</Button>}
      {chat.messages.map((row,index) => <Fragment key={row.id}>
        {(!index || supportDay(row.created_at) !== supportDay(chat.messages[index-1].created_at)) && <MessageDateSeparator value={row.created_at} />}
        <article className={`trace-support-bubble ${row.kind === 'system' ? 'trace-support-bubble-system' : Number(row.sender_id) === Number(user.id) ? 'trace-support-bubble-outgoing' : ''}`}>
          <p className="font-semibold">{row.kind === 'system' ? 'TRACE' : Number(row.sender_id) === Number(user.id) ? 'You' : row.sender_name || 'Recorded staff'}</p>
          <p className="select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{row.message}</p>
          <time className="block text-right text-xs" dateTime={row.created_at}>{supportTime(row.created_at)} (Manila)</time>
        </article>
      </Fragment>)}
    </div>
    <footer className="max-h-[35%] shrink-0 space-y-2 overflow-y-auto border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      {chat.error && <p role="alert" className="trace-inline-error text-sm">{chat.error} <Button type="button" onClick={() => void chat.refresh()} className="trace-action underline">Refresh ticket</Button></p>}
      {ticket?.can_send && <form onSubmit={chat.send} aria-busy={chat.busy} className="flex min-w-0 items-center gap-2 rounded-full border border-gray-300 p-2 shadow-sm dark:border-gray-600">
        <label className="min-w-0 flex-1"><span className="sr-only">Internal message</span><input aria-label="Internal message" value={chat.draft} onChange={event => chat.setDraft(event.target.value)} maxLength={2000} disabled={chat.busy} placeholder="Write your message…" className="min-h-11 w-full min-w-0 rounded-full bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:opacity-60" /></label>
        <Button type="submit" aria-label={chat.busy ? 'Sending…' : 'Send internal message'} disabled={chat.busy || !chat.draft.trim()} className="trace-icon-button"><SupportIcon name="send" /></Button>
      </form>}
      <p className="text-xs text-gray-600 dark:text-gray-300">Private staff assistance. Student conversations and identity attachments are not linked here.</p>
    </footer>
    <ModalShell open={active&&resolving} onClose={() => {if (!chat.busy) setResolving(false);}} title="Resolve Internal Concern" footer={<Button type="submit" form="internal-resolution" disabled={chat.busy || !note.trim()} className="trace-button trace-button-primary">Review resolution</Button>}>
      <form id="internal-resolution" onSubmit={event => {event.preventDefault();stage('resolve',{note:note.trim()});}} className="space-y-3">
        <p className="text-sm">Explain what was done. The resolution and conversation remain in history.</p>
        <label className="trace-label block">Resolution note<textarea required maxLength={2000} value={note} onChange={event => setNote(event.target.value)} disabled={chat.busy} className="trace-control mt-1 w-full" /></label>
      </form>
    </ModalShell>
    <ConfirmDialog open={active&&Boolean(staged)} title="Confirm Internal Assistance Action" message={`Save ${staged?.action?.replaceAll('_',' ')} for internal ticket #${ticketId}?`} loading={chat.busy} onCancel={() => {if (!chat.busy) setStaged(null);}} onConfirm={async () => {if (await chat.change(staged)) {setStaged(null);setResolving(false);setNote('');}}}>
      {staged?.note && <p className="mt-3 select-text whitespace-pre-wrap break-words text-sm">{staged.note}</p>}
      {chat.error && <p role="alert" className="trace-inline-error mt-3 text-sm">{chat.error}</p>}
    </ConfirmDialog>
  </section>;
}
export default function InternalAssistanceWorkspace({user,requestedTicket,active=true}) {
  const [stateFilter,setStateFilter] = useState(''), [categoryFilter,setCategoryFilter] = useState(''), [query,setQuery] = useState('');
  const state = useInternalAssistance(user,stateFilter,categoryFilter,requestedTicket);
  const [showTickets,setShowTickets] = useState(false), [creating,setCreating] = useState(false), [staged,setStaged] = useState(null);
  const [subject,setSubject] = useState(''), [category,setCategory] = useState('system_issue'), [description,setDescription] = useState('');
  const rows = state.tickets.filter(ticket => [ticket.id,ticket.subject,ticket.creator_name,ticket.admin_name].some(value => String(value || '').toLowerCase().includes(query.trim().toLowerCase())));
  const list = <div className="flex h-full min-h-0 flex-col">
    <div className="shrink-0 space-y-3 border-b-2 border-pine-600 p-4"><TicketArchiveTabs view={state.view} onChange={state.changeView} disabled={state.busy}/>
      <label className="trace-label block">Search loaded tickets<span className="mt-2 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 dark:border-gray-600 dark:bg-gray-900"><SupportIcon name="search" /><input maxLength={255} type="search" aria-label="Search loaded internal tickets" value={query} onChange={event => setQuery(event.target.value)} className="min-h-11 min-w-0 flex-1 rounded-full bg-transparent text-sm outline-none focus-visible:ring-2 focus-visible:ring-green-600" /></span></label>
      <div className="trace-form-grid">
        {state.view !== 'archive' && <label className="trace-label">State<FilterSelect disabled={state.busy} value={stateFilter} onChange={event => setStateFilter(event.target.value)} className="trace-control mt-1 w-full"><option value="">All states</option>{Object.entries(labels).filter(([value]) => value !== 'RESOLVED').map(([value,label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect></label>}
        <label className="trace-label">Category<FilterSelect disabled={state.busy} value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} className="trace-control mt-1 w-full"><option value="">All categories</option>{Object.entries(state.categories).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</FilterSelect></label>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-300">{rows.length} loaded · Newest first. Search covers loaded tickets; filters cover the full authorized queue.</p>
    </div>
    <div aria-label="Internal ticket list" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {state.loading && <p role="status" className="p-4">Loading internal tickets…</p>}
      {!state.loading && !rows.length && <p className="p-4 text-sm">{state.view === 'archive' ? 'No archived concerns match this view. Resolved concerns and their chats appear here.' : 'No internal tickets match this view.'}</p>}
      {rows.map(ticket => <Button key={ticket.id} type="button" aria-pressed={String(ticket.id) === state.selected} onClick={() => {state.setSelected(String(ticket.id));setShowTickets(false);}} className="trace-support-ticket trace-button-lift w-full text-left">
        <span className="grid min-w-0 grid-cols-[3rem_minmax(0,1fr)] items-start gap-3"><TicketAvatar ticket={{...ticket,student_name:ticket.creator_name}} /><span className="min-w-0 space-y-1"><span className="block break-words font-bold">#{ticket.id} {ticket.subject}</span><span className="block break-words text-xs">{labels[ticket.state]} · {state.categories[ticket.category]}</span><span className="block break-words text-xs text-gray-600 dark:text-gray-300">{ticket.creator_name} · {ticket.creator_desk}</span><span className="block break-words text-xs text-gray-600 dark:text-gray-300">Admin: {ticket.admin_name || 'Unassigned'}</span></span></span>
      </Button>)}
      {state.cursor && <div className="p-4"><Button type="button" onClick={() => void state.refresh(state.cursor)} className="trace-button trace-button-secondary w-full">Load older tickets</Button></div>}
    </div>
  </div>;
  return <section aria-label="Internal assistance workspace" className="min-w-0 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 className={isWindowClerk(user) ? "sr-only" : "trace-page-title"}>{isCollegeOrFinance(user) ? "Support" : "Internal Assistance"}</h2><div className="flex flex-wrap gap-2"><Button type="button" onClick={() => setShowTickets(true)} className="trace-button trace-button-secondary lg:hidden" aria-haspopup="dialog">Internal tickets</Button>{user.role !== 'admin' && <Button type="button" disabled={state.busy || !Object.keys(state.categories).length} onClick={() => setCreating(true)} className="trace-button trace-button-primary"><SupportIcon name="plus" />New concern</Button>}</div></header>
    <p className="text-sm text-gray-600 dark:text-gray-300">{user.role === 'admin' ? 'Claim a staff concern to assist. Other operational conversations remain read-only.' : 'Ask Admin about account access, system issues or workflow concerns. Only you and Admin can read your tickets.'}</p>
    {state.error && <p role="alert" className="trace-inline-error text-sm">{state.error} <Button type="button" onClick={() => void state.refresh()} className="trace-action underline">Retry internal assistance</Button></p>}
    <div className="grid h-[75dvh] min-h-96 min-w-0 grid-cols-[minmax(0,1fr)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900 lg:grid-cols-[minmax(16rem,1fr)_minmax(0,2.4fr)]">
      <aside className="hidden min-h-0 min-w-0 border-r border-gray-200 dark:border-gray-700 lg:block">{list}</aside>
      {state.selected ? <InternalConversation key={`${user.id}:${state.selected}`} ticketId={state.selected} user={user} onNotice={state.feedback.notify} onChanged={() => void state.refresh()} onTicketState={state.observeTicket} active={active} /> : <div className="flex min-w-0 flex-col items-center justify-center gap-3 p-5 text-center"><h3 className="font-bold">Select an internal ticket.</h3><p className="text-sm">{user.role === 'admin' ? 'Review the queue, then claim a concern to help its creator.' : 'Open a concern or select your retained assistance history.'}</p></div>}
    </div>
    <ModalShell open={active&&showTickets} onClose={() => setShowTickets(false)} title="Internal Tickets" panelClassName="trace-modal-panel max-w-sm h-[80dvh]" bodyClassName="min-h-0 flex-1 overflow-hidden" footer={<Button type="button" onClick={() => setShowTickets(false)} className="trace-button trace-button-secondary w-full">Back to conversation</Button>}>{list}</ModalShell>
    <ModalShell open={active&&creating} onClose={() => {if (!state.busy) setCreating(false);}} busy={state.busy} title="New Internal Concern" headerIcon={isCollegeOrFinance(user) ? <SecretaryHeaderIcon name="6427d" /> : undefined} subtitle={isCollegeOrFinance(user) ? "This creates an asynchronous assistance ticket, separate from live student support." : isWindowClerk(user) ? "Ask Admin for help with a staff concern." : undefined} panelClassName={isCollegeOrFinance(user) ? "trace-modal-panel trace-secretary-dialog trace-secretary-internal-create max-w-[540px]" : isWindowClerk(user) ? "trace-modal-panel trace-admin-main-dialog trace-window-dialog trace-window-internal max-w-[640px]" : undefined} footer={<div className="trace-actions justify-end">{(isWindowClerk(user) || isCollegeOrFinance(user)) && <Button type="button" disabled={state.busy} onClick={()=>setCreating(false)} className="trace-button trace-button-secondary">Cancel</Button>}<Button type="submit" form="internal-create" disabled={state.busy} className="trace-button trace-button-primary">Review concern{isCollegeOrFinance(user) && <SecretaryIcon name="dd3ed" />}</Button></div>}>
      <form id="internal-create" onSubmit={event => {event.preventDefault();setStaged({subject:subject.trim(),category,description:description.trim(),client_key:crypto.randomUUID()});}} className="space-y-4">
        <p className={isCollegeOrFinance(user) ? "trace-secretary-warning" : isWindowClerk(user) ? "trace-window-privacy" : "text-sm"}>{isCollegeOrFinance(user) ? <SecretaryIcon name="27058" /> : isWindowClerk(user) && <WindowIcon name="shield"/>}Describe the staff concern without copying student identity files or private conversations. This creates an asynchronous assistance ticket, separate from live student support.</p>
        <label className="trace-label block">Subject<input required maxLength={255} value={subject} onChange={event => setSubject(event.target.value)} disabled={state.busy} className="trace-control mt-1 w-full" /></label>
        <label className="trace-label block">Concern category<select required value={category} onChange={event => setCategory(event.target.value)} disabled={state.busy} className="trace-control mt-1 w-full">{Object.entries(state.categories).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="trace-label block">Concern<textarea required maxLength={2000} value={description} onChange={event => setDescription(event.target.value)} disabled={state.busy} className="trace-control mt-1 w-full" /></label>
      </form>
    </ModalShell>
    <ConfirmDialog open={active&&Boolean(staged)} title="Submit Internal Concern?" message="Create this private ticket for Admin assistance?" loading={state.busy} onCancel={() => {if (!state.busy) setStaged(null);}} onConfirm={async () => {if (await state.create(staged)) {setStaged(null);setCreating(false);setSubject('');setDescription('');}}}>
      <p className="mt-3 select-text break-words font-semibold">{staged?.subject}</p>{state.error && <p role="alert" className="trace-inline-error mt-3 text-sm">{state.error}</p>}
    </ConfirmDialog>
    {active&&<SupportToasts notices={state.feedback.notices} onDismiss={state.feedback.dismiss} onDismissAll={state.feedback.dismissAll} />}
  </section>;
}
