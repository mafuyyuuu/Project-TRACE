import { useEffect,useRef } from 'react';
import { markConversationRead } from '@/services/conversationReadService';

/** Only the visible, selected conversation at its latest messages acknowledges reads. */
export default function useConversationRead(channel,id,messages,historyRef,active,onRead) {
  const callback = useRef(onRead), acknowledged = useRef({key:null,through:0});
  useEffect(() => { callback.current=onRead; },[onRead]);
  const latest = messages.reduce((last,row) => Math.max(last,Number(row.id) || 0),0);
  useEffect(() => {
    if (!active || !id || !latest) return;
    const key = `${channel}:${id}`;
    if (acknowledged.current.key!==key) acknowledged.current={key,through:0};
    const controller = new AbortController(); let pending=false,retry;
    const read = () => {
      const node = historyRef.current;
      if (controller.signal.aborted || pending || latest<=acknowledged.current.through || document.visibilityState==='hidden' || !node || node.hidden || node.closest('[hidden]') || node.scrollHeight-node.scrollTop-node.clientHeight>50) return;
      pending=true;
      markConversationRead(channel,id,latest,controller.signal).then(() => {
        if (!controller.signal.aborted) {acknowledged.current.through=Math.max(acknowledged.current.through,latest);callback.current?.();}
      }).catch(() => {if (!controller.signal.aborted) retry=setTimeout(read,15000);})
        .finally(() => {pending=false;});
    };
    const node=historyRef.current;
    node?.addEventListener('scroll',read,{passive:true});document.addEventListener('visibilitychange',read);window.addEventListener('focus',read);read();
    return () => {controller.abort();clearTimeout(retry);node?.removeEventListener('scroll',read);document.removeEventListener('visibilitychange',read);window.removeEventListener('focus',read);};
  },[channel,id,latest,historyRef,active]);
}
