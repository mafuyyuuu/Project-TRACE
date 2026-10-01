import useEmailVerification from '@/hooks/useEmailVerification';
export default function EmailVerificationNotice({ user }) {
  const { sending, message, error, send } = useEmailVerification();
  if (user?.email_verified_at !== null) return null;
  return <section aria-label="Verify email" className="rounded-2xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 p-4 space-y-3">
    <h3 className="font-bold">Verify your email address</h3>
    <p className="text-sm break-words">Open the one-click verification link sent to <span className="select-text break-all">{user.email}</span>. Students must verify before making requests or payments. Your ID approval is checked separately.</p>
    <button type="button" disabled={sending} onClick={send} className="rounded-xl bg-green-700 text-white px-4 py-2 disabled:opacity-50">{sending ? 'Sending…' : 'Verify Email / Resend Link'}</button>
    <p className="text-sm">After verifying, refresh TRACE. Check your spam folder. Links expire in one hour; resend is limited to once per minute.</p>
    {message && <p role="status" className="text-sm">{message}</p>}{error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}
