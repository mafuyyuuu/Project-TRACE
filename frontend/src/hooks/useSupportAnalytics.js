import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupportMetrics } from '@/services/supportTicketsService';
export default function useSupportAnalytics() {
  const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const alive=useRef(false),read=useRef(null);
  const load=useCallback(async filters=>{
    read.current?.abort();const controller=new AbortController();read.current=controller;setLoading(true);
    try{const result=await getSupportMetrics(filters,controller.signal);if(alive.current && !controller.signal.aborted){setData(result);setError('');}}
    catch(err){if(alive.current && !controller.signal.aborted)setError(err.response?.data?.error || 'Support analytics could not load. Retry the report.');}
    finally{if(alive.current && !controller.signal.aborted)setLoading(false);}
  },[]);
  useEffect(()=>{alive.current=true;queueMicrotask(()=>{if(alive.current)void load({});});return()=>{alive.current=false;read.current?.abort();};},[load]);
  return{data,error,loading,load};
}
