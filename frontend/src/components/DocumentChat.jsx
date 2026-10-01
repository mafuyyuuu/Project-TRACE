import { useEffect, useRef } from 'react';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { getRelativeTime } from '@/utils/formatters';
import useDocumentChat from '@/hooks/useDocumentChat';

export default function DocumentChat({ documentId, user, kind = 'request' }) {
  if (!documentId || !user?.id) return null;
  return <DocumentConversation key={`${kind}:${documentId}:${user.id}`} documentId={documentId} user={user} kind={kind} />;
}
function DocumentConversation({ documentId, user, kind }) {
  const chat = useDocumentChat(documentId, user, kind);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' }); }, [chat.messages]);
  return <section aria-label={kind === 'support' ? 'General support conversation' : 'Request conversation'} className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
    <div aria-live="polite" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      {chat.loading && <p role="status" className="text-sm">Loading conversation…</p>}
      {!chat.loading && !chat.error && !chat.messages.length && <p className="text-sm text-gray-500 dark:text-gray-400">{kind === 'support' ? 'No messages yet. Ask Window 1 for help; a document request is not required.' : 'No messages yet. Send a message to Window 1 about this request.'}</p>}
      {chat.messages.map(message => <div key={message.id} className={`flex min-w-0 flex-col ${String(message.sender_id) === String(user.id) ? 'items-end' : 'items-start'}`}>
        <p className="mb-1 max-w-full break-words text-xs text-gray-600 dark:text-gray-300">{String(message.sender_id) === String(user.id) ? 'You' : message.sender_name || 'Registrar'}</p>
        <p className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] ${String(message.sender_id) === String(user.id) ? 'bg-[#15803d] text-white' : 'border border-gray-200 bg-white text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100'}`}>{message.message}</p>
        <time className="mt-1 text-xs text-gray-500 dark:text-gray-400">{getRelativeTime(message.created_at)}</time>
      </div>)}
      <div ref={end} />
    </div>
    {chat.error && <div className="px-3 py-2"><p role="alert" className="text-sm text-red-700 dark:text-red-300">{chat.error}</p><button type="button" onClick={chat.retry} className="py-2 text-sm font-bold text-[#15803d] dark:text-green-300">Retry conversation</button></div>}
    {chat.sendError && <p role="alert" className="px-3 py-2 text-sm text-red-700 dark:text-red-300">{chat.sendError}</p>}
    {chat.notice && <p role="status" className="px-3 py-2 text-sm text-green-700 dark:text-green-300">{chat.notice}</p>}
    <form onSubmit={chat.send} aria-busy={chat.sending} className="flex shrink-0 flex-wrap gap-2 border-t border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
      <input aria-label="Message" maxLength={INPUT_LIMITS.notes} value={chat.input} onChange={event => chat.setInput(event.target.value)} disabled={chat.sending} placeholder="Type a message…" className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-transparent px-3 py-2 text-sm dark:border-gray-600" />
      <button type="submit" disabled={chat.sending || !chat.input.trim()} aria-label="Send message" className="rounded-xl bg-[#15803d] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{chat.sending ? 'Sending…' : 'Send'}</button>
    </form>
  </section>;
}
