import { useCallback,useEffect,useState } from 'react';
import { getReportFilterOptions } from '@/services/reportsService';
export default function useReportFilterOptions(enabled = true) {
  const [options,setOptions]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[version,setVersion]=useState(0);
  useEffect(()=>{
    if(!enabled) return;
    const controller=new AbortController();
    getReportFilterOptions(controller.signal).then(data=>{if(!controller.signal.aborted){setOptions(data);setError('');}}).catch(err=>{if(!controller.signal.aborted)setError(err.response?.data?.error||'Could not load filter options.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return ()=>controller.abort();
  },[version,enabled]);
  const retry=useCallback(()=>{setLoading(true);setVersion(value=>value+1);},[]);
  return {options,loading,error,retry};
}
