import { useCallback, useEffect, useRef, useState } from 'react';
import * as service from '@/services/supportTicketsService';
import { onNotification } from '@/services/realtimeService';
const message = (error, fallback) => error.response?.data?.error || fallback;
const merge = (old, incoming) => [...new Map([...old, ...incoming].map(row => [String(row.id), row])).values()].sort((a,b) => Number(b.id)-Number(a.id));
export default function useSupportTickets(user,initialDocumentId) {
  const [tickets,setTickets] = useState([]), [cursor,setCursor] = useState(null);
  const [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [settings,setSettings] = useState(null), [topics,setTopics] = useState([]);
  const [selected,setSelected] = useState(() => new URLSearchParams(window.location.search).get('ticket') || '');
  const [busy,setBusy] = useState(false), [notice,setNotice] = useState('');
  const owner = useRef(null), read = useRef(null), pending = useRef(false), initial = useRef(true);
  const refresh = useCallback(async (before = null) => {
    if (!owner.current || read.current) return;
    const identity = owner.current, controller = new AbortController(); read.current = controller;
    try {
      const data = await service.getTickets(before,controller.signal);
      if (identity !== owner.current || controller.signal.aborted) return;
      setTickets(previous => merge(previous,data.tickets));
      if (initial.current || before) setCursor(data.next_cursor);
      initial.current = false; setError('');
    } catch (err) { if (identity === owner.current && !controller.signal.aborted) setError(message(err,'Could not load tickets. Retry support.')); }
    finally { if (read.current === controller) read.current = null; if (identity === owner.current && !controller.signal.aborted) setLoading(false); }
  }, []);
  const loadContext = useCallback(async () => {
    const identity = owner.current;
    try {
      const [config,faq] = await Promise.all([service.getSupportSettings(),service.getSupportFaq()]);
      if (identity === owner.current && identity) { setSettings(config); setTopics(faq); }
    } catch (err) { if (identity === owner.current && identity) setError(message(err,'Could not load support settings and approved FAQs. Retry support.')); }
  }, []);
  useEffect(() => {
    const identity = {}; owner.current = identity; queueMicrotask(() => { if (owner.current === identity) { void refresh(); void loadContext(); } });
    const update = () => { if (document.visibilityState !== 'hidden') void refresh(); };
    const unsubscribe = onNotification(update), interval = setInterval(update,15000);
    window.addEventListener('focus',update);
    return () => { owner.current = null; read.current?.abort(); read.current = null; clearInterval(interval); unsubscribe(); window.removeEventListener('focus',update); };
  }, [user.id,refresh,loadContext]);
  useEffect(() => {
    const params=new URLSearchParams(window.location.search);
    const documentId=initialDocumentId || params.get('document'), supportId=params.get('support');
    if(!documentId && !supportId) return;
    const controller=new AbortController();
    service.resolveSupportContext(documentId ? {document_id:documentId} : {student_user_id:supportId},controller.signal).then(ticket=>{
      if(!controller.signal.aborted && ticket) {setTickets(previous=>merge(previous,[ticket]));setSelected(String(ticket.id));}
    }).catch(err=>{if(!controller.signal.aborted)setError(message(err,'Could not open the linked support history. Retry support.'));});
    return ()=>controller.abort();
  },[user.id,initialDocumentId]);
  const execute = async action => {
    if (pending.current) return false;
    const identity = owner.current; pending.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await (action.kind === 'create' ? service.createTicket(action.payload)
        : action.kind === 'claim' ? service.claimSupportTicket()
        : action.kind === 'availability' ? service.setSupportAvailability(action.available)
        : service.saveSupportSettings(action.settings));
      if (owner.current !== identity) return true;
      if (result?.id) { setTickets(previous => merge(previous,[result])); setSelected(String(result.id)); }
      setNotice(action.kind === 'claim' && !result?.id ? 'No eligible ticket is waiting.' : 'Support action saved.');
      await refresh(); await loadContext(); return true;
    } catch (err) { if (identity === owner.current) setError(message(err,'Could not confirm saving. Keep your draft and retry.')); return false; }
    finally { pending.current = false; if (identity === owner.current) setBusy(false); }
  };
  return { tickets,cursor,loading,error,settings,topics,selected,setSelected,busy,notice,execute,refresh, retry: () => { void refresh(); void loadContext(); } };
}
