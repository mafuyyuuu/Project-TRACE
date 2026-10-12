import {useCallback,useEffect,useRef,useState} from 'react';
import * as service from '@/services/staffConversationService';
import {onNotification} from '@/services/realtimeService';
import useSupportFeedback from '@/hooks/useSupportFeedback';
const message = error => error.response?.data?.error || 'Staff coordination is unavailable. Keep your draft and retry.';
const merge = (previous,rows) => [...new Map([...previous,...rows].map(row=>[String(row.id),row])).values()];
export default function useStaffConversations(user,requestedConversation) {
  const [rows,setRows] = useState([]),[cursor,setCursor] = useState(null),[selected,setSelected] = useState(requestedConversation || '');
  const [loading,setLoading] = useState(true),[busy,setBusy] = useState(false),[error,setError] = useState(''),[actionError,setActionError] = useState('');
  const owner = useRef(null),read = useRef(null),pending = useRef(false),initialized = useRef(false),scope = useRef(null),feedback = useSupportFeedback();
  useEffect(()=>{let active=true;if(requestedConversation)queueMicrotask(()=>{if(active)setSelected(String(requestedConversation));});return()=>{active=false;};},[requestedConversation]);
  const refresh = useCallback(async(before = null)=>{
    if(!owner.current || read.current)return;
    const identity = owner.current,controller = new AbortController();read.current=controller;
    try {const result=await service.listConversations(before,controller.signal);if(identity!==owner.current || controller.signal.aborted)return;
      const scopeChanged=scope.current!==null&&result.access_scope!==scope.current;
      if(scopeChanged){setSelected('');initialized.current=false;}scope.current=result.access_scope;
      setRows(previous=>merge(scopeChanged?[]:previous,result.conversations).sort((a,b)=>Number(b.id)-Number(a.id)));
      if(!initialized.current || before)setCursor(result.next_cursor);initialized.current=true;setError('');
    }catch(err){if(identity===owner.current&&!controller.signal.aborted){if(err.response?.status===403){setRows([]);setSelected('');setCursor(null);}setError(message(err));}}
    finally{if(read.current===controller)read.current=null;if(identity===owner.current&&!controller.signal.aborted)setLoading(false);}
  },[]);
  useEffect(()=>{
    const identity={};owner.current=identity;queueMicrotask(()=>{if(owner.current===identity)void refresh();});
    const update=()=>{if(document.visibilityState!=='hidden')void refresh();},unsubscribe=onNotification(update),timer=setInterval(update,15000);
    window.addEventListener('focus',update);return()=>{owner.current=null;read.current?.abort();read.current=null;unsubscribe();clearInterval(timer);window.removeEventListener('focus',update);};
  },[user.id,refresh]);
  const open=async payload=>{
    if(pending.current)return false;const identity=owner.current;pending.current=true;setBusy(true);setActionError('');
    try{const result=await service.openConversation(payload);if(identity!==owner.current)return true;
      setRows(previous=>merge(previous,[result.conversation]).sort((a,b)=>Number(b.id)-Number(a.id)));setSelected(String(result.conversation.id));
      feedback.notify('Staff conversation opened.');read.current?.abort();read.current=null;await refresh();return true;
    }catch(err){if(identity===owner.current)setActionError(message(err));return false;}
    finally{pending.current=false;if(identity===owner.current)setBusy(false);}
  };
  return {rows,cursor,selected,setSelected,loading,busy,error:actionError||error,refresh,open,feedback};
}
export function useStaffRecipients(active,search) {
  const [rows,setRows]=useState([]),[cursor,setCursor]=useState(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const owner=useRef(null),read=useRef(null);
  const refresh=useCallback(async(before=null)=>{
    if(!owner.current||read.current)return;const identity=owner.current,controller=new AbortController();read.current=controller;setLoading(true);
    try{const result=await service.listRecipients({search,before},controller.signal);if(identity!==owner.current||controller.signal.aborted)return;
      setRows(previous=>before?merge(previous,result.recipients):result.recipients);setCursor(result.next_cursor);setError('');
    }catch(err){if(identity===owner.current&&!controller.signal.aborted){if(err.response?.status===403)setRows([]);setError(message(err));}}
    finally{if(read.current===controller)read.current=null;if(identity===owner.current&&!controller.signal.aborted)setLoading(false);}
  },[search]);
  useEffect(()=>{
    if(!active)return;const identity={};owner.current=identity;queueMicrotask(()=>{if(owner.current===identity){setRows([]);setCursor(null);void refresh();}});
    return()=>{owner.current=null;read.current?.abort();read.current=null;};
  },[active,refresh]);return {rows,cursor,loading,error,refresh};
}
export function useStaffConversation(id,user,onNotice,onChanged) {
  const [data,setData]=useState(null),[messages,setMessages]=useState([]),[cursor,setCursor]=useState(null),[draft,setDraft]=useState('');
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[loadingOlder,setLoadingOlder]=useState(false),[error,setError]=useState(''),[sendError,setSendError]=useState('');
  const owner=useRef(null),read=useRef(null),pending=useRef(false),retry=useRef(null),initialized=useRef(false),latest=useRef(null);
  const refresh=useCallback(async(before=null)=>{
    if(!owner.current||read.current)return;const identity=owner.current,controller=new AbortController();read.current=controller;if(before)setLoadingOlder(true);
    try{
      const result=await service.readConversation(id,before,controller.signal);
      let incoming=result.messages,previousCursor=result.next_cursor;
      // Bridge missed pages after reconnect before merging; never silently skip middle messages.
      if(!before&&latest.current!==null)while(previousCursor && incoming.length && Number(incoming[0].id)>latest.current){
        const older=await service.readConversation(id,previousCursor,controller.signal);incoming=merge(older.messages,incoming).sort((a,b)=>Number(a.id)-Number(b.id));
        if(older.next_cursor===previousCursor)break;previousCursor=older.next_cursor;
      }
      if(identity!==owner.current||controller.signal.aborted)return;
      setData(result);setMessages(previous=>merge(previous,incoming).sort((a,b)=>Number(a.id)-Number(b.id)));
      if(!initialized.current||before)setCursor(before?result.next_cursor:previousCursor);initialized.current=true;
      if(incoming.length)latest.current=Math.max(latest.current||0,...incoming.map(row=>Number(row.id)));setError('');
    }catch(err){if(identity===owner.current&&!controller.signal.aborted){if(err.response?.status===403){setData(null);setMessages([]);setCursor(null);}setError(message(err));}}
    finally{if(read.current===controller)read.current=null;if(identity===owner.current&&!controller.signal.aborted){setLoading(false);setLoadingOlder(false);}}
  },[id]);
  useEffect(()=>{
    const identity={};owner.current=identity;queueMicrotask(()=>{if(owner.current===identity)void refresh();});
    const update=()=>{if(document.visibilityState!=='hidden')void refresh();},unsubscribe=onNotification(update),timer=setInterval(update,15000);
    window.addEventListener('focus',update);return()=>{owner.current=null;read.current?.abort();read.current=null;unsubscribe();clearInterval(timer);window.removeEventListener('focus',update);};
  },[id,refresh]);
  const send=async event=>{
    event.preventDefault();const text=draft.trim();if(!text||pending.current)return;
    if(retry.current?.message!==text)retry.current={message:text,client_key:crypto.randomUUID()};
    const identity=owner.current,payload=retry.current;pending.current=true;setBusy(true);setSendError('');
    try{const result=await service.sendMessage(id,payload);if(identity!==owner.current)return;
      setDraft('');retry.current=null;setMessages(previous=>merge(previous,[{id:result.message_id,sender_id:user.id,sender_name:user.full_name,message:text,created_at:new Date().toISOString()}]).sort((a,b)=>Number(a.id)-Number(b.id)));
      onNotice('Staff message sent.');read.current?.abort();read.current=null;await refresh();onChanged();
    }catch(err){if(identity===owner.current)setSendError(message(err));}
    finally{pending.current=false;if(identity===owner.current)setBusy(false);}
  };return {data,messages,cursor,draft,setDraft,loading,loadingOlder,busy,error:sendError||error,refresh,send};
}
