import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthShell from '@/components/AuthShell'
import usePasswordReset from '@/hooks/usePasswordReset'

/**
 * Step 2 of recovery: choose a new password using the single-use token carried
 * in the emailed link's query string.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordToConfirm, setPasswordToConfirm] = useState(null)
  const [localError, setLocalError] = useState('')
  const { loading, error: resetError, message, done, submitNewPassword } = usePasswordReset()

  const handleSubmit = (e) => {
    e.preventDefault()
    setLocalError('')
    if (!token) { setLocalError('This reset link is missing its token. Please request a new one.'); return }
    if (password.length < 8) { setLocalError('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setLocalError('The two passwords do not match.'); return }
    setPasswordToConfirm({ token, password, confirmPassword })
  }

  const field =
    'w-full px-5 py-4 rounded-xl bg-white/10 dark:bg-gray-900/10 border border-white/30 text-white placeholder-white/50 font-medium focus:outline-none focus:ring-2 focus:ring-white/60'

  const error = localError || resetError

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick a password of at least 8 characters. This link works only once."
      footer={
        <Link to="/" className="text-sm font-medium text-white/90 hover:text-white hover:underline">
          Back to Login
        </Link>
      }
    >
      <ConfirmDialog open={!!passwordToConfirm && !done} title="Confirm Password Reset"
        message={['Save this new password?', error ? <span role="alert">{error}</span> : null]}
        confirmLabel="Reset Password" loading={loading}
        onConfirm={() => submitNewPassword(passwordToConfirm.token, passwordToConfirm.password, passwordToConfirm.confirmPassword)}
        onCancel={() => setPasswordToConfirm(null)} />
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-900/40 dark:bg-red-900/40 border border-red-300/40 dark:border-red-800/40 text-sm font-bold">
          {error}
        </div>
      )}

      {done ? (
        <div className="p-4 rounded-xl bg-white/10 dark:bg-gray-900/10 border border-white/30 text-sm font-bold leading-relaxed">
          {message}{' '}
          <Link to="/" className="underline hover:text-white">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="password" className="block text-sm font-bold mb-2 uppercase tracking-wide">
            New Password
          </label>
          <input maxLength={INPUT_LIMITS.password}
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />

          <label
            htmlFor="confirmPassword"
            className="block text-sm font-bold mt-5 mb-2 uppercase tracking-wide"
          >
            Confirm New Password
          </label>
          <input maxLength={INPUT_LIMITS.password}
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={field}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-5 bg-[#f8f9fa] dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-black text-xl sm:text-2xl rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-lg uppercase tracking-wide"
          >
            {loading ? 'Saving…' : 'Set New Password'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
