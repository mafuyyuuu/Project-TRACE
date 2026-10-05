import { useCallback, useEffect, useRef, useState } from 'react';
import * as service from '@/services/supportTicketsService';
import { onNotification } from '@/services/realtimeService';
const merge = (old,incoming) => [...new Map([...old,...incoming].map(row => [String(row.id),row])).values()].sort((a,b) => Number(a.id)-Number(b.id));
const failure = (error,fallback) => error.response?.data?.error || fallback;
export default function useSupportConversation(ticketId) {
  const [data,setData] = useState(null), [messages,setMessages] = useState([]), [cursor,setCursor] = useState(null);
  const [loading,setLoading] = useState(true), [loadingOlder,setLoadingOlder] = useState(false);
  const [input,setInput] = useState(''), [files,setFiles] = useState([]), [busy,setBusy] = useState(false);
  const [error,setError] = useState(''), [readError,setReadError]=useState(''), [notice,setNotice] = useState('');
  const lifetime = useRef(null), read = useRef(null), pending = useRef(false), initial = useRef(true), retry = useRef(null);
  const load = useCallback(async (before = null) => {
    if (!lifetime.current || read.current) return false;
    const owner = lifetime.current, controller = new AbortController(); read.current = controller;
    if (before) setLoadingOlder(true);
    try {
      const result = await service.getTicket(ticketId,before,controller.signal);
      if (owner !== lifetime.current || controller.signal.aborted) return false;
      setData(result); setMessages(previous => merge(previous,result.messages));
      if (initial.current || before) setCursor(result.next_cursor);
      initial.current = false; setReadError(''); return true;
    } catch (err) { if (owner === lifetime.current && !controller.signal.aborted) setReadError(failure(err,'Could not load this ticket. Retry conversation.')); return false; }
    finally { if (read.current === controller) read.current = null; if (owner === lifetime.current && !controller.signal.aborted) { setLoading(false); setLoadingOlder(false); } }
  }, [ticketId]);
  useEffect(() => {
    const identity = {}; lifetime.current = identity; queueMicrotask(() => { if (lifetime.current === identity) void load(); });
    const update = () => { if (document.visibilityState !== 'hidden') void load(); };
    const unsubscribe = onNotification(update), timer = setInterval(update,15000);
    window.addEventListener('focus',update);
    return () => { lifetime.current = null; read.current?.abort(); read.current = null; unsubscribe(); clearInterval(timer); window.removeEventListener('focus',update); };
  }, [load]);
  const run = async operation => {
    if (pending.current) return false;
    pending.current = true; const owner = lifetime.current; setBusy(true); setError(''); setNotice('');
    try {
      const result = await operation();
      if (owner === lifetime.current) { setNotice('Saved.'); await load(); }
      return result;
    } catch (err) { if (owner === lifetime.current) setError(failure(err,'Could not confirm saving. Keep your draft and retry with the same contents.')); return false; }
    finally { pending.current = false; if (owner === lifetime.current) setBusy(false); }
  };
  const send = async event => {
    event?.preventDefault(); if ((!input.trim() && !files.length) || pending.current) return;
    const signature = JSON.stringify([input.trim(),files.map(file => [file.name,file.size,file.lastModified])]);
    if (retry.current?.signature !== signature || retry.current?.files.some((file,index)=>file!==files[index])) retry.current = {signature,files:[...files],key:crypto.randomUUID()};
    const owner = lifetime.current, text = input.trim(), snapshot = [...files], key = retry.current.key;
    await run(async () => {
      const result = await service.sendTicketMessage(ticketId,text,snapshot,key);
      if (!result?.sent?.id) throw new Error('Invalid accepted message.');
      if (owner === lifetime.current) {
        setMessages(previous => merge(previous,[result.sent])); setInput(''); setFiles([]); retry.current = null;
      }
      return result;
    });
  };
  const change = action => run(() => service.ticketAction(ticketId,action.action,action.client_key));
  const faq = action => run(() => service.ticketFaq(ticketId,action.topic_id,action.action,action.client_key));
  return { data,messages,cursor,loading,loadingOlder,input,setInput,files,setFiles,busy,error:error || readError,notice,send,change,faq,refresh:load };
}
