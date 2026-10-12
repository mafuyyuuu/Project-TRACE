import { useEffect, useState } from 'react';
import { matchSupportFaq } from '@/services/supportTicketsService';
export default function useSupportFaqSuggestions(query,topics) {
  const [result,setResult]=useState({query:'',matches:[],error:''});
  useEffect(()=>{
    if(!query.trim()) return;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      matchSupportFaq(query,controller.signal).then(rows=>{if(!controller.signal.aborted)setResult({query,matches:rows,error:''});}).catch(()=>{if(!controller.signal.aborted)setResult({query,matches:[],error:'FAQ matching is unavailable. Browse the suggested topics or choose Talk to staff.'});});
    },150);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query]);
  const current=result.query===query;
  const error=current ? result.error : '';
  return {topics:!query.trim() || !current || error ? topics : result.matches,error};
}
