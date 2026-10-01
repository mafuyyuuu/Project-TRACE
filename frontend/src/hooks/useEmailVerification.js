import { useRef, useState } from 'react';
import { resendVerification } from '@/services/emailVerificationService';
export default function useEmailVerification() {
  const busy = useRef(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const reset = () => { setError(''); setMessage(''); };
  const send = async (options = {}) => {
    if (busy.current) return null;
    busy.current = true; setSending(true); setError(''); setMessage('');
    try {
      const result = await resendVerification(options);
      if (result.email_sent === false) setError(result.message); else setMessage(result.message);
      return result;
    } catch (err) { setError(err.response?.data?.error || 'Could not send the link. Retry when connected.'); return null; }
    finally { busy.current = false; setSending(false); }
  };
  return { sending, message, error, send, reset };
}
