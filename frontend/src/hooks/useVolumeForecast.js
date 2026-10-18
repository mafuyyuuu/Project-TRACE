import {useCallback,useEffect,useRef,useState} from 'react';
import {getForecast} from '@/services/documentsService';
import useDataRefresh from '@/hooks/useDataRefresh';
export default function useVolumeForecast(enabled) {
  const [filter,setFilter]=useState('All'),[state,setState]=useState({forecast:[],document_types:[],loading:true});
  const read=useRef(null);
  const load=useCallback(async()=>{
    read.current?.abort();const controller=new AbortController();read.current=controller;
    setState(previous=>({...previous,forecast:[],history:[],history_days:undefined,sample_size:undefined,source:undefined,as_of:undefined,loading:true,error:''}));
    try {
      const result=await getForecast(filter,controller.signal);
      if(!controller.signal.aborted)setState(previous=>({...result,document_types:result.document_types || previous.document_types,forecast:result.forecast || [],loading:false}));
    } catch {
      if(!controller.signal.aborted)setState(previous=>({...previous,forecast:[],loading:false,error:'Forecast unavailable. Refresh to retry; no volume is inferred.'}));
    }
  },[filter]);
  useEffect(()=>{let active=true;queueMicrotask(()=>{if(active && enabled)void load();});return()=>{active=false;read.current?.abort();};},[enabled,load]);
  useDataRefresh(['documents','reference'],load,enabled);
  return{...state,filter,setFilter,refresh:load};
}
