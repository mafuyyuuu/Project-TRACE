import useDataRefresh from '@/hooks/useDataRefresh';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as service from '@/services/supportTicketsService';
import useSupportFeedback from '@/hooks/useSupportFeedback';
import { onNotification } from '@/services/realtimeService';
const message = (error, fallback) => error.response?.data?.error || fallback;
const merge = (old, incoming) => [...new Map([...old, ...incoming].map(row => [String(row.id), row])).values()].sort((a,b) => Number(b.id)-Number(a.id));
export default function useSupportTickets(user,initialDocumentId,requestedTicket,requestedSupport) {
  const [view,setView] = useState('active');
  const [tickets,setTickets] = useState([]), [cursor,setCursor] = useState(null);
  const [loading,setLoading] = useState(true), [error,setError] = useState('');
  const [settings,setSettings] = useState(null), [topics,setTopics] = useState([]);
  const [selected,setSelected] = useState(() => requestedTicket || '');
  const [busy,setBusy] = useState(false);
  const feedback = useSupportFeedback();
  const owner = useRef(null), read = useRef(null), pending = useRef(false), initial = useRef(true), scope = useRef(null);
  const observeTicket = useCallback(ticket => {if (ticket) setView(ticket.state === 'RESOLVED' ? 'archive' : 'active');}, []);
  const changeView = next => {if (next !== view) {setSelected('');setView(next);}};
  const refresh = useCallback(async (before = null) => {
    if (!owner.current || read.current) return;
    const identity = owner.current, controller = new AbortController(); read.current = controller;
    try {
      const data = await service.getTickets(before,controller.signal,view);
      if (identity !== owner.current || controller.signal.aborted) return;
      const scopeChanged=scope.current!==null && typeof data.access_scope==='string' && data.access_scope!==scope.current;
      if(scopeChanged) {setSelected('');initial.current=true;}
      if(typeof data.access_scope==='string')scope.current=data.access_scope;
      setTickets(previous => before && !scopeChanged ? merge(previous,data.tickets) : data.tickets);
      setCursor(data.next_cursor);
      initial.current = false; setError('');
    } catch (err) { if (identity === owner.current && !controller.signal.aborted) {
      if([403,404].includes(err.response?.status)){setTickets([]);setSelected('');setCursor(null);setSettings(null);initial.current=true;}
      setError(message(err,'Could not load tickets. Retry support.'));
    } }
    finally { if (read.current === controller) read.current = null; if (identity === owner.current && !controller.signal.aborted) setLoading(false); }
  }, [view]);
  const loadContext = useCallback(async () => {
    const identity = owner.current;
    try {
      const [config,faq] = await Promise.all([service.getSupportSettings(),service.getSupportFaq()]);
      if (identity === owner.current && identity) { setSettings(config); setTopics(faq); }
    } catch (err) { if (identity === owner.current && identity) setError(message(err,'Could not load support settings and approved FAQs. Retry support.')); }
  }, []);
  useEffect(() => {
    const identity = {}; owner.current = identity; initial.current=true;scope.current=null;queueMicrotask(() => { if (owner.current === identity) {setTickets([]);setCursor(null);setLoading(true);void refresh(); void loadContext(); } });
    const update = () => { if (document.visibilityState !== 'hidden') void refresh(); };
    const unsubscribe = onNotification(update), interval = setInterval(update,15000);
    window.addEventListener('focus',update);
    return () => { owner.current = null; read.current?.abort(); read.current = null; clearInterval(interval); unsubscribe(); window.removeEventListener('focus',update); };
  }, [user.id,refresh,loadContext]);
  useEffect(() => {
    const controller=new AbortController();
    if (requestedTicket) {
      queueMicrotask(()=>{if(!controller.signal.aborted)setSelected(String(requestedTicket));});
      return ()=>controller.abort();
    }
    const params=new URLSearchParams(window.location.search);
    const documentId=initialDocumentId || params.get('document'), supportId=requestedSupport;
    if(!documentId && !supportId) return;
    service.resolveSupportContext(documentId ? {document_id:documentId} : {student_user_id:supportId},controller.signal).then(ticket=>{
      if(!controller.signal.aborted && ticket) {setTickets(previous=>merge(previous,[ticket]));setSelected(String(ticket.id));}
    }).catch(err=>{if(!controller.signal.aborted)setError(message(err,'Could not open the linked support history. Retry support.'));});
    return ()=>controller.abort();
  },[user.id,initialDocumentId,requestedTicket,requestedSupport]);
  useDataRefresh(['support', 'documents', 'accounts'], () => { read.current?.abort(); read.current = null; void refresh(); void loadContext(); });
  const execute = async action => {
    if (pending.current) return false;
    const identity = owner.current; pending.current = true; setBusy(true); setError('');
    try {
      const result = await (action.kind === 'create' ? service.createTicket(action.payload)
        : action.kind === 'claim' ? service.claimSupportTicket()
        : action.kind === 'availability' ? service.setSupportAvailability(action.available)
        : service.saveSupportSettings(action.settings));
      if (owner.current !== identity) return true;
      if (result?.id) { setTickets(previous => merge(previous,[result])); setSelected(String(result.id)); }
      feedback.notify(action.kind === 'claim' ? result?.id ? `Ticket #${result.id} is ready for you.` : 'No eligible ticket is waiting.' : action.kind === 'availability' ? `Live support availability: ${action.available ? 'Available' : 'Unavailable'}.` : action.kind === 'create' ? `Ticket #${result.id} opened.` : 'Support settings saved.');
      await refresh(); await loadContext(); return true;
    } catch (err) { if (identity === owner.current) setError(message(err,'Could not confirm saving. Keep your draft and retry.')); return false; }
    finally { pending.current = false; if (owner.current) setBusy(false); }
  };
  return { view,changeView,observeTicket,tickets,cursor,loading,error,settings,topics,selected,setSelected,busy,feedback,execute,refresh, retry: () => { read.current?.abort(); read.current = null; void refresh(); void loadContext(); } };
}
