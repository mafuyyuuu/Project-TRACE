import { useState, useEffect, useRef, useCallback } from 'react';
import { getRequestMessages, sendRequestMessage, getMessageThreads } from '@/services/documentMessagesService';
import { onNotification } from '@/services/realtimeService';
import { getSupportMessages, sendSupportMessage, getSupportThreads } from '@/services/supportMessagesService';

function useRefresh(load) {
  useEffect(() => {
    const refresh = () => { if (document.visibilityState !== 'hidden') void load(); };
    const unsubscribe = onNotification(refresh);
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { unsubscribe(); clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [load]);
}

export default function useDocumentChat(documentId, user, kind = 'request') {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [notice, setNotice] = useState('');
  const lifetime = useRef(null);
  const read = useRef(null);
  const sendPending = useRef(false);
  const accepted = useRef([]);
  const load = useCallback(async (replace = false) => {
    if (!lifetime.current || (read.current && !replace)) return;
    read.current?.abort();
    const controller = new AbortController();
    const owner = lifetime.current;
    read.current = controller;
    try {
      const rows = await (kind === 'support' ? getSupportMessages : getRequestMessages)(documentId, controller.signal);
      if (lifetime.current !== owner || controller.signal.aborted) return;
      const ids = new Set(rows.map(row => String(row.id)));
      accepted.current = accepted.current.filter(row => !ids.has(String(row.id)));
      setMessages([...rows, ...accepted.current]);
      setError(''); setNotice('');
    } catch (err) {
      if (lifetime.current === owner && !controller.signal.aborted) setError(err.response?.data?.error || 'Could not load replies. Retry to refresh this conversation.');
    } finally {
      if (read.current === controller) read.current = null;
      if (lifetime.current === owner && !controller.signal.aborted) setLoading(false);
    }
  }, [documentId, kind]);
  useEffect(() => {
    lifetime.current = {};
    void load();
    return () => { lifetime.current = null; read.current?.abort(); read.current = null; };
  }, [load]);
  useRefresh(load);
  const send = async event => {
    event?.preventDefault();
    if (!input.trim() || sendPending.current) return false;
    const text = input.trim();
    const owner = lifetime.current;
    sendPending.current = true; setSending(true); setSendError('');
    try {
      const sent = await (kind === 'support' ? sendSupportMessage : sendRequestMessage)(documentId, text);
      if (lifetime.current === owner) {
        const message = sent || { id: `accepted-${Date.now()}`, sender_id: user.id, sender_name: user.full_name || 'You', message: text, created_at: new Date().toISOString() };
        accepted.current.push(message);
        setMessages(previous => [...previous, message]);
        setInput(''); setNotice('Message sent.');
        await load(true);
      }
      return true;
    } catch (err) {
      if (lifetime.current === owner) setSendError(err.response?.data?.error || 'Could not confirm sending. Check the conversation before retrying if your connection was interrupted.');
      return false;
    } finally {
      sendPending.current = false;
      if (lifetime.current === owner) setSending(false);
    }
  };
  return { messages, loading, input, setInput, sending, send, error, sendError, notice, retry: () => load(true) };
}

export function useMessageThreads(userId, page, kind = 'request') {
  const [result, setResult] = useState({ threads: [], total: 0 });
  const [loadedKey, setLoadedKey] = useState(null);
  const requestKey = `${kind}:${userId}:${page}`;
  const [error, setError] = useState('');
  const current = useRef(null);
  const read = useRef(null);
  const load = useCallback(async () => {
    if (!current.current || read.current) return;
    const owner = current.current;
    const controller = new AbortController();
    read.current = controller;
    try {
      const data = await (kind === 'support' ? getSupportThreads : getMessageThreads)(page, controller.signal);
      if (current.current === owner && !controller.signal.aborted) { setResult(data); setError(''); }
    } catch (err) {
      if (current.current === owner && !controller.signal.aborted) setError(err.response?.data?.error || 'Could not load conversations. Try again.');
    } finally {
      if (read.current === controller) read.current = null;
      if (current.current === owner && !controller.signal.aborted) setLoadedKey(requestKey);
    }
  }, [page, requestKey, kind]);
  useEffect(() => { const owner = {}; current.current = owner; queueMicrotask(() => { if (current.current === owner) void load(); }); return () => { current.current = null; read.current?.abort(); read.current = null; }; }, [load]);
  useRefresh(load);
  return { ...result, threads: loadedKey === requestKey ? result.threads : [], loading: loadedKey !== requestKey, error, retry: load };
}
