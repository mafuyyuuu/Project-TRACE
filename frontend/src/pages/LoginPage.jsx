import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import AuthShell from '@/components/AuthShell'
import { verify2FA } from '@/services/authService'

export default function LoginPage() {
  const { login, loading, error: authError } = useAuth()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [otp, setOtp] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [submissionToConfirm, setSubmissionToConfirm] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    setLocalError('')
    if (!requires2FA && (!employeeId.trim() || !password.trim())) {
      setLocalError('Please enter both ID and password.')
      return
    }
    if (requires2FA && !otp.trim()) { setLocalError('Please enter the OTP.'); return }
    setSubmissionToConfirm({ employeeId: employeeId.trim(), password, requires2FA, tempToken, otp: otp.trim() })
  }

  const confirmSubmission = async () => {
    if (!submissionToConfirm || confirming) return
    setConfirming(true)
    try {
    setLocalError('')
    if (!submissionToConfirm.requires2FA) {
      if (!employeeId.trim() || !password.trim()) {
        setLocalError('Please enter both ID and password.')
        return
      }
      try {
        const response = await login({ employeeId: submissionToConfirm.employeeId, password: submissionToConfirm.password })
        if (response && response.requires_2fa) {
          setSubmissionToConfirm(null)
          setRequires2FA(true)
          setTempToken(response.temp_token)
          // Mask email for UI: "a***@plp.edu.ph"
          const parts = response.email?.split('@') || ['','']
          const m = parts[0].length > 1 ? parts[0][0] + '***' : '***'
          setMaskedEmail(m + '@' + parts[1])
        }
      } catch (err) {
        // useAuth login already sets authError
      }
    } else {
      if (!otp.trim()) {
        setLocalError('Please enter the OTP.')
        return
      }
      try {
        const data = await verify2FA({ temp_token: submissionToConfirm.tempToken, otp: submissionToConfirm.otp })
        localStorage.setItem('trace_token', data.token)
        localStorage.setItem('trace_user', JSON.stringify(data.user))
        window.location.href = '/dashboard'
      } catch (err) {
        setLocalError(err.response?.data?.error || 'Invalid OTP.')
      }
    }
    } finally { setConfirming(false) }
  }

  const error = localError || authError

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setLocalError(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <AuthShell title={requires2FA ? 'Verification Required' : 'Login'}>
      <ConfirmDialog open={!!submissionToConfirm} title={requires2FA ? 'Confirm Verification' : 'Confirm Sign In'}
        message={['Submit your sign-in details?', error ? <span role="alert">{error}</span> : null]}
        confirmLabel={requires2FA ? 'Verify' : 'Sign In'} loading={loading || confirming}
        onConfirm={confirmSubmission} onCancel={() => setSubmissionToConfirm(null)} />
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {!requires2FA ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">STUDENT ID / STAFF ID</label>
                  <input maxLength={INPUT_LIMITS.id}
                    type="text" 
                    placeholder="e.g. 23-00123 or ADMIN001"
                    value={employeeId} 
                    onChange={(e) => setEmployeeId(e.target.value)} 
                    className="w-full p-4 bg-white/10 dark:bg-gray-900/10 border border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-white/50 outline-none text-white focus:bg-white/20 dark:focus:bg-gray-900/20 transition-all font-semibold placeholder:text-white/40"
                    autoFocus 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">PASSWORD</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      className="w-full p-4 pr-12 bg-white/10 dark:bg-gray-900/10 border border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-white/50 outline-none text-white focus:bg-white/20 dark:focus:bg-gray-900/20 transition-all font-semibold placeholder:text-white/40"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="text-right mt-2">
                    <Link to="/forgot-password" className="text-sm font-medium text-white/90 hover:text-white hover:underline">Forgot Password?</Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-white/90 mb-4">
                  For security, we've sent a 6-digit verification code to <strong>{maskedEmail}</strong>.
                </p>
                <label className="text-xs font-bold text-white uppercase tracking-wider">VERIFICATION CODE</label>
                <input maxLength={INPUT_LIMITS.otp} inputMode="numeric"
                  type="text" 
                  placeholder="Enter 6-digit OTP"
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full p-4 bg-white/10 dark:bg-gray-900/10 border border-white/20 rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-white/50 outline-none text-white focus:bg-white/20 dark:focus:bg-gray-900/20 transition-all font-bold placeholder:text-white/40"
                  autoFocus 
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="mt-6 w-full py-5 bg-[#f8f9fa] dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-black text-2xl rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 active:bg-gray-300 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-lg uppercase tracking-wide flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-4 border-gray-900/30 dark:border-gray-700/30 border-t-gray-900 dark:border-t-gray-700 rounded-full animate-spin"></span>
                  <span className="text-xl">PROCESSING...</span>
                </>
              ) : (requires2FA ? 'VERIFY & LOGIN' : 'LOGIN')}
            </button>

            {requires2FA && (
              <button 
                type="button" 
                onClick={() => setRequires2FA(false)}
                className="mt-2 text-sm text-white/70 hover:text-white hover:underline"
              >
                Back to Login
              </button>
            )}
          </form>

          {!requires2FA && (
            <div className="mt-10 text-center text-sm text-white/80 font-medium">
              Don't have an account? <Link to="/signup" className="text-white font-black hover:underline">Sign up</Link>
            </div>
          )}
    </AuthShell>
  )
}
