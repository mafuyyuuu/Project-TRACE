import { useEffect, useState } from 'react';
import { getDocumentDetail } from '@/services/documentsService';

/** Read on open/refresh, cancelling obsolete requests when the selected case changes. */
export default function useLiveTracking(selectedDoc) {
  const id = selectedDoc?.id;
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ id, requestKey: null, data: null, error: '', denied: false });
  if (result.id !== id) setResult({ id, requestKey: null, data: null, error: '', denied: false });
  const requestKey = `${id}:${selectedDoc?.current_status}:${attempt}`;
  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController();
    let active = true;
    getDocumentDetail(id, controller.signal).then(data => {
      if (active) setResult({ id, requestKey, data, error: '', denied: false });
    }).catch(error => {
      if (!active) return;
      const denied = [403, 404].includes(error.response?.status);
      setResult(previous => ({ id, requestKey, denied, data: !denied && previous.id === id ? previous.data : null,
        error: denied ? 'This request is no longer available. Close the tracker or retry.' : 'Could not refresh tracking history. Showing the last saved status; retry to check for updates.' }));
    });
    return () => { active = false; controller.abort(); };
  }, [id, requestKey]);
  const data = result.id === id ? result.data : null;
  return {
    document: selectedDoc && !(result.id === id && result.denied) ? { ...selectedDoc, ...data?.document, step_logs: data?.step_logs || selectedDoc.step_logs } : null,
    loading: Boolean(id && result.requestKey !== requestKey),
    error: result.id === id && (result.denied || result.requestKey === requestKey) ? result.error : '',
    refresh: () => setAttempt(value => value + 1),
  };
}
