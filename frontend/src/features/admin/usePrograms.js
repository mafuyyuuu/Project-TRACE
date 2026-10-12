import { useEffect, useRef, useState } from 'react';
import { getPrograms, createProgram, setProgramActive } from '@/services/maintenanceService';

export default function usePrograms() {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  const live = useRef(false);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    getPrograms({ signal: controller.signal, timeout: 15000 }).then(data => {
      if (!Array.isArray(data?.programs)) throw new Error('Invalid program response');
      if (current) { setPrograms(data.programs); setLoadError(''); }
    }).catch(() => { if (current) setLoadError('Programs could not be loaded. Retry to see the current catalog.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [revision]);
  const run = async action => {
    if (pending.current) return false;
    pending.current = true;
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await action();
      if (live.current) { setSuccess(result.message); setLoading(true); setRevision(value => value + 1); }
      return true;
    } catch (err) {
      if (live.current) setError(err?.response?.data?.error || 'Program change failed. Your draft is preserved; try again.');
      return false;
    } finally { pending.current = false; if (live.current) setSaving(false); }
  };
  return { programs, loading, saving, error, loadError, success, retry: () => { setLoadError(''); setLoading(true); setRevision(value => value + 1); },
    dismiss: () => { setError(''); setSuccess(''); }, create: payload => run(() => createProgram(payload)), toggle: item => run(() => setProgramActive(item.id, !Number(item.is_active))) };
}
