import { useCallback, useState } from 'react'
import { forgotPassword, resetPassword } from '@/services/authService'

/**
 * State and API calls for the two password-recovery screens, kept out of the
 * page components per the components-never-call-APIs rule (the same split as
 * useProfileSettings / ProfileSettingsModal).
 */
export default function usePasswordReset() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)

  /**
   * Request a reset link.
   *
   * The backend answers identically whether or not the account exists, so this
   * shows its message verbatim rather than inventing a "sent!" of its own —
   * claiming delivery for an address that doesn't exist would leak exactly what
   * the generic response is designed to hide.
   */
  const requestLink = useCallback(async (identifier) => {
    setError('')
    setMessage('')
    if (!identifier.trim()) {
      setError('Enter your Student ID / Staff ID or your email address.')
      return
    }
    setLoading(true)
    try {
      const res = await forgotPassword(identifier.trim())
      setMessage(res.message)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not start the password reset. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  /** Set the new password using the single-use token from the emailed link. */
  const submitNewPassword = useCallback(async (token, password, confirmPassword) => {
    setError('')
    setMessage('')
    if (!token) {
      setError('This reset link is missing its token. Please request a new one.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const res = await resetPassword({ token, password })
      setMessage(res.message)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reset the password. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, message, done, requestLink, submitNewPassword }
}
