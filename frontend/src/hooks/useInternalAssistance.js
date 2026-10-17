import useDataRefresh from '@/hooks/useDataRefresh';
import { useCallback,useEffect,useRef,useState } from 'react';
import * as service from '@/services/internalAssistanceService';
import { onNotification } from '@/services/realtimeService';
import useSupportFeedback from '@/hooks/useSupportFeedback';
const errorMessage = err => err.response?.data?.error || 'Internal assistance is unavailable. Keep your draft and retry.';
const merge = (old,incoming) => [...new Map([...old,...incoming].map(row => [String(row.id),row])).values()];
export default function useInternalAssistance(user,stateFilter,categoryFilter,requestedTicket) {
  const [view,setView] = useState('active');
  const [tickets,setTickets] = useState([]), [cursor,setCursor] = useState(null), [categories,setCategories] = useState({});
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(''), [actionError,setActionError] = useState('');
  const [selected,setSelected] = useState(() => new URLSearchParams(window.location.search).get('internalTicket') || '');
  const feedback = useSupportFeedback(), owner = useRef(null), pending = useRef(false), read = useRef(null);
  const observeTicket = useCallback(ticket => {if (ticket) setView(ticket.state === 'RESOLVED' ? 'archive' : 'active');}, []);
  const changeView = next => {if (next !== view) {setSelected('');setView(next);}};
  // Notification navigation can change the query while this workspace stays mounted.
  useEffect(() => {
    let active = true;
    if (requestedTicket) queueMicrotask(() => {if (active) setSelected(String(requestedTicket));});
    return () => {active = false;};
  },[requestedTicket]);
  const refresh = useCallback(async (before = null) => {
    const identity = owner.current;
    if (!identity || read.current) return;
    const controller = new AbortController(); read.current = controller;
    try {
      const result = await service.listTickets({view,state:view === 'archive' ? 'RESOLVED' : stateFilter === 'RESOLVED' ? undefined : stateFilter || undefined,category:categoryFilter || undefined,before},controller.signal);
      if (owner.current !== identity || controller.signal.aborted) return;
      setTickets(previous => (before ? merge(previous,result.tickets) : result.tickets).sort((a,b) => Number(b.id)-Number(a.id)));
      setCursor(result.next_cursor);setCategories(result.categories);setError('');
    } catch (err) { if (owner.current === identity && !controller.signal.aborted) setError(errorMessage(err)); }
    finally { if (read.current === controller) read.current = null; if (owner.current === identity && !controller.signal.aborted) setLoading(false); }
  },[stateFilter,categoryFilter,view]);
  useEffect(() => {
    const identity = {}; owner.current = identity;
    queueMicrotask(() => {if (owner.current === identity) {setTickets([]);setCursor(null);setLoading(true);void refresh();}});
    const update = () => {if (document.visibilityState !== 'hidden') void refresh();};
    const unsubscribe = onNotification(update), timer = setInterval(update,15000);
    window.addEventListener('focus',update);
    return () => {owner.current = null;read.current?.abort();read.current = null;clearInterval(timer);unsubscribe();window.removeEventListener('focus',update);};
  },[user.id,refresh]);
  useDataRefresh(['support'], () => { read.current?.abort(); read.current = null; return refresh(); });
  const create = async payload => {
    if (pending.current) return false;
    const identity = owner.current; pending.current = true;setBusy(true);setActionError('');
    try {
      const result = await service.createTicket(payload);
      if (identity !== owner.current) return true;
      setSelected(String(result.ticket.id));feedback.notify(`Internal ticket #${result.ticket.id} opened.`);
      await refresh();return true;
    } catch (err) {if (identity === owner.current) setActionError(errorMessage(err));return false;}
    finally {pending.current = false;if (owner.current) setBusy(false);}
  };
  return {view,changeView,observeTicket,tickets,cursor,categories,selected,setSelected,loading,busy,error:actionError || error,refresh,create,feedback};
}
export function useInternalConversation(ticketId,user,onNotice,onChanged) {
  const [data,setData] = useState(null), [messages,setMessages] = useState([]), [cursor,setCursor] = useState(null);
  const [loading,setLoading] = useState(true), [loadingOlder,setLoadingOlder] = useState(false), [busy,setBusy] = useState(false), [error,setError] = useState(''), [actionError,setActionError] = useState('');
  const [draft,setDraft] = useState('');
  const owner = useRef(null), read = useRef(null), pending = useRef(false), retry = useRef(null), initialized = useRef(false);
  const refresh = useCallback(async (before = null) => {
    const identity = owner.current;
    if (!identity || read.current) return;
    const controller = new AbortController();read.current = controller;
    if (before) setLoadingOlder(true);
    try {
      const result = await service.readTicket(ticketId,before,controller.signal);
      if (identity !== owner.current || controller.signal.aborted) return;
      setData(result);setMessages(previous => merge(previous,result.messages).sort((a,b) => Number(a.id)-Number(b.id)));
      if (before || !initialized.current) setCursor(result.next_cursor);initialized.current = true;setError('');
    } catch (err) {if (identity === owner.current && !controller.signal.aborted) setError(errorMessage(err));}
    finally {if (read.current === controller) read.current = null;if (identity === owner.current && !controller.signal.aborted) {setLoading(false);setLoadingOlder(false);}}
  // Cursor state is retained as new messages arrive; it is reset by ticket-keyed mounting.
  },[ticketId]);
  // Keep polling independent of data changes so it does not reset drafts or history.
  const refreshRef = useRef(refresh);
  useEffect(() => {refreshRef.current = refresh;},[refresh]);
  useEffect(() => {
    const identity = {};owner.current = identity;
    queueMicrotask(() => {if (owner.current === identity) void refreshRef.current();});
    const update = () => {if (document.visibilityState !== 'hidden') void refreshRef.current();};
    const unsubscribe = onNotification(update), timer = setInterval(update,15000);
    window.addEventListener('focus',update);
    return () => {owner.current = null;read.current?.abort();read.current = null;clearInterval(timer);unsubscribe();window.removeEventListener('focus',update);};
  },[ticketId]);
  useDataRefresh(['support'], () => { read.current?.abort(); read.current = null; return refresh(); });
  const execute = async (kind,payload) => {
    if (pending.current) return false;
    const identity = owner.current;pending.current = true;setBusy(true);setActionError('');
    try {
      const result = await (kind === 'send' ? service.sendMessage(ticketId,payload) : service.changeTicket(ticketId,payload));
      if (identity !== owner.current) return true;
      if (kind === 'send') {setDraft('');retry.current = null;setMessages(previous => merge(previous,[{id:result.message_id,sender_id:user.id,kind:'message',message:payload.message,created_at:new Date().toISOString()}]).sort((a,b) => Number(a.id)-Number(b.id)));}
      onNotice(kind === 'send' ? 'Internal message sent.' : 'Internal ticket updated.');
      // Do not allow an older in-flight poll to overwrite the accepted action.
      read.current?.abort();read.current = null;await refresh();onChanged();return true;
    } catch (err) {if (identity === owner.current) setActionError(errorMessage(err));return false;}
    finally {pending.current = false;if (owner.current) setBusy(false);}
  };
  const send = event => {
    event.preventDefault(); const message = draft.trim();
    if (!message || pending.current) return;
    if (retry.current?.message !== message) retry.current = {message,client_key:crypto.randomUUID()};
    void execute('send',retry.current);
  };
  return {data,messages,cursor,loading,loadingOlder,busy,error:actionError || error,draft,setDraft,refresh,send,change:payload => execute('action',payload)};
}
