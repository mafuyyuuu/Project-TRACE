import ConfirmDialog from '@/components/ConfirmDialog';
import { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { getRelativeTime } from '@/utils/formatters';

export default function DocumentChat({ documentId, user }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messageToConfirm, setMessageToConfirm] = useState(null);
  const [sendError, setSendError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/documents/${documentId}/messages`);
        if (mounted) setMessages(res.data);
      } catch (err) {
        console.error('Failed to load messages', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    if (documentId) fetchMessages();
    return () => { mounted = false; };
  }, [documentId]);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    messagesEndRef.current?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSendError('');
    setMessageToConfirm(input);
  };

  const confirmSend = async () => {
    if (!messageToConfirm || sending) return;
    setSendError('');
    const optimisticMsg = {
      id: Date.now(),
      sender_id: user.id,
      sender_name: user.full_name || 'You',
      message: messageToConfirm,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setInput('');
    setSending(true);

    try {
      await api.post(`/documents/${documentId}/messages`, { message: optimisticMsg.message });
      // Refresh to get real IDs and read status
      const res = await api.get(`/documents/${documentId}/messages`);
      setMessages(res.data);
      setMessageToConfirm(null);
    } catch (err) {
      console.error('Failed to send message', err);
      setInput(optimisticMsg.message);
      setSendError(err.response?.data?.error || 'Could not send your message. Please try again.');
      // Revert optimistic if failed
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-700 border-t-[#15803d] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden max-h-80">
      <ConfirmDialog open={messageToConfirm !== null} title="Confirm Message"
        message={['Send this message?', messageToConfirm, sendError ? <span role="alert">{sendError}</span> : null]}
        confirmLabel="Send Message" loading={sending} loadingLabel="Sending…" onConfirm={confirmSend}
        onCancel={() => setMessageToConfirm(null)} />
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <p className="text-xs text-center text-gray-400 dark:text-gray-400 font-semibold my-4">No messages yet. Send a message to clarify this request.</p>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[9px] text-gray-400 dark:text-gray-400 font-bold uppercase tracking-widest mb-1 select-text break-words">
                  {isMe ? 'You' : msg.sender_name}
                </span>
                <div className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] leading-relaxed select-text break-words ${
                  isMe ? 'bg-[#15803d] text-white rounded-br-sm shadow-sm' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.message}
                </div>
                <span className="text-[9px] text-gray-400 dark:text-gray-400 mt-1">{getRelativeTime(msg.created_at)}</span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSend} className="p-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={sending}
          className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#15803d]/20 transition-all"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={sending || !input.trim()}
          className="shrink-0 w-8 h-8 rounded-full bg-[#15803d] disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white flex items-center justify-center transition-colors"
        >
          <svg className="w-3.5 h-3.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
        </button>
      </form>
    </div>
  );
}
