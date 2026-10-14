import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import Button from '@/components/Button';
import AdminIcon from '@/features/admin/components/AdminIcon';
import ModalShell from '@/components/ModalShell';
import RequestAttachments from '@/components/RequestAttachments';
import { SupportIcon, TicketAvatar, MessageDateSeparator } from '@/components/SupportVisuals';
import { SUPPORT_STATES, supportDay, supportTime } from '@/utils/supportPresentation';
import ConfirmDialog from '@/components/ConfirmDialog';
import useSupportConversation from '@/hooks/useSupportConversation';
import useAuthedFile from '@/hooks/useAuthedFile';
import { formatFileSize } from '@/utils/formatters';
import SupportRequirementDialog, { RequirementBubble } from '@/components/SupportRequirement';
import { PIPELINE } from '@/utils/documentStatus';
import useMotion from '@/hooks/useMotion';
import useSupportFaqSuggestions from '@/hooks/useSupportFaqSuggestions';
const labels = SUPPORT_STATES;
function SupportFile({ file }) {
  const protectedFile = useAuthedFile(String(file.filename).split(/[\\/]/).pop());
  return <div className="min-w-0 space-y-1 text-sm">
    <p className="break-words select-text">{file.original_name} · {formatFileSize(file.size_bytes)}</p>
    {protectedFile.url && <a href={protectedFile.url} download={file.original_name} className="trace-action underline">Download attachment</a>}
    {protectedFile.loading && <p role="status">Loading protected file…</p>}
    {protectedFile.error && <p role="alert">{protectedFile.error}</p>}
  </div>;
}
export default function SupportConversation({ ticketId,user,topics,onTicketChanged,onNotice,active = true,autoFocusConversation = true,compact = false }) {
  const chat = useSupportConversation(ticketId,onNotice), ticket = chat.data?.ticket;
  const history = useRef(null), pinned = useRef(true), older = useRef(null), chooser = useRef(null), composer = useRef(null);
  const [staged,setStaged] = useState(null), [fileError,setFileError] = useState(''), [faqQuery,setFaqQuery] = useState('');
  const [requirement,setRequirement] = useState(null), [showCase,setShowCase] = useState(false);
  const suggestions=useSupportFaqSuggestions(faqQuery,topics);
  useMotion(history,ticketId,'context');
  useLayoutEffect(() => {
    const node = history.current;
    if (!node) return;
    if (older.current && !chat.loadingOlder) { node.scrollTop = node.scrollHeight - older.current.height + older.current.top; older.current = null; }
    else if (pinned.current) node.scrollTop = node.scrollHeight;
  }, [chat.messages,chat.loadingOlder]);
  useLayoutEffect(() => { if (active && autoFocusConversation && !chat.loading) composer.current?.focus({preventScroll:true}); }, [active,autoFocusConversation,chat.loading]);
  const staff = user.role !== 'student', windowClerk = ['Window 1','Receiving Desk'].includes(user.desk_assignment);
  const registrar = user.role !== 'admin' && (windowClerk || user.desk_assignment === 'Secretary');
  const canSend = user.role !== 'admin' && ticket && !ticket.read_only && !(windowClerk && (ticket.state !== 'IN_PROGRESS' || Number(ticket.assigned_to) !== Number(user.id))) && !(staff && ticket.state === 'FAQ_ASSISTANCE') && !(windowClerk && chat.data?.window?.open===false);
  const stage = action => setStaged({...action,client_key:crypto.randomUUID()});
  const selectFiles = event => {
    const selected = [...event.target.files]; event.target.value = '';
    if (chat.files.length + selected.length > 3 || selected.some(file => file.size > 5*1024*1024 || !/\.(jpe?g|png|pdf)$/i.test(file.name) || !['image/jpeg','image/png','application/pdf'].includes(file.type))) {
      setFileError('Choose up to 3 JPEG, PNG or PDF files, 5 MB each.'); return;
    }
    setFileError(''); chat.setFiles(previous => [...previous,...selected]);
  };
  const context = <>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">{ticket && <TicketAvatar ticket={ticket} />}<div className="min-w-0"><h3 className="break-words font-bold">{ticket ? `#${ticket.id} ${ticket.subject}` : 'Support conversation'}</h3>
        {ticket && <p className="select-text break-words text-xs text-gray-600 dark:text-gray-300">Ticket #{ticket.id} · {labels[ticket.state]}{ticket.tracking_number && ` · ${ticket.tracking_number}`}{ticket.clerk_name && ` · ${ticket.clerk_name}`}</p>}</div></div>
        {ticket?.document_id && ticket.tracking_number && <Button type="button" aria-haspopup="dialog" onClick={()=>setShowCase(true)} className="trace-button trace-button-secondary" title="View this ticket’s authorized request and supporting documents">Open linked case</Button>}
      </div>
      {(user.role === 'admin' || ticket?.read_only) && <p className="text-sm font-semibold">Read-only history{user.role === 'admin' ? ' — Admin monitoring.' : ticket.state === 'RESOLVED' ? ' — ticket resolved.' : ' — document case closed.'}</p>}
      {ticket && user.role === 'admin' && <details className="trace-admin-ticket-actions text-sm"><summary className="cursor-pointer py-1 font-semibold focus-visible:outline">Ticket actions</summary><p className="mt-2 text-xs text-gray-500">Admin monitors this ticket. Operational actions are available to the processing staff.</p></details>}
      {ticket && user.role !== 'admin' && <details open className="text-sm"><summary className="cursor-pointer py-1 font-semibold focus-visible:outline">Ticket actions</summary>
      <div className="flex flex-wrap gap-2">
        {!compact && user.role === 'student' && ticket.state === 'FAQ_ASSISTANCE' && <Button type="button" disabled={chat.busy} onClick={() => stage({action:'escalate'})} className="trace-button trace-button-primary">Talk to staff</Button>}
        {registrar && !ticket.read_only && <Button type="button" disabled={chat.busy} onClick={() => stage({action:'resolve'})} className="trace-button trace-button-secondary">Resolve ticket</Button>}
        {registrar && ticket.state === 'IN_PROGRESS' && (!windowClerk || Number(ticket.assigned_to) === Number(user.id)) && <>
          <Button type="button" disabled={chat.busy || Boolean(ticket.reply_requested_at)} onClick={() => stage({action:'request_reply'})} className="trace-button trace-button-secondary">Request student reply</Button>
          <Button type="button" disabled={chat.busy} onClick={() => stage({action:'await_student'})} className="trace-button trace-button-secondary">Awaiting student</Button>
        </>}
        {user.role !== 'admin' && ticket.state === 'RESOLVED' && user.desk_assignment!=='Finance' && (!ticket.document_id ? ticket.category !== 'linked' : PIPELINE.includes(ticket.current_status) && ticket.current_status!=='COMPLETED') && <Button type="button" disabled={chat.busy} onClick={() => stage({action:'reopen'})} className="trace-button trace-button-secondary">Reopen ticket</Button>}
      </div>
      </details>}
  </>;
  return <section aria-label="Selected support ticket" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl bg-gray-50 dark:bg-gray-950">
    <header tabIndex={0} aria-label="Ticket context and actions" className="max-h-[30%] shrink-0 space-y-3 overflow-y-auto border-b border-gray-200 bg-gray-100 p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 dark:border-gray-700 dark:bg-gray-800">
      {compact ? <details className="min-w-0"><summary className="cursor-pointer focus-visible:outline"><span className="block truncate font-bold" title={ticket?.subject}>{ticket ? `#${ticket.id} ${ticket.subject}` : 'Support conversation'}</span><span className="block text-xs text-gray-600 dark:text-gray-300">{ticket ? `${labels[ticket.state]} · Show ticket context` : 'Loading ticket context…'}</span></summary><div className="mt-3 space-y-3">{context}</div></details> : context}
      {compact && user.role === 'student' && ticket?.state === 'FAQ_ASSISTANCE' && <Button type="button" disabled={chat.busy} onClick={() => stage({action:'escalate'})} className="trace-button trace-button-primary">Talk to staff</Button>}
    </header>
    {ticket && (chat.data?.window?.open === false || ticket.state === 'QUEUED') && <aside aria-label="Support hours and queue" className="flex max-h-[20%] shrink-0 items-start gap-3 overflow-y-auto px-4 py-3 text-xs font-medium text-green-900 dark:text-green-100"><SupportIcon name="clock" /><div className="min-w-0 space-y-2">
      {chat.data?.window?.open === false && <p>Live support is closed; conversations and queue places are saved. Next opening: {chat.data.window.next_opens_at ? new Date(chat.data.window.next_opens_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'}) : 'Check support hours'} (Manila).</p>}
      {ticket.state === 'QUEUED' && <p>Queue position: {chat.data.queue?.position ?? 'Checking'} · {chat.data.queue?.available_clerks ?? 'Checking'} declared available clerks. {chat.data.queue?.wait_range_minutes ? `Estimated ${chat.data.queue.wait_range_minutes.join('–')} minutes (${chat.data.queue.sample_size} handling samples). Availability can change.` : chat.data.queue?.message}</p>}
    </div></aside>}
    <div ref={history} tabIndex={0} aria-label="Conversation history" onScroll={event => { const node = event.currentTarget; pinned.current = node.scrollHeight-node.clientHeight-node.scrollTop < 32; }} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">
      {chat.loading && <p role="status">Loading conversation…</p>}
      {chat.cursor && <Button type="button" disabled={chat.loadingOlder} onClick={() => { const node = history.current; older.current = {height:node.scrollHeight,top:node.scrollTop}; pinned.current = false; void chat.refresh(chat.cursor); }} className="trace-button trace-button-secondary">{chat.loadingOlder ? 'Loading older messages…' : 'Load older messages'}</Button>}
      {ticket?.state === 'FAQ_ASSISTANCE' && user.role === 'student' && <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
        <h4 className="font-bold">Approved FAQ assistance</h4>
        <label className="trace-label block">Find a question<input maxLength={255} value={faqQuery} onChange={event => setFaqQuery(event.target.value)} className="trace-control mt-1 w-full" /></label>
        {suggestions.error && <p role="alert">{suggestions.error}</p>}
        {suggestions.topics.map(topic => <div key={topic.id} className="space-y-2">
          <Button type="button" disabled={chat.busy} onClick={() => void chat.faq({topic_id:topic.id,action:'view',client_key:crypto.randomUUID()})} className="trace-button trace-button-secondary w-full text-left">{topic.question}</Button>
        </div>)}
        <p className="text-sm">Need a person? Choose Talk to staff, or send “human”, “live support” or “talk to staff”.</p>
      </div>}
      {!chat.loading && ticket && !chat.messages.length && <p className="py-4 text-center text-sm text-gray-600 dark:text-gray-300">No messages in this ticket yet.</p>}
      {chat.messages.map((row,index) => <Fragment key={row.id}>
        {(!index || supportDay(row.created_at)!==supportDay(chat.messages[index-1].created_at)) && <MessageDateSeparator value={row.created_at} />}
        <article className={`trace-support-bubble ${row.kind === 'system' || row.kind === 'requirement' ? 'trace-support-bubble-system' : Number(row.sender_id) === Number(user.id) ? 'trace-support-bubble-outgoing' : ''}`}>
        <p className="font-semibold">{row.kind === 'system' ? 'TRACE' : Number(row.sender_id) === Number(user.id) ? 'You' : row.sender_name || 'Registrar'}</p>
        <p className="select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{row.message}</p>
        {row.kind==='requirement' && <RequirementBubble ticketId={ticketId} row={row.requirement} user={user} readOnly={user.role === 'admin' || ticket?.read_only} onAction={setRequirement} />}
        {row.files?.map(file => <SupportFile key={file.id} file={file} />)}
        {row.metadata?.faq_topic_id && ticket?.state === 'FAQ_ASSISTANCE' && user.role === 'student' && <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={chat.busy} onClick={() => void chat.faq({topic_id:row.metadata.faq_topic_id,action:'helpful',client_key:crypto.randomUUID()})} className="trace-button trace-button-secondary">Helpful</Button>
          <Button type="button" disabled={chat.busy} onClick={() => void chat.faq({topic_id:row.metadata.faq_topic_id,action:'not_helpful',client_key:crypto.randomUUID()})} className="trace-button trace-button-secondary">Not helpful</Button>
          <Button type="button" disabled={chat.busy} onClick={() => stage({kind:'faq',topic_id:row.metadata.faq_topic_id,action:'resolved'})} className="trace-button trace-button-secondary">This resolved my question</Button>
        </div>}
        {supportTime(row.created_at) && <time className="block text-right text-xs" title={supportDay(row.created_at)} dateTime={row.created_at}>{supportTime(row.created_at)} (Manila)</time>}
      </article></Fragment>)}
    </div>
    <div className="max-h-[40%] min-h-0 shrink-0 overflow-y-auto border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      {chat.error && <p role="alert" className="mb-2 text-sm text-red-700 dark:text-red-300">{chat.error} <Button type="button" onClick={() => void chat.refresh()} className="trace-action underline">Retry conversation</Button></p>}
      {canSend ? <form onSubmit={chat.send} className="space-y-2" aria-busy={chat.busy}>
        <div className="flex min-w-0 items-center gap-2 rounded-full border border-gray-300 bg-white p-2 shadow-sm dark:border-gray-600 dark:bg-gray-900">
          <Button type="button" aria-label="Attach files" title="Attach JPEG, PNG or PDF" onClick={() => chooser.current?.click()} disabled={chat.busy || chat.files.length >= 3} className="trace-icon-button"><SupportIcon name="paperclip" /></Button>
          <label className="min-w-0 flex-1"><span className="sr-only">Message</span><input ref={composer} aria-label="Message" value={chat.input} onChange={event => chat.setInput(event.target.value)} maxLength={2000} disabled={chat.busy} placeholder="Write your message…" className="min-h-11 w-full min-w-0 rounded-full bg-transparent px-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:opacity-60" /></label>
          <Button type="submit" aria-label={chat.busy ? 'Sending…' : 'Send'} disabled={chat.busy || (!chat.input.trim() && !chat.files.length)} className={`trace-icon-button ${compact ? 'bg-indigo-600 enabled:hover:bg-indigo-700' : ''}`}><SupportIcon name={compact ? 'sendCompact' : 'send'} /></Button>
        </div>
        {chat.files.map((file,index) => <div key={`${file.name}:${index}`} className="flex flex-wrap items-center gap-2 text-sm"><span className="break-words">{file.name} ({formatFileSize(file.size)})</span><Button type="button" disabled={chat.busy} onClick={() => chat.setFiles(previous => previous.filter((_,i) => i !== index))} className="trace-action underline">Remove {file.name}</Button></div>)}
        <input ref={chooser} aria-label="Attach chat files" type="file" multiple hidden accept=".jpg,.jpeg,.png,.pdf" disabled={chat.busy} onChange={selectFiles} />
        <div className="flex flex-wrap items-center gap-2">{registrar && ticket.document_id && <Button type="button" aria-label="Request supporting document" title="Ask the student for a case-specific document" disabled={chat.busy} onClick={() => setRequirement({new:true})} className="trace-button trace-button-secondary"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 12 7-7a4 4 0 0 1 6 6L10 22a6 6 0 0 1-8-8L13 3M5 17l10-10" /></svg><span>Request document</span></Button>}</div>
        <details className="text-xs"><summary className="cursor-pointer focus-visible:outline">File limits</summary><p>3 files maximum · 5 MB each · JPEG, PNG, PDF</p></details>
        {fileError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{fileError}</p>}
      </form> : <p className="text-sm">{ticket?.read_only ? 'Previous messages and authorized files remain available.' : windowClerk && chat.data?.window?.open===false ? 'Live support is paused. Your assigned conversation resumes when support opens.' : windowClerk ? 'Declare availability and claim the oldest ticket to reply.' : 'Select a ticket to begin.'}</p>}
    </div>
    <ModalShell open={active && showCase && Boolean(ticket?.document_id)} onClose={()=>setShowCase(false)} title="Linked request" maxWidth={user.role === 'admin' ? 'max-w-[640px]' : 'max-w-lg'} panelClassName={user.role === 'admin' ? 'trace-modal-panel trace-admin-main-dialog trace-admin-linked-case max-w-[640px]' : undefined} headerIcon={user.role === 'admin' ? <span className="trace-admin-security-icon"><AdminIcon name="linked-link" /></span> : undefined} footer={<div className="trace-actions justify-end"><Button type="button" onClick={()=>setShowCase(false)} className={'trace-button ' + (user.role === 'admin' ? 'trace-button-primary' : 'trace-button-secondary w-full')}>{user.role === 'admin' && <AdminIcon name="linked-arrow-left" />}Back to ticket</Button></div>}>
      {ticket?.document_id && <div className="space-y-6"><dl className={user.role === 'admin' ? 'trace-admin-linked-summary' : 'space-y-2 text-sm'}><div><dt className="font-bold">Tracking number</dt><dd className="break-words select-text">{ticket.tracking_number}</dd></div><div><dt className="font-bold">Document</dt><dd>{ticket.document_type || 'Recorded request'}</dd></div><div><dt className="font-bold">Student</dt><dd className="break-words">{ticket.student_name || 'Recorded student'}</dd></div></dl><RequestAttachments documentId={ticket.document_id} user={user} /></div>}
    </ModalShell>
    <ConfirmDialog open={active && Boolean(staged)} title="Confirm Support Action" message={chat.error || `Save ${staged?.action?.replaceAll('_',' ')} for this ticket?`} loading={chat.busy} onCancel={() => { if (!chat.busy) setStaged(null); }} onConfirm={async () => { if (await (staged?.kind === 'faq' ? chat.faq(staged) : chat.change(staged))) { setStaged(null); onTicketChanged(); } }} />
    {active && requirement && ticket?.document_id && <SupportRequirementDialog key={`${ticket.id}:${requirement.id || 'new'}:${Boolean(requirement.replacement)}`} documentId={ticket.document_id} user={user} selection={requirement.new ? null : requirement} onClose={() => setRequirement(null)} onSaved={() => { void chat.refresh(); onTicketChanged(); }} />}
  </section>;
}
