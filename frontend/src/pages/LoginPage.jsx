import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'

export default function LoginPage() {
  const navigate = useNavigate()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!employeeId.trim() || !password.trim()) {
      setError('Please enter both Employee ID and password.')
      return
    }

    setLoading(true)
    try {
      const data = await login({ employeeId: employeeId.trim(), password })
      localStorage.setItem('trace_token', data.token)
      if (data.user) {
        localStorage.setItem('trace_user', JSON.stringify(data.user))
      }
      navigate('/dashboard')
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Authentication failed. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card glass-card">
        <div className="login-header">
          <div className="login-branding">
            <div className="brand-icon">📋</div>
            <h1 className="brand-title">PROJECT TRACE</h1>
            <p className="brand-subtitle">PLP Registrar&apos;s Office</p>
            <p className="brand-tagline">
              Tracking, Routing, and Analytics Computing Engine
            </p>
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="login-error">
              <span className="error-icon">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="employeeId">Employee ID</label>
            <div className="form-input-wrapper">
              <input
                id="employeeId"
                className="form-input"
                type="text"
                placeholder="Enter your Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                autoComplete="username"
                autoFocus
              />
              <span className="input-icon">👤</span>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="form-input-wrapper">
              <input
                id="password"
                className="form-input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <span className="input-icon">🔒</span>
            </div>
          </div>

          <button
            type="submit"
            className="login-btn btn-primary"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Signing in…
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 Pamantasan ng Lungsod ng Pasig</p>
        </div>
      </div>
    </div>
  )
}
