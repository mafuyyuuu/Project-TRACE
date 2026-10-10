import Button from '@/components/Button';
import PasswordVisibilityButton from '@/components/PasswordVisibilityButton';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog'
import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import AuthShell from '@/components/AuthShell'
import usePasswordReset from '@/hooks/usePasswordReset'
import { PASSWORD_REQUIREMENTS, validNewPassword } from '@/utils/passwordPolicy'

/**
 * Step 2 of recovery: choose a new password using the single-use token carried
 * in the emailed link's query string.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = useRef(searchParams.get('token') || new URLSearchParams(window.location.hash.slice(1)).get('token') || '').current
  useEffect(() => { window.history.replaceState(null, '', window.location.pathname) }, [])

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordToConfirm, setPasswordToConfirm] = useState(null)
  const [localError, setLocalError] = useState('')
  const { loading, error: resetError, message, done, submitNewPassword } = usePasswordReset()

  const handleSubmit = (e) => {
    e.preventDefault()
    setLocalError('')
    if (!token) { setLocalError('This reset link is missing its token. Please request a new one.'); return }
    if (password !== confirmPassword) { setLocalError('The two passwords do not match.'); return }
    if (!validNewPassword(password)) { setLocalError(PASSWORD_REQUIREMENTS); return }
    setPasswordToConfirm({ token, password, confirmPassword })
  }

  const field =
    "trace-control trace-control-inverse w-full placeholder-white/50"

  const error = localError || resetError

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={`${PASSWORD_REQUIREMENTS} This link works only once.`}
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
        <div className="trace-error mb-6">
          {error}
        </div>
      )}

      {done ? (
        <div className="trace-section trace-section-inverse trace-section-body text-sm font-bold leading-relaxed">
          {message}{' '}
          <Link to="/" className="underline hover:text-white">
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="password" className="trace-label trace-label-inverse block mb-2">
            New Password
          </label>
          <div className="relative"><input maxLength={INPUT_LIMITS.password}
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${field} pr-14`}
            disabled={loading}
          />
          <PasswordVisibilityButton visible={showPassword} onToggle={() => setShowPassword(value => !value)} controls="password" label="new password" disabled={loading} inverse /></div>

          <label
            htmlFor="confirmPassword"
            className="trace-label trace-label-inverse block mt-5 mb-2"
          >
            Confirm New Password
          </label>
          <div className="relative"><input maxLength={INPUT_LIMITS.password}
            id="confirmPassword"
            type={showConfirmation ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`${field} pr-14`}
            disabled={loading}
          />
          <PasswordVisibilityButton visible={showConfirmation} onToggle={() => setShowConfirmation(value => !value)} controls="confirmPassword" label="confirmation password" disabled={loading} inverse /></div>

          <Button
            type="submit"
            disabled={loading}
            className="trace-button trace-button-inverse-primary mt-6 w-full"
          >
            {loading ? 'Saving…' : 'Set New Password'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}
