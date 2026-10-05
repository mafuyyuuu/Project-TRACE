import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
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
        <div className="trace-error mb-6">
          {error}
        </div>
      )}

      {done ? (
        <div className="trace-section trace-section-inverse trace-section-body text-sm font-bold leading-relaxed">
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="identifier" className="trace-label trace-label-inverse block mb-2">
            Student ID / Staff ID or Email
          </label>
          <input maxLength={INPUT_LIMITS.email}
            id="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="STU2024001"
            className="trace-control trace-control-inverse w-full placeholder-white/50"
          />

          <Button
            type="submit"
            disabled={loading}
            className="trace-button trace-button-inverse-primary mt-6 w-full"
          >
            {loading ? 'Sending…' : 'Send Reset Link'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
