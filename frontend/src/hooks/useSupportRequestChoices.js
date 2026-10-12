import { useEffect, useRef, useState } from 'react';
import { getMessageThreads } from '@/services/documentMessagesService';
import { PIPELINE, STATUS } from '@/utils/documentStatus';
export default function useSupportRequestChoices(user) {
  const [rows,setRows] = useState([]), [page,setPage] = useState(0), [hasMore,setHasMore] = useState(false), [error,setError] = useState(''), [busy,setBusy] = useState(false);
  const owner = useRef(null), pending = useRef(false);
  const load = async nextPage => {
    if (pending.current || !owner.current) return;
    const identity = owner.current; pending.current = true; setBusy(true);
    try {
      const data = await getMessageThreads(nextPage);
      if (identity !== owner.current) return;
      setRows(previous => [...new Map([...previous,...data.threads.filter(row => PIPELINE.includes(row.current_status) && row.current_status !== STATUS.COMPLETED)].map(row => [row.id,row])).values()]);
      setPage(nextPage); setHasMore(nextPage*20 < data.total); setError('');
    } catch { if (identity === owner.current) setError('Could not load open requests. Retry request choices.'); }
    finally { pending.current = false; if (identity === owner.current) setBusy(false); }
  };
  useEffect(() => { const identity = {}; owner.current = identity; queueMicrotask(() => { if (owner.current === identity) void load(1); }); return () => { owner.current = null; }; }, [user.id,user.role]);
  return { rows,hasMore,error,busy,more: () => load(page+1),retry: () => load(Math.max(1,page)) };
}
