import { useState } from 'react';
import { useMessageThreads } from '@/hooks/useDocumentChat';
import DocumentChat from '@/components/DocumentChat';
import RequestAttachments from '@/components/RequestAttachments';
import { getStatusLabel } from '@/utils/documentStatus';
import GeneralSupportPanel from '@/components/GeneralSupportPanel';

export default function RequestMessagesPanel({ user, initialDocumentId, initialView = 'request' }) {
  const supportId = new URLSearchParams(window.location.search).get('support');
  const [view, setView] = useState(supportId ? 'support' : initialView);
  const canSupport = ['student', 'admin'].includes(user.role) || (user.role === 'clerk' && ['Window 1', 'Receiving Desk'].includes(user.desk_assignment));
  return <div className="space-y-4 min-w-0">
    {canSupport && <div className="flex flex-wrap gap-3" aria-label="Conversation type">
      <button type="button" aria-pressed={view === 'request'} onClick={() => setView('request')} className="trace-button trace-button-secondary">Request conversations</button>
      <button type="button" aria-pressed={view === 'support'} onClick={() => setView('support')} className="trace-button trace-button-secondary">General support</button>
    </div>}
    {canSupport && view === 'support' ? <GeneralSupportPanel key={user.id} user={user} initialStudentId={supportId} /> : <RequestConversationPanel user={user} initialDocumentId={initialDocumentId} />}
  </div>;
}
function RequestConversationPanel({ user, initialDocumentId }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(initialDocumentId || '');
  const inbox = useMessageThreads(user.id, page);
  const selectedThread = inbox.threads.find(thread => String(thread.id) === String(selected));
  return <section className="trace-page">
    <h2 className="trace-page-title">{user.role === 'student' ? 'Messages to Window 1' : 'Student messages'}</h2>
    <p className="text-sm text-gray-600 dark:text-gray-300">Choose a request to send a message or read replies. Conversations show the latest 100 messages.</p>
    {inbox.loading && <p role="status">Loading conversations…</p>}
    {inbox.error && <div><p role="alert" className="text-sm text-red-700 dark:text-red-300">{inbox.error}</p><button type="button" onClick={inbox.retry} className="trace-action py-2 font-bold">Retry conversations</button></div>}
    {!inbox.loading && !inbox.error && !inbox.threads.length && <p className="text-sm">No request conversations yet. {user.role === 'student' ? 'File a document request first, then message Window 1 here.' : 'New requests will appear here, even before a student sends a message.'}</p>}
    {inbox.threads.length > 0 && <div className="space-y-3">
      <label className="trace-label block" htmlFor={`request-thread-${user.id}`}>Request conversation</label>
      <select id={`request-thread-${user.id}`} value={selected} onChange={event => setSelected(event.target.value)} className="trace-control w-full min-w-0">
        <option value="">Choose a request</option>
        {selected && !selectedThread && <option value={selected}>Request #{selected}</option>}
        {inbox.threads.map(thread => <option key={thread.id} value={thread.id}>{thread.tracking_number} · {thread.document_type}{user.role !== 'student' ? ` · ${thread.student_name}` : ''}{Number(thread.unread_count) > 0 ? ` (${thread.unread_count} unread)` : ''}</option>)}
      </select>
      {selectedThread && <p className="break-words text-sm">{getStatusLabel(selectedThread.current_status)}</p>}
    </div>}
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button disabled={page === 1} onClick={() => { setPage(previous => previous - 1); setSelected(''); }} type="button" className="trace-button trace-button-secondary">Previous</button>
      <span>Page {page}</span>
      <button disabled={page * 20 >= inbox.total} onClick={() => { setPage(previous => previous + 1); setSelected(''); }} type="button" className="trace-button trace-button-secondary">Next</button>
    </div>
    {selected && <div className="h-[min(45dvh,28rem)] min-h-64"><DocumentChat documentId={selected} user={user} focusComposer /></div>}
    {selected && <RequestAttachments key={selected} documentId={selected} user={user} />}
  </section>;
}
