import Button from '@/components/Button';
export default function EmailVerificationNotice({ user, email = '', pendingEmail = '', sending, message, error, disabled, onVerify, children }) {
  const matchesSaved = email.trim().toLowerCase() === (user?.email || '').trim().toLowerCase();
  const verified = matchesSaved && Boolean(user?.email_verified_at);
  return <section aria-label="Verify email" className="min-w-0 space-y-2">
    <div id="tutorial-email" className="flex flex-wrap items-center gap-2">
      {children}
      {verified ? <span className="text-sm font-bold text-green-700 dark:text-green-300">Verified</span>
        : <Button type="button" disabled={disabled || sending || !email.trim()} onClick={onVerify}
          className="trace-button trace-button-primary shrink-0">{sending ? 'Sending…' : 'Verify'}</Button>}
    </div>
    {pendingEmail && <p className="text-sm break-words">Awaiting verification: <span className="select-text break-all">{pendingEmail}</span>. Your current address stays active until you open the link. Use Verify to resend.</p>}
    {!verified && <>
      <p className="text-xs break-words">{user?.role === 'student' ? 'Verify your email to make requests or payments.' : 'Verify your email.'} Link expires in 1 hour; check spam.</p>
      <details className="text-xs break-words">
        <summary className="trace-action trace-button-feedback w-fit cursor-pointer rounded font-semibold text-pine-700 hover:text-pine-600 dark:text-green-300 dark:hover:text-green-200">Verification help</summary>
        <p className="mt-2">Select Verify to resend after 60 seconds. Refresh TRACE after verifying.{user?.role === 'student' && ' Email verification is separate from ID approval.'}</p>
      </details>
    </>}
    {message && <p role="status" className="text-sm break-words">{message}</p>}{error && <p role="alert" className="text-sm break-words text-red-700 dark:text-red-300">{error}</p>}
  </section>;
}
