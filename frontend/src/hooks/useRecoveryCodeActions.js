import { useEffect, useMemo, useRef, useState } from 'react';
import { downloadRecoveryCodes } from '@/utils/downloadRecoveryCodes';

export default function useRecoveryCodeActions(codes) {
  // Feedback belongs to this code set. Retain only an opaque scope/count.
  const scope = useMemo(() => ({ count: codes.length }), [codes]);
  const lifetime = useRef(null);
  const pending = useRef(null);
  const [feedback, setFeedback] = useState(null);
  useEffect(() => {
    lifetime.current = scope;
    return () => {
      lifetime.current = null;
      if (pending.current === scope) pending.current = null;
    };
  }, [scope]);

  async function copy() {
    if (!scope.count || lifetime.current !== scope || pending.current === scope) return;
    pending.current = scope;
    setFeedback({ scope, busy: true });
    try {
      if (!navigator.clipboard?.writeText) {
        setFeedback({ scope, error: 'Clipboard access is unavailable in this browser. Download the recovery codes instead, or select and copy them manually.' });
        return;
      }
      await navigator.clipboard.writeText(codes.join('\n'));
      if (lifetime.current === scope) setFeedback({ scope, notice: 'Recovery codes copied. Save them somewhere private.' });
    } catch {
      if (lifetime.current === scope) setFeedback({ scope, error: 'Could not copy recovery codes. Allow clipboard access and try again, or download the codes.' });
    } finally {
      if (pending.current === scope) pending.current = null;
    }
  }

  function download() {
    if (!scope.count || lifetime.current !== scope || pending.current === scope) return;
    try {
      downloadRecoveryCodes(codes);
      setFeedback({ scope, notice: 'Recovery-code download started. Check your browser’s downloads to confirm it completed.' });
    } catch {
      setFeedback({ scope, error: 'Could not start the download. Try again, or copy the recovery codes and save them privately.' });
    }
  }

  const current = feedback?.scope === scope ? feedback : null;
  return { copy, download, busy: Boolean(current?.busy), error: current?.error || '', notice: current?.notice || '' };
}
