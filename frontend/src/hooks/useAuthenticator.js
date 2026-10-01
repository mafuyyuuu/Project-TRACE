import { useEffect, useRef, useState } from 'react';
import { getAuthenticator, beginAuthenticator, updateAuthenticator } from '@/services/authenticatorService';
import { disconnectRealtime } from '@/services/realtimeService';

export default function useAuthenticator(userId) {
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [attempt, setAttempt] = useState(0);
  const pending = useRef(false);
  const lifetime = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    const instance = {}; lifetime.current = instance;
    getAuthenticator(controller.signal).then(result => {
      if (lifetime.current === instance) { setStatus(result); setError(''); }
    }).catch(err => {
      if (lifetime.current === instance) setError(err.response?.data?.error || 'Could not load authenticator settings. Retry to check your security status.');
    });
    return () => { lifetime.current = null; controller.abort(); };
  }, [userId, attempt]);
  async function run(action, payload) {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError(''); setNotice('');
    const instance = lifetime.current;
    try {
      if (action === 'setup') {
        const result = await beginAuthenticator(payload.current_password);
        if (lifetime.current === instance) setSetup(result);
      } else {
        const result = await updateAuthenticator(action, payload);
        // The committed server mutation revoked the old session. Adopt the new
        // authenticated session even if the settings panel closed while waiting.
        localStorage.setItem('trace_token', result.token);
        localStorage.setItem('trace_user', JSON.stringify(result.user));
        disconnectRealtime();
        window.dispatchEvent(new CustomEvent('trace-user-updated', { detail: result.user }));
        if (lifetime.current === instance) {
          setSetup(null); setCodes(result.recovery_codes || []);
          setStatus({ enabled: result.enabled, available: true, recovery_codes_remaining: result.recovery_codes?.length || 0 });
          setNotice(action === 'disable' ? 'Authenticator disabled. Staff login verification still applies.' : 'Authenticator settings updated. Older sessions and trusted browsers were revoked.');
        }
      }
      return true;
    } catch (err) {
      if (lifetime.current === instance) setError(err.response?.data?.error || err.message || 'Could not update authenticator settings. Please retry.');
      return false;
    } finally {
      pending.current = false;
      if (lifetime.current === instance) setBusy(false);
    }
  }
  return { status, setup, codes, busy, error, notice, run,
    retry: () => setAttempt(value => value + 1),
    discardSetup: () => { setSetup(null); setError(''); },
    acknowledgeCodes: () => setCodes([]) };
}
