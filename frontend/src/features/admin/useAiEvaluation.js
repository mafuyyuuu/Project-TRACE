import { useCallback, useEffect, useRef, useState } from 'react';
import { getAiEvaluation } from '@/services/reportsService';

export default function useAiEvaluation() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cohort, setCohort] = useState('all');
  const request = useRef(null);
  const load = useCallback(async (params = {}) => {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError('');
    try {
      const result = await getAiEvaluation(params, controller.signal);
      if (!controller.signal.aborted) setData(result);
    } catch (err) {
      if (!controller.signal.aborted) setError(err.response?.data?.error || 'Could not load AI evaluation. Retry when the API is available.');
    } finally {
      if (!controller.signal.aborted) { request.current = null; setLoading(false); }
    }
  }, []);
  useEffect(() => {
    // Async initial load, with cancellation on unmount (including Strict Mode).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => { request.current?.abort(); request.current = null; };
  }, [load]);
  return { data, loading, error, endDate, setEndDate, cohort, setCohort,
    evaluate: event => { event.preventDefault(); load({ ...(endDate ? { endDate } : {}), cohort }); } };
}
