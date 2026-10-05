import { useEffect, useRef, useState } from 'react';
import { getRequirementHistory } from '@/services/requestAttachmentsService';
export default function useRequirementHistory(context) {
  const [data,setData]=useState({events:[],next_cursor:null}),[error,setError]=useState(''),[loading,setLoading]=useState(false),[open,setOpen]=useState(false);
  const owner=useRef(null),request=useRef(null);
  const {ticketId,documentId,requirementId}=context;
  useEffect(()=>{const identity=Symbol('requirement history');owner.current=identity;return()=>{owner.current=null;request.current?.abort();};},[ticketId,documentId,requirementId]);
  const load=async before=>{
    if(request.current) return;
    const identity=owner.current,controller=new AbortController();request.current=controller;
    setOpen(true);setLoading(true);setError('');
    try {
      const next=await getRequirementHistory({ticketId,documentId,requirementId,before},controller.signal);
      if(owner.current===identity) setData(previous=>({...next,events:before ? [...new Map([...previous.events,...next.events].map(event=>[event.id,event])).values()] : next.events}));
    } catch(err){if(owner.current===identity && !controller.signal.aborted)setError(err.response?.data?.error || 'Could not load requirement history. Try again.');}
    finally{if(owner.current===identity){request.current=null;setLoading(false);}}
  };
  return {...data,open,loading,error,load,close:()=>setOpen(false)};
}
