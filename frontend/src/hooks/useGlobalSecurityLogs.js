import { useEffect, useState } from 'react';
import { getGlobalSecurityLogs } from '@/services/authService';
import useDataRefresh from '@/hooks/useDataRefresh';

export default function useGlobalSecurityLogs() {
  const [revision,setRevision] = useState(0);
  const [state,setState] = useState({logs:[],loading:true,error:''});
  useDataRefresh(['accounts','documents','profile','reference','support','graduate','receipts','templates'],()=>setRevision(value=>value+1));
  useEffect(()=>{
    const controller = new AbortController();
    getGlobalSecurityLogs(controller.signal).then(logs=>{
      if (!controller.signal.aborted) setState({logs,loading:false,error:''});
    }).catch(()=>{
      if (!controller.signal.aborted) setState(current=>({...current,loading:false,error:'Could not load security activity. Retry to check for updates.'}));
    });
    return ()=>controller.abort();
  },[revision]);
  return {...state,retry:()=>setRevision(value=>value+1)};
}
