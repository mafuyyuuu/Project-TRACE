import { useRef, useState } from 'react';
import { issueStaffSetup } from '@/services/staffAuthenticatorSetupService';
export default function useStaffAuthenticatorSetup(userId) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function issue(password) {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError(''); setResult(null);
    try { setResult(await issueStaffSetup(userId, password)); return true; }
    catch (err) { setError(err.response?.data?.error || err.message || 'Could not issue setup code. Please retry.'); return false; }
    finally { pending.current = false; setBusy(false); }
  }
  return { result, error, busy, issue, discard: () => setResult(null) };
}
