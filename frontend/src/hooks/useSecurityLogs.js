import useDataRefresh from '@/hooks/useDataRefresh';
import { useEffect, useState } from 'react';
import { getSecurityLogs } from '@/services/authService';

export default function useSecurityLogs(enabled, userId) {
  const [logs, setLogs] = useState([]);
  const [revision,setRevision] = useState(0);
  useDataRefresh(['accounts','profile'],()=>setRevision(value=>value+1),enabled);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    getSecurityLogs(controller.signal).then(data => {
      if (!controller.signal.aborted) setLogs(data);
    }).catch(() => {});
    return () => controller.abort();
  }, [enabled, userId, revision]);
  return logs;
}
