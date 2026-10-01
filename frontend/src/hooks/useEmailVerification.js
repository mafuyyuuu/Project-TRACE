import { useRef, useState } from 'react';
import { resendVerification } from '@/services/emailVerificationService';
export default function useEmailVerification() {
  const busy = useRef(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const send = async () => {
    if (busy.current) return;
    busy.current = true; setSending(true); setError(''); setMessage('');
    try {
      const result = await resendVerification();
      if (result.email_sent === false) setError(result.message); else setMessage(result.message);
    } catch (err) { setError(err.response?.data?.error || 'Could not send the link. Retry when connected.'); }
    finally { busy.current = false; setSending(false); }
  };
  return { sending, message, error, send };
}
