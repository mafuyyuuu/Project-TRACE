import { useCallback, useEffect, useRef, useState } from 'react';
import { exportFinanceTransactions, getFinanceTransactions } from '@/services/financeService';
export default function useFinanceTransactions() {
  const [filters, setFilters] = useState({ from: '', to: '', receipt: 'all' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ transactions: [], total: 0, amount: 0 });
  const [loadedKey, setLoadedKey] = useState(null), [error, setError] = useState('');
  const [exporting, setExporting] = useState(false), [version, setVersion] = useState(0);
  const [now, setNow] = useState(Date.now);
  const exportingRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const requestKey = JSON.stringify({ filters, page, version });
  useEffect(() => {
    const controller = new AbortController();
    getFinanceTransactions(filters, page, controller.signal).then(result => { if (!controller.signal.aborted) { setData(result); setError(''); } })
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.error || 'Could not load Finance transactions. Retry to refresh.'); })
      .finally(() => { if (!controller.signal.aborted) setLoadedKey(requestKey); });
    return () => controller.abort();
  }, [filters, page, requestKey]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const updateFilter = (key, value) => { setPage(1); setFilters(previous => ({ ...previous, [key]: value })); };
  const refresh = useCallback(() => setVersion(previous => previous + 1), []);
  const exportCsv = async () => {
    if (exportingRef.current) return;
    exportingRef.current = true; setExporting(true); setError('');
    try {
      const blob = await exportFinanceTransactions(filters);
      if (!alive.current) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = 'trace-finance-transactions.csv';
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) { if (alive.current) setError(err.response?.data?.error || 'Could not export. Narrow the date range or try again.'); }
    finally { exportingRef.current = false; if (alive.current) setExporting(false); }
  };
  return { ...data, filters, updateFilter, page, setPage, loading: loadedKey !== requestKey, error, exporting, exportCsv, refresh, now };
}
