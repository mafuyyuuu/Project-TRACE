import { useEffect, useRef } from 'react';
import { subscribeDataChanges } from '@/services/dataChanges';

/** Coalesce successful writes without remounting forms or clearing their drafts. */
export default function useDataRefresh(resources, refresh, active = true) {
  const callback = useRef(refresh);
  useEffect(() => { callback.current = refresh; }, [refresh]);
  const key = [...resources].sort().join(',');
  useEffect(() => {
    if (!active) return;
    const wanted = new Set(key.split(','));
    let timer;
    const unsubscribe = subscribeDataChanges(changed => {
      if (!changed.some(resource => wanted.has(resource))) return;
      clearTimeout(timer);
      timer = setTimeout(() => { void Promise.resolve().then(() => callback.current()).catch(() => {}); }, 40);
    });
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [key, active]);
}
