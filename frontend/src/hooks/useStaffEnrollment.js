import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { startStaffSetup, confirmStaffSetup } from '@/services/staffAuthenticatorSetupService';
import { forgetBrowserTrustPreference } from '@/utils/browserTrustPreference';
import { disconnectRealtime } from '@/services/realtimeService';
export default function useStaffEnrollment() {
  const [setup, setSetup] = useState(null), [codes, setCodes] = useState([]);
  const [qr, setQr] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const pending = useRef(false), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let current = true;
    if (setup) QRCode.toDataURL(setup.provisioning_uri, { width: 240, margin: 2 }).then(value => { if (current) setQr(value); }).catch(() => {});
    return () => { current = false; };
  }, [setup]);
  async function run(payload, confirm = false) {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError('');
    try {
      const result = await (confirm ? confirmStaffSetup(payload) : startStaffSetup(payload));
      if (confirm) {
        forgetBrowserTrustPreference(); disconnectRealtime();
        localStorage.setItem('trace_token', result.token); localStorage.setItem('trace_user', JSON.stringify(result.user));
        if (mounted.current) { setCodes(result.recovery_codes); setSetup(null); setQr(''); }
      } else if (mounted.current) { setSetup(result); setQr(''); }
      return true;
    } catch (err) {
      if (mounted.current) setError(err.response?.data?.error || err.message || 'Could not verify staff setup. Ask Admin for help.');
      return false;
    } finally { pending.current = false; if (mounted.current) setBusy(false); }
  }
  return { setup, codes, qr, busy, error, run, restart: () => { setSetup(null); setQr(''); setError(''); } };
}
