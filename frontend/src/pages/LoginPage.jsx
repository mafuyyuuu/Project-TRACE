import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import AuthShell from '@/components/AuthShell'
import plpLoginLogo from '@/assets/plp-login-logo.png'
import { verify2FA } from '@/services/authService'
import { hasBrowserTrustPreference, rememberBrowserTrustPreference } from '@/utils/browserTrustPreference'

export default function LoginPage() {
  const { login, loading, error: authError } = useAuth()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [needsStaffSetup, setNeedsStaffSetup] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const sharedComputer = !hasBrowserTrustPreference()
  const [canTrustBrowser, setCanTrustBrowser] = useState(false)
  const [trustBrowser, setTrustBrowser] = useState(false)

  // 2FA State
  const [requires2FA, setRequires2FA] = useState(false)
  const [tempToken, setTempToken] = useState('')
  const [otp, setOtp] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [mfaMethod, setMfaMethod] = useState('email')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendNotice, setResendNotice] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const resendDeadline = useRef(0)
  const [submitting, setSubmitting] = useState(false)
  const submissionInFlight = useRef(false)
  const busy = loading || submitting

  const startResendCooldown = () => {
    resendDeadline.current = Date.now() + 60000
    setResendCooldown(60)
  }

  const showOtpChallenge = (response) => {
    setMfaMethod(response.mfa_method || 'email')
    setUseRecoveryCode(false)
    setRequires2FA(true)
    setTempToken(response.temp_token)
    setOtp('')
    setCanTrustBrowser(response.can_trust_browser === true)
    setTrustBrowser(false)
    const parts = response.email?.split('@') || ['', '']
    const masked = parts[0].length > 1 ? parts[0][0] + '***' : '***'
    setMaskedEmail(masked + '@' + parts[1])
    startResendCooldown()
  }

  const cooldownActive = resendCooldown > 0
  useEffect(() => {
    if (!cooldownActive) return undefined
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((resendDeadline.current - Date.now()) / 1000))
      setResendCooldown(remaining)
      if (remaining === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownActive])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading || submissionInFlight.current) return
    setLocalError('')
    setResendNotice('')
    if (!requires2FA && (!employeeId.trim() || !password.trim())) {
      setLocalError('Please enter both ID and password.')
      return
    }
    if (requires2FA && !otp.trim()) { setLocalError('Please enter the OTP.'); return }
    submissionInFlight.current = true
    setSubmitting(true)
    try {
      if (!requires2FA) {
        setNeedsStaffSetup(false)
        const response = await login({ employeeId: employeeId.trim(), password, sharedComputer })
        if (response?.requires_authenticator_setup) setNeedsStaffSetup(true)
        if (response && response.requires_2fa) {
          showOtpChallenge(response)
        }
      } else {
        const data = await verify2FA({ temp_token: tempToken, ...(useRecoveryCode ? { recovery_code: otp.trim() } : { otp: otp.trim() }),
          ...(canTrustBrowser && trustBrowser ? { trust_browser: true } : {}) })
        rememberBrowserTrustPreference(data, canTrustBrowser && trustBrowser)
        localStorage.setItem('trace_token', data.token)
        localStorage.setItem('trace_user', JSON.stringify(data.user))
        window.location.href = '/dashboard'
      }
    } catch (err) {
      setLocalError(err.response?.data?.error || (requires2FA ? 'Invalid OTP.' : 'Authentication failed. Please try again.'))
    } finally {
      submissionInFlight.current = false
      setSubmitting(false)
    }
  }

  const resendOtp = async () => {
    if (!requires2FA || loading || submissionInFlight.current || Date.now() < resendDeadline.current) return
    submissionInFlight.current = true
    setSubmitting(true)
    setResending(true)
    setLocalError('')
    setResendNotice('')
    startResendCooldown()
    try {
      const response = await login({ employeeId: employeeId.trim(), password, sharedComputer })
      if (response?.requires_2fa) {
        showOtpChallenge(response)
        setResendNotice('A new code has been requested. Use the latest code from your email.')
      }
    } catch (err) {
      setLocalError(err.response?.data?.error || 'Could not resend the code. Please try again.')
    } finally {
      submissionInFlight.current = false
      setSubmitting(false)
      setResending(false)
    }
  }

  const error = localError || authError

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setLocalError(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <AuthShell
      title={requires2FA ? 'Verification Required' : 'Login'}
      brand={<img src={plpLoginLogo} alt="Pamantasan ng Lungsod ng Pasig logo" className="h-20 w-20 shrink-0 object-contain" />}
    >
          <form onSubmit={handleSubmit} aria-busy={busy} className="flex flex-col gap-6">
            {error && <p role="alert" className="trace-error">{error}</p>}
            {needsStaffSetup && <p role="status" className="text-sm">This staff account needs an authenticator. Ask Admin for a private setup code, then <Link to="/staff-setup" className="font-bold underline">open staff authenticator setup</Link>.</p>}
            {resendNotice && <p role="status" className="text-sm font-medium text-white/90">{resendNotice}</p>}
            {!requires2FA ? (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">STUDENT / ALUMNI / STAFF ID</label>
                  <input maxLength={INPUT_LIMITS.id}
                    type="text" 
                    placeholder="e.g. 23-00123 or ADMIN001"
                    value={employeeId} 
                    disabled={busy}
                    onChange={(e) => setEmployeeId(e.target.value)} 
                    className="trace-control trace-control-inverse w-full "
                    autoFocus 
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">PASSWORD</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      disabled={busy}
                      onChange={(e) => setPassword(e.target.value)} 
                      className="trace-control trace-control-inverse w-full pr-12 "
                    />
                    <Button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="trace-action absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </Button>
                  </div>
                  <div className="text-right mt-2">
                    <Link to="/forgot-password" className="text-sm font-medium text-white/90 hover:text-white hover:underline">Forgot Password?</Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-white/90 mb-4">
                  {mfaMethod === 'authenticator' ? (useRecoveryCode ? 'Enter one of your saved single-use recovery codes.' : 'Enter the six-digit code from your authenticator app.') : <>For security, we've sent a 6-digit verification code to <strong>{maskedEmail}</strong>.</>}
                </p>
                <label className="text-xs font-bold text-white uppercase tracking-wider">{useRecoveryCode ? 'RECOVERY CODE' : 'VERIFICATION CODE'}</label>
                <input aria-label={useRecoveryCode ? 'Recovery code' : 'Verification code'} maxLength={useRecoveryCode ? 35 : INPUT_LIMITS.otp} inputMode={useRecoveryCode ? 'text' : 'numeric'}
                  type="text" 
                  placeholder={useRecoveryCode ? 'Enter recovery code' : 'Enter 6-digit OTP'}
                  value={otp} 
                  disabled={busy}
                  onChange={(e) => setOtp(useRecoveryCode ? e.target.value : e.target.value.replace(/\D/g, ''))}
                  className="trace-control trace-control-inverse w-full text-center "
                  autoFocus 
                />
                {canTrustBrowser && (
                  <div className="mt-3 flex flex-col gap-2 text-sm text-white/90">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={trustBrowser} disabled={busy}
                        onChange={e => setTrustBrowser(e.target.checked)}
                        className="trace-choice h-4 w-4 accent-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" />
                      This is my personal browser — trust it for today
                    </label>
                    <p>Leave unchecked on school or shared computers. After verification, later logins on this browser can skip OTP until midnight Manila time. Your password is still required. Change this preference in Profile → Security. Browser privacy settings may require OTP again.</p>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit" 
              disabled={busy}
              className="trace-button trace-button-inverse-primary mt-6 w-full flex items-center justify-center gap-3"
            >
              {busy ? (
                <>
                  <span aria-hidden="true" className="w-5 h-5 border-4 border-gray-900/30 dark:border-gray-700/30 border-t-gray-900 dark:border-t-gray-700 rounded-full animate-spin motion-reduce:animate-none"></span>
                  <span role="status" className="text-xl">PROCESSING...</span>
                </>
              ) : (requires2FA ? 'VERIFY & LOGIN' : 'LOGIN')}
            </Button>

            {requires2FA && mfaMethod === 'email' && (
              <Button
                type="button"
                onClick={resendOtp}
                disabled={busy || cooldownActive}
                className="trace-action text-sm font-semibold text-white hover:underline disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                {resending ? 'Sending code…' : cooldownActive ? `Resend OTP (${resendCooldown}s)` : 'Resend OTP'}
              </Button>
            )}

            {requires2FA && mfaMethod === 'authenticator' && <Button type="button" disabled={busy}
              onClick={() => { setUseRecoveryCode(value => !value); setOtp(''); setLocalError(''); }}
              className="trace-action text-sm text-white underline">{useRecoveryCode ? 'Use authenticator code' : 'Use a recovery code'}</Button>}

            {requires2FA && (
              <Button
                type="button" 
                disabled={busy}
                onClick={() => setRequires2FA(false)}
                className="trace-action mt-2 text-sm text-white/70 hover:text-white hover:underline"
              >
                Back to Login
              </Button>
            )}
          </form>

          {!requires2FA && (
            <div className="mt-10 text-center text-sm text-white/80 font-medium">
              Don't have an account? <Link to={new URLSearchParams(window.location.search).get('applicant') === 'alumni' ? '/signup?applicant=alumni' : '/signup'} className="text-white font-black hover:underline">Sign up</Link>
            </div>
          )}
    </AuthShell>
  )
}
