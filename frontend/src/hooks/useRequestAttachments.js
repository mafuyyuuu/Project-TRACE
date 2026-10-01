import { useCallback, useEffect, useRef, useState } from 'react';
import { getAttachmentRequirements, saveAttachmentAction } from '@/services/requestAttachmentsService';
export default function useRequestAttachments(documentId) {
  const [rows, setRows] = useState([]), [loadedId, setLoadedId] = useState(null);
  const [error, setError] = useState(''), [success, setSuccess] = useState(''), [saving, setSaving] = useState(false);
  const [staged, setStaged] = useState(null);
  const owner = useRef(null), read = useRef(null), pending = useRef(false);
  const load = useCallback(async () => {
    const identity = owner.current;
    read.current?.abort(); const controller = new AbortController(); read.current = controller;
    try { const data = await getAttachmentRequirements(documentId, controller.signal); if (owner.current === identity && !controller.signal.aborted) { setRows(data); setError(''); } }
    catch (err) { if (owner.current === identity && !controller.signal.aborted) setError(err.response?.data?.error || 'Could not load attachment requirements. Try again.'); }
    finally { if (owner.current === identity && !controller.signal.aborted) setLoadedId(documentId); }
  }, [documentId]);
  useEffect(() => { const identity = Symbol('attachment request'); owner.current = identity; const controller = new AbortController(); queueMicrotask(() => { if (!controller.signal.aborted) { pending.current = false; setSaving(false); setStaged(null); setSuccess(''); void load(); } }); return () => { if (owner.current === identity) owner.current = null; controller.abort(); read.current?.abort(); }; }, [load]);
  const confirm = async () => {
    if (!staged || pending.current) return false;
    const identity = owner.current;
    pending.current = true; setSaving(true); setError(''); setSuccess('');
    try {
      await saveAttachmentAction(documentId, staged);
      if (owner.current === identity && identity) { setStaged(null); setSuccess('Attachment requirement saved.'); await load(); }
      return true;
    } catch (err) { if (owner.current === identity && identity) setError(err.response?.data?.error || 'Could not confirm saving. Check the request before retrying if your connection was interrupted.'); return false; }
    finally { if (owner.current === identity && identity) { pending.current = false; setSaving(false); } }
  };
  return { rows: loadedId === documentId ? rows : [], loading: loadedId !== documentId, error, success, saving, staged, stage: action => { if (!pending.current) setStaged(action); }, cancel: () => { if (!pending.current) setStaged(null); }, confirm, refresh: load };
}
