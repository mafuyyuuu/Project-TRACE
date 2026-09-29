import ConfirmDialog from '@/components/ConfirmDialog'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '@/components/AuthShell'
import usePasswordReset from '@/hooks/usePasswordReset'

/**
 * Step 1 of recovery: ask for an identifier and have a reset link emailed.
 *
 * The confirmation is deliberately non-committal about whether the account
 * exists — see usePasswordReset.
 */
export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('')
  const [identifierToConfirm, setIdentifierToConfirm] = useState(null)
  const [localError, setLocalError] = useState('')
  const { loading, error: requestError, message, done, requestLink } = usePasswordReset()

  const handleSubmit = (e) => {
    e.preventDefault()
    setLocalError('')
    if (!identifier.trim()) { setLocalError('Enter your Student ID / Staff ID or your email address.'); return }
    setIdentifierToConfirm(identifier.trim())
  }

  const error = localError || requestError

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your Student ID, Staff ID, or the email address on your account and we'll send you a link to choose a new password."
      footer={
        <Link to="/" className="text-sm font-medium text-white/90 hover:text-white hover:underline">
          Back to Login
        </Link>
      }
    >
      <ConfirmDialog open={identifierToConfirm !== null && !done} title="Confirm Password Reset Request"
        message={['Request a password reset link?', error ? <span role="alert">{error}</span> : null]}
        confirmLabel="Request Link" loading={loading} onConfirm={() => requestLink(identifierToConfirm)}
        onCancel={() => setIdentifierToConfirm(null)} />
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-900/40 dark:bg-red-900/40 border border-red-300/40 dark:border-red-800/40 text-sm font-bold">
          {error}
        </div>
      )}

      {done ? (
        <div className="p-4 rounded-xl bg-white/10 dark:bg-gray-900/10 border border-white/30 text-sm font-bold leading-relaxed">
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="identifier" className="block text-sm font-bold mb-2 uppercase tracking-wide">
            Student ID / Staff ID or Email
          </label>
          <input
            id="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="STU2024001"
            className="w-full px-5 py-4 rounded-xl bg-white/10 dark:bg-gray-900/10 border border-white/30 text-white placeholder-white/50 font-medium focus:outline-none focus:ring-2 focus:ring-white/60"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full py-5 bg-[#f8f9fa] dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-black text-xl sm:text-2xl rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-lg uppercase tracking-wide"
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
