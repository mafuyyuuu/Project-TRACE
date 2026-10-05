import Button from '@/components/Button';
import { useState } from 'react';
import { useMessageThreads } from '@/hooks/useDocumentChat';
import DocumentChat from '@/components/DocumentChat';
export default function GeneralSupportPanel({ user, initialStudentId }) {
  const student = user.role === 'student';
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(student ? String(user.id) : initialStudentId || '');
  const inbox = useMessageThreads(user.id, page, 'support');
  return <section className="min-w-0 space-y-4">
    <h2 className="text-xl font-bold">General support · Window 1</h2>
    <p className="text-sm">Ask for help before filing a request. For an existing request or a required attachment, use Request conversations. Replies show when Window 1 sends them; this is not an automated or guaranteed immediate response.</p>
    {!student && <>
      {inbox.loading && <p role="status">Loading support conversations…</p>}
      {inbox.error && <div><p role="alert">{inbox.error}</p><Button type="button" onClick={inbox.retry} className="trace-button trace-button-secondary">Retry support inbox</Button></div>}
      {!inbox.loading && !inbox.error && !inbox.threads.length && <p>No general support messages yet.</p>}
      <label className="trace-label block">Student support conversation
        <select value={selected} onChange={event => setSelected(event.target.value)} className="trace-control mt-2 w-full min-w-0">
          <option value="">Choose a student</option>
          {selected && !inbox.threads.some(row => String(row.id) === selected) && <option value={selected}>Support conversation #{selected}</option>}
          {inbox.threads.map(row => <option key={row.id} value={row.id}>{row.full_name} · {row.student_id}{Number(row.unread_count) ? ` (${row.unread_count} unread)` : ''}</option>)}
        </select>
      </label>
      <div className="flex flex-wrap gap-3 items-center text-sm">
        <Button type="button" disabled={page === 1} onClick={() => { setPage(value => value - 1); setSelected(''); }} className="trace-button trace-button-secondary">Previous support page</Button>
        <span>Page {page}</span>
        <Button type="button" disabled={page * 20 >= inbox.total} onClick={() => { setPage(value => value + 1); setSelected(''); }} className="trace-button trace-button-secondary">Next support page</Button>
      </div>
    </>}
    {selected && <div className="h-[50dvh] min-h-48"><DocumentChat documentId={selected} user={user} kind="support" /></div>}
  </section>;
}
