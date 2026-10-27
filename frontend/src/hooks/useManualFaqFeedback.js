import {useCallback,useEffect,useRef,useState} from 'react';
import {getManualFeedback,recordManualFaq} from '@/services/manualFaqService';
export default function useManualFaqFeedback(){
  const [feedback,setFeedback]=useState({}),[selected,setSelected]=useState({}),[drafts,setDrafts]=useState({});
  const [pending,setPending]=useState({}),[errors,setErrors]=useState({}),[notices,setNotices]=useState({}),[loadError,setLoadError]=useState('');
  const alive=useRef(false),read=useRef(null),writes=useRef(new Map()),retries=useRef(new Map()),viewed=useRef(new Set()),timers=useRef(new Map());
  const load=useCallback(async()=>{
    read.current?.abort();const controller=new AbortController();read.current=controller;
    try{const rows=await getManualFeedback(controller.signal);if(alive.current && !controller.signal.aborted){setFeedback(current=>({...Object.fromEntries(rows.map(row=>[row.question,row])),...current}));setLoadError('');}}
    catch{if(alive.current && !controller.signal.aborted)setLoadError('Saved FAQ feedback could not load. You can retry or submit a new response.');}
  },[]);
  useEffect(()=>{alive.current=true;void load();const active=writes.current,notices=timers.current;return()=>{alive.current=false;read.current?.abort();active.forEach(controller=>controller.abort());active.clear();notices.forEach(clearTimeout);notices.clear();};},[load]);
  const save=async(question,action,suggestion='')=>{
    if(writes.current.has(question))return;
    const content=JSON.stringify([question,action,suggestion]),retry=retries.current.get(question),key=retry?.content===content ? retry.key : crypto.randomUUID();
    retries.current.set(question,{content,key});const controller=new AbortController();writes.current.set(question,controller);
    clearTimeout(timers.current.get(question));timers.current.delete(question);
    setPending(current=>({...current,[question]:true}));setErrors(current=>({...current,[question]:''}));setNotices(current=>({...current,[question]:''}));
    try{await recordManualFaq({question,action,suggestion,client_key:key},controller.signal);if(!alive.current || controller.signal.aborted)return;
      setFeedback(current=>({...current,[question]:{question,action,suggestion}}));setNotices(current=>({...current,[question]:'Feedback saved. Thank you!'}));retries.current.delete(question);
      setSelected(current=>({...current,[question]:null}));setDrafts(current=>({...current,[question]:''}));
      timers.current.set(question,setTimeout(()=>{timers.current.delete(question);if(alive.current)setNotices(current=>({...current,[question]:''}));},4000));
    }catch(error){if(alive.current && !controller.signal.aborted)setErrors(current=>({...current,[question]:error.response?.data?.error || 'Feedback was not saved. Please retry.'}));}
    finally{if(writes.current.get(question)===controller)writes.current.delete(question);if(alive.current && !controller.signal.aborted)setPending(current=>({...current,[question]:false}));}
  };
  const choose=(question,action)=>{if(writes.current.has(question))return;clearTimeout(timers.current.get(question));timers.current.delete(question);setNotices(current=>({...current,[question]:''}));setErrors(current=>({...current,[question]:''}));setSelected(current=>({...current,[question]:action}));if(action==='helpful')void save(question,action);};
  const view=question=>{if(viewed.current.has(question))return;viewed.current.add(question);void recordManualFaq({question,action:'view',client_key:crypto.randomUUID()},read.current?.signal).catch(()=>viewed.current.delete(question));};
  return {feedback,selected,drafts,pending,errors,notices,loadError,reload:load,choose,view,retry:question=>save(question,selected[question],drafts[question] ?? ''),setDraft:(question,value)=>setDrafts(current=>({...current,[question]:value})),saveSuggestion:question=>save(question,'not_helpful',drafts[question] ?? '')};
}
