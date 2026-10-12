import { useEffect, useRef, useState } from 'react';
import { getSupportingDocuments, saveSupportingDocument } from '@/services/supportTicketsService';
export default function useSupportingDocuments() {
  const [types,setTypes] = useState([]), [error,setError] = useState(''), [loading,setLoading] = useState(true), [busy,setBusy] = useState(false);
  const alive = useRef(false), pending = useRef(false);
  const load = async signal => {
    try { const result = await getSupportingDocuments(signal); if(alive.current && !signal?.aborted) {setTypes(result);setError('');} }
    catch(err) { if(alive.current && !signal?.aborted) setError(err.response?.data?.error || 'Could not load supporting-document types. Retry.'); }
    finally { if(alive.current && !signal?.aborted) setLoading(false); }
  };
  useEffect(() => { alive.current=true;const controller=new AbortController();queueMicrotask(()=>{if(!controller.signal.aborted)void load(controller.signal);});return () => {alive.current=false;controller.abort();}; },[]);
  const save = async payload => {
    if(pending.current) return false;pending.current=true;setBusy(true);setError('');
    try { const result=await saveSupportingDocument(payload);if(alive.current) setTypes(result);return true; }
    catch(err) { if(alive.current) setError(err.response?.data?.error || 'Could not confirm saving. Keep your draft and retry.');return false; }
    finally {pending.current=false;if(alive.current) setBusy(false);}
  };
  return {types,error,loading,busy,save,retry:()=>load()};
}
