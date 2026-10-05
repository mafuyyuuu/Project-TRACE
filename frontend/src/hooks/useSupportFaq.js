import { useEffect, useState } from 'react';
import { getSupportFaq } from '@/services/supportTicketsService';
export default function useSupportFaq() {
  const [topics,setTopics]=useState([]),[error,setError]=useState('');
  useEffect(()=>{
    const controller=new AbortController();
    getSupportFaq(controller.signal).then(result=>{if(!controller.signal.aborted)setTopics(result);}).catch(()=>{if(!controller.signal.aborted)setError('Approved support FAQs are unavailable. Refresh or contact the Registrar.');});
    return()=>controller.abort();
  },[]);
  return {topics,error};
}
