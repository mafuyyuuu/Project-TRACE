import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '@/components/AuthShell';
import { confirmVerification } from '@/services/emailVerificationService';
export default function VerifyEmailPage() {
  const token = useRef(new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const operation = useRef(null);
  const [result, setResult] = useState(null);
  const hasSession = Boolean(localStorage.getItem('trace_token'));
  useEffect(() => {
    // Strip the capability from history; StrictMode subscribes to one operation.
    window.history.replaceState(null, '', window.location.pathname);
    operation.current ||= token.current ? confirmVerification(token.current) : Promise.reject(new Error('This link has no verification token. Request a new link from TRACE.'));
    let active = true;
    operation.current.then(data => { if (active) setResult({ message: data.message }); }, error => {
      if (active) setResult({ error: error.response?.data?.error || error.message || 'Verification failed. Request a new link.' });
    });
    return () => { active = false; };
  }, []);
  return <AuthShell title="TRACE Email Verification" subtitle="Confirming your email address" footer={
    <Link to={hasSession ? '/dashboard' : '/'} className="trace-button trace-button-inverse-primary trace-button-feedback">
      {hasSession ? 'Return to TRACE' : 'Back to Login'}
    </Link>
  }>
    {!result && <p role="status">Verifying…</p>}
    {result?.message && <p role="status">{result.message}</p>}
    {result?.error && <p role="alert">{result.error}</p>}
  </AuthShell>;
}
