export default function EmailVerificationNotice({ user, email = '', pendingEmail = '', sending, message, error, disabled, onVerify, children }) {
  const matchesSaved = email.trim().toLowerCase() === (user?.email || '').trim().toLowerCase();
  const verified = matchesSaved && Boolean(user?.email_verified_at);
  return <section aria-label="Verify email" className="min-w-0 space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {verified ? <span className="text-sm font-bold text-green-700 dark:text-green-300">Verified</span>
        : <button type="button" disabled={disabled || sending || !email.trim()} onClick={onVerify}
          className="shrink-0 rounded-xl bg-green-700 text-white px-4 py-3 disabled:opacity-50">{sending ? 'Sending…' : 'Verify'}</button>}
    </div>
    {pendingEmail && <p className="text-sm break-words">Awaiting verification: <span className="select-text break-all">{pendingEmail}</span>. Your current address stays active until you open the link. Use Verify to resend.</p>}
    {!verified && <p className="text-xs break-words">Verify sends a one-click email link. Check your spam folder. Links expire in one hour; resend once per minute. Refresh TRACE after verifying.{user?.role === 'student' && ' Verify before making requests or payments; ID approval is separate.'}</p>}
    {message && <p role="status" className="text-sm break-words">{message}</p>}{error && <p role="alert" className="text-sm break-words text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}
