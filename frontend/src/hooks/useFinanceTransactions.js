import { useCallback, useEffect, useRef, useState } from 'react';
import { exportFinanceTransactions, getFinanceTransactions } from '@/services/financeService';
import {uploadReceiptCopy} from '@/services/receiptService';
import { uploadDeferredOR } from '@/services/documentsService';
import { EMPTY_FINANCE_FILTERS } from '@/utils/reportFilters';
import useElapsedClock from '@/hooks/useElapsedClock';
export default function useFinanceTransactions() {
  const [filters, setFilters] = useState(EMPTY_FINANCE_FILTERS);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ transactions: [], total: 0, amount: 0 });
  const [loadedKey, setLoadedKey] = useState(null), [loadFailed,setLoadFailed]=useState(false), [error, setError] = useState('');
  const [exporting, setExporting] = useState(false), [version, setVersion] = useState(0);
  const now = useElapsedClock();
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFeedback, setReceiptFeedback] = useState({ success: '', error: '' });
  const [uploadProgress,setUploadProgress]=useState(null);
  const uploadingRef = useRef(false);
  const exportingRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const requestKey = JSON.stringify({ filters, page, version });
  useEffect(() => {
    const controller = new AbortController();
    getFinanceTransactions(filters, page, controller.signal).then(result => { if (!controller.signal.aborted) { setData(result); setLoadFailed(false); setError(''); } })
      .catch(err => { if (!controller.signal.aborted) {setLoadFailed(true);setError(err.response?.data?.error || 'Could not load Finance transactions. Retry to refresh.');} })
      .finally(() => { if (!controller.signal.aborted) setLoadedKey(requestKey); });
    return () => controller.abort();
  }, [filters, page, requestKey]);
  const applyFilters = next => {setPage(1);setFilters({...EMPTY_FINANCE_FILTERS,...next});};
  const refresh = useCallback(() => setVersion(previous => previous + 1), []);
  const dismissReceiptFeedback = useCallback(() => setReceiptFeedback({ success: '', error: '' }), []);
  const uploadReceipt = async (doc, file, metadata) => {
    if (uploadingRef.current) return false;
    uploadingRef.current = true;
    setUploadingReceipt(true);
    dismissReceiptFeedback();
    try {
      setUploadProgress(0);
      if(doc.receipt_id)await uploadReceiptCopy(doc.receipt_id,file,setUploadProgress);
      else await uploadDeferredOR(doc.id, file, metadata);
      if (alive.current) {
        setReceiptFeedback({ success: 'Official Receipt copy uploaded. The document stage is unchanged.', error: '' });
        refresh();
      }
      return true;
    } catch (err) {
      if (alive.current) setReceiptFeedback({ success: '', error: err.response?.data?.error || 'Could not upload the Official Receipt copy.' });
      return false;
    } finally {
      uploadingRef.current = false;
      if (alive.current) setUploadingReceipt(false);
    }
  };
  const exportCsv = async () => {
    if (exportingRef.current || loadedKey !== requestKey || loadFailed) return;
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
  return { ...data, loadFailed, filters, applyFilters, page, setPage, loading: loadedKey !== requestKey, error, exporting, exportCsv, refresh, now,
    uploadProgress, uploadingReceipt, receiptFeedback, dismissReceiptFeedback, uploadReceipt };
}
