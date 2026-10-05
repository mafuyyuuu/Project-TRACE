import { useLayoutEffect, useRef, useState } from 'react';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import useSupportConversation from '@/hooks/useSupportConversation';
import useAuthedFile from '@/hooks/useAuthedFile';
import { formatFileSize } from '@/utils/formatters';
import SupportRequirementDialog, { RequirementBubble } from '@/components/SupportRequirement';
import { PIPELINE } from '@/utils/documentStatus';
import useMotion from '@/hooks/useMotion';
import useSupportFaqSuggestions from '@/hooks/useSupportFaqSuggestions';
const labels = { FAQ_ASSISTANCE:'FAQ assistance',QUEUED:'Queued',IN_PROGRESS:'In progress',AWAITING_STUDENT:'Awaiting student',RESOLVED:'Resolved' };
function SupportFile({ file }) {
  const protectedFile = useAuthedFile(String(file.filename).split(/[\\/]/).pop());
  return <div className="min-w-0 space-y-1 text-sm">
    <p className="break-words select-text">{file.original_name} · {formatFileSize(file.size_bytes)}</p>
    {protectedFile.url && <a href={protectedFile.url} download={file.original_name} className="trace-action underline">Download attachment</a>}
    {protectedFile.loading && <p role="status">Loading protected file…</p>}
    {protectedFile.error && <p role="alert">{protectedFile.error}</p>}
  </div>;
}
export default function SupportConversation({ ticketId,user,topics,onTicketChanged }) {
  const chat = useSupportConversation(ticketId), ticket = chat.data?.ticket;
  const history = useRef(null), pinned = useRef(true), older = useRef(null), chooser = useRef(null), composer = useRef(null);
  const [staged,setStaged] = useState(null), [fileError,setFileError] = useState(''), [faqQuery,setFaqQuery] = useState('');
  const [requirement,setRequirement] = useState(null);
  const suggestions=useSupportFaqSuggestions(faqQuery,topics);
  useMotion(history,ticketId,'context');
  useLayoutEffect(() => {
    const node = history.current;
    if (!node) return;
    if (older.current && !chat.loadingOlder) { node.scrollTop = node.scrollHeight - older.current.height + older.current.top; older.current = null; }
    else if (pinned.current) node.scrollTop = node.scrollHeight;
  }, [chat.messages,chat.loadingOlder]);
  useLayoutEffect(() => { if (!chat.loading) composer.current?.focus({preventScroll:true}); }, [chat.loading]);
  const staff = user.role !== 'student', windowClerk = ['Window 1','Receiving Desk'].includes(user.desk_assignment);
  const registrar = user.role === 'admin' || windowClerk || user.desk_assignment === 'Secretary';
  const canSend = ticket && !ticket.read_only && !(windowClerk && (ticket.state !== 'IN_PROGRESS' || Number(ticket.assigned_to) !== Number(user.id))) && !(staff && ticket.state === 'FAQ_ASSISTANCE') && !(windowClerk && chat.data?.window?.open===false);
  const stage = action => setStaged({...action,client_key:crypto.randomUUID()});
  const selectFiles = event => {
    const selected = [...event.target.files]; event.target.value = '';
    if (chat.files.length + selected.length > 3 || selected.some(file => file.size > 5*1024*1024 || !/\.(jpe?g|png|pdf)$/i.test(file.name) || !['image/jpeg','image/png','application/pdf'].includes(file.type))) {
      setFileError('Choose up to 3 JPEG, PNG or PDF files, 5 MB each.'); return;
    }
    setFileError(''); chat.setFiles(previous => [...previous,...selected]);
  };
  return <section aria-label="Selected support ticket" className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
    <header tabIndex={0} aria-label="Ticket context and actions" className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700 max-h-[25%] shrink-0 space-y-2 overflow-y-auto border-b border-gray-200 p-3 dark:border-gray-700">
      <h3 className="font-bold break-words">{ticket?.subject || 'Support conversation'}</h3>
      {ticket && <p className="text-sm break-words select-text">Ticket #{ticket.id} · {labels[ticket.state]}{ticket.tracking_number && ` · ${ticket.tracking_number}`}{ticket.clerk_name && ` · ${ticket.clerk_name}`}</p>}
      {ticket?.read_only && <p className="text-sm font-semibold">Read-only history{ticket.state === 'RESOLVED' ? ' — ticket resolved.' : ' — document case closed.'}</p>}
      {chat.data?.window && !chat.data.window.open && <p role="status" className="text-sm">Live support is closed; conversations and queue places are saved. Next opening: {chat.data.window.next_opens_at ? new Date(chat.data.window.next_opens_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'}) : 'Check support hours'} (Manila).</p>}
      {ticket?.state === 'QUEUED' && <p role="status" className="text-sm">Queue position: {chat.data.queue?.position ?? 'Checking'} · {chat.data.queue?.available_clerks ?? 0} declared available clerks. {chat.data.queue?.wait_range_minutes ? `Estimated ${chat.data.queue.wait_range_minutes.join('–')} minutes (${chat.data.queue.sample_size} handling samples). Availability can change.` : chat.data.queue?.message}</p>}
      {ticket && <div className="flex flex-wrap gap-2">
        {user.role === 'student' && ticket.state === 'FAQ_ASSISTANCE' && <Button type="button" disabled={chat.busy} onClick={() => stage({action:'escalate'})} className="trace-button trace-button-primary">Talk to staff</Button>}
        {registrar && !ticket.read_only && <Button type="button" disabled={chat.busy} onClick={() => stage({action:'resolve'})} className="trace-button trace-button-secondary">Resolve ticket</Button>}
        {registrar && ticket.state === 'IN_PROGRESS' && (!windowClerk || Number(ticket.assigned_to) === Number(user.id)) && <>
          <Button type="button" disabled={chat.busy || Boolean(ticket.reply_requested_at)} onClick={() => stage({action:'request_reply'})} className="trace-button trace-button-secondary">Request student reply</Button>
          <Button type="button" disabled={chat.busy} onClick={() => stage({action:'await_student'})} className="trace-button trace-button-secondary">Awaiting student</Button>
        </>}
        {ticket.state === 'RESOLVED' && user.desk_assignment!=='Finance' && (!ticket.document_id ? ticket.category !== 'linked' : PIPELINE.includes(ticket.current_status) && ticket.current_status!=='COMPLETED') && <Button type="button" disabled={chat.busy} onClick={() => stage({action:'reopen'})} className="trace-button trace-button-secondary">Reopen ticket</Button>}
      </div>}
    </header>
    <div ref={history} tabIndex={0} aria-label="Conversation history" onScroll={event => { const node = event.currentTarget; pinned.current = node.scrollHeight-node.clientHeight-node.scrollTop < 32; }} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-green-700">
      {chat.loading && <p role="status">Loading conversation…</p>}
      {chat.cursor && <Button type="button" disabled={chat.loadingOlder} onClick={() => { const node = history.current; older.current = {height:node.scrollHeight,top:node.scrollTop}; pinned.current = false; void chat.refresh(chat.cursor); }} className="trace-button trace-button-secondary">{chat.loadingOlder ? 'Loading older messages…' : 'Load older messages'}</Button>}
      {ticket?.state === 'FAQ_ASSISTANCE' && user.role === 'student' && <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
        <h4 className="font-bold">Approved FAQ assistance</h4>
        <label className="trace-label block">Find a question<input value={faqQuery} onChange={event => setFaqQuery(event.target.value)} className="trace-control mt-1 w-full" /></label>
        {suggestions.error && <p role="alert">{suggestions.error}</p>}
        {suggestions.topics.map(topic => <div key={topic.id} className="space-y-2">
          <Button type="button" disabled={chat.busy} onClick={() => void chat.faq({topic_id:topic.id,action:'view',client_key:crypto.randomUUID()})} className="trace-button trace-button-secondary w-full text-left">{topic.question}</Button>
        </div>)}
        <p className="text-sm">Need a person? Choose Talk to staff, or send “human”, “live support” or “talk to staff”.</p>
      </div>}
      {chat.messages.map(row => <article key={row.id} className={`min-w-0 space-y-2 rounded-xl p-3 text-sm ${row.kind === 'system' || row.kind === 'requirement' ? 'border border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100' : Number(row.sender_id) === Number(user.id) ? 'ml-4 bg-green-700 text-white' : 'mr-4 border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'}`}>
        <p className="font-semibold">{row.kind === 'system' ? 'TRACE' : Number(row.sender_id) === Number(user.id) ? 'You' : row.sender_name || 'Registrar'}</p>
        <p className="select-text whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{row.message}</p>
        {row.kind==='requirement' && <RequirementBubble ticketId={ticketId} row={row.requirement} user={user} readOnly={ticket?.read_only} onAction={setRequirement} />}
        {row.files?.map(file => <SupportFile key={file.id} file={file} />)}
        {row.metadata?.faq_topic_id && ticket?.state === 'FAQ_ASSISTANCE' && user.role === 'student' && <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={chat.busy} onClick={() => void chat.faq({topic_id:row.metadata.faq_topic_id,action:'helpful',client_key:crypto.randomUUID()})} className="trace-button trace-button-secondary">Helpful</Button>
          <Button type="button" disabled={chat.busy} onClick={() => void chat.faq({topic_id:row.metadata.faq_topic_id,action:'not_helpful',client_key:crypto.randomUUID()})} className="trace-button trace-button-secondary">Not helpful</Button>
          <Button type="button" disabled={chat.busy} onClick={() => stage({kind:'faq',topic_id:row.metadata.faq_topic_id,action:'resolved'})} className="trace-button trace-button-secondary">This resolved my question</Button>
        </div>}
        <time className="block text-xs" dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('en-PH',{timeZone:'Asia/Manila'})} (Manila)</time>
      </article>)}
    </div>
    <div className="max-h-[50%] min-h-0 shrink-0 overflow-y-auto border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      {chat.error && <p role="alert" className="mb-2 text-sm text-red-700 dark:text-red-300">{chat.error} <Button type="button" onClick={() => void chat.refresh()} className="trace-action underline">Retry conversation</Button></p>}
      {chat.notice && <p role="status" className="mb-2 text-sm">{chat.notice}</p>}
      {canSend ? <form onSubmit={chat.send} className="space-y-2" aria-busy={chat.busy}>
        <div className="flex min-w-0 items-center gap-2"><label className="min-w-0 flex-1"><span className="sr-only">Message</span><input ref={composer} aria-label="Message" value={chat.input} onChange={event => chat.setInput(event.target.value)} maxLength={2000} disabled={chat.busy} placeholder="Type your message…" className="trace-control w-full" /></label><Button type="submit" disabled={chat.busy || (!chat.input.trim() && !chat.files.length)} className="trace-button trace-button-primary">{chat.busy ? 'Sending…' : 'Send'}</Button></div>
        {chat.files.map((file,index) => <div key={`${file.name}:${index}`} className="flex flex-wrap items-center gap-2 text-sm"><span className="break-words">{file.name} ({formatFileSize(file.size)})</span><Button type="button" disabled={chat.busy} onClick={() => chat.setFiles(previous => previous.filter((_,i) => i !== index))} className="trace-action underline">Remove {file.name}</Button></div>)}
        <input ref={chooser} aria-label="Attach chat files" type="file" multiple hidden accept=".jpg,.jpeg,.png,.pdf" disabled={chat.busy} onChange={selectFiles} />
        <div className="flex flex-wrap items-center gap-2">{registrar && ticket.document_id && <Button type="button" aria-label="Request supporting document" disabled={chat.busy} onClick={() => setRequirement({new:true})} className="trace-icon-button"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 12 7-7a4 4 0 0 1 6 6L10 22a6 6 0 0 1-8-8L13 3M5 17l10-10" /></svg><span className="sr-only">Request document</span></Button>}<Button type="button" aria-label="Attach files" onClick={() => chooser.current?.click()} disabled={chat.busy || chat.files.length >= 3} className="trace-icon-button"><svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m8 12 7-7a4 4 0 0 1 6 6L10 22a6 6 0 0 1-8-8L13 3M5 17l10-10" /></svg></Button></div>
        <details className="text-xs"><summary className="cursor-pointer focus-visible:outline">File limits</summary><p>3 files maximum · 5 MB each · JPEG, PNG, PDF</p></details>
        {fileError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{fileError}</p>}
      </form> : <p className="text-sm">{ticket?.read_only ? 'Previous messages and authorized files remain available.' : windowClerk && chat.data?.window?.open===false ? 'Live support is paused. Your assigned conversation resumes when support opens.' : windowClerk ? 'Declare availability and claim the oldest ticket to reply.' : 'Select a ticket to begin.'}</p>}
    </div>
    <ConfirmDialog open={Boolean(staged)} title="Confirm Support Action" message={chat.error || `Save ${staged?.action?.replaceAll('_',' ')} for this ticket?`} loading={chat.busy} onCancel={() => { if (!chat.busy) setStaged(null); }} onConfirm={async () => { if (await (staged?.kind === 'faq' ? chat.faq(staged) : chat.change(staged))) { setStaged(null); onTicketChanged(); } }} />
    {requirement && ticket?.document_id && <SupportRequirementDialog key={`${ticket.id}:${requirement.id || 'new'}:${Boolean(requirement.replacement)}`} documentId={ticket.document_id} user={user} selection={requirement.new ? null : requirement} onClose={() => setRequirement(null)} onSaved={() => { void chat.refresh(); onTicketChanged(); }} />}
  </section>;
}
