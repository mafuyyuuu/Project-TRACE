import useDataRefresh from '@/hooks/useDataRefresh';
import { useCallback, useEffect, useState } from 'react';
import { receiptState, receiptError } from '@/services/receiptService';
/** Refresh pack state after changes and when the clerk returns to the page. */
export default function useReceiptPack() {
  const [state, setState] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    let active = true;
    receiptState().then(value => {
      if (active) { setState(value); setError(''); }
    }).catch(err => {
      if (active) { setState(null); setError(receiptError(err)); }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    const onVisible = () => { if (!document.hidden) refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);
  useDataRefresh(["receipts"], refresh, true);

  return { state, error, loading, refresh };
}
