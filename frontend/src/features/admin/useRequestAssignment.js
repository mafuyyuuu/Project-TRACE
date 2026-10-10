import { useEffect, useRef, useState } from 'react';
import { getRequestAssignment, reassignRequest, reconcileRequestCollege } from '@/services/documentsService';

export default function useRequestAssignment(documentId, onSaved) {
  const [context, setContext] = useState(null), [error, setError] = useState('');
  const [staged, setStaged] = useState(null), [saving, setSaving] = useState(false);
  const pending = useRef(false), owner = useRef(null);
  useEffect(() => {
    const token = Symbol('assignment'), controller = new AbortController(); owner.current = token;
    getRequestAssignment(documentId, controller.signal).then(data => { if (!controller.signal.aborted) setContext(data); })
      .catch(err => { if (!controller.signal.aborted) setError(err.response?.data?.error || 'Could not load staff assignment. Close and reopen to retry.'); });
    return () => { owner.current = null; controller.abort(); };
  }, [documentId]);
  const confirm = async () => {
    if (!staged || pending.current) return;
    const token = owner.current; pending.current = true; setSaving(true); setError('');
    try {
      if (staged.kind === 'college') await reconcileRequestCollege(documentId, staged.payload);
      else await reassignRequest(documentId, staged.payload);
      if (owner.current === token) { setStaged(null); onSaved(); }
    } catch (err) { if (owner.current === token) setError(err.response?.data?.error || 'Could not confirm reassignment. Check the current assignment before retrying.'); }
    finally { if (owner.current === token) { pending.current = false; setSaving(false); } }
  };
  return { context, error, staged, saving, confirm, stage: setStaged, cancel: () => { if (!pending.current) setStaged(null); } };
}
