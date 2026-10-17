import { Link } from 'react-router-dom'
import traceLogo from '@/assets/trace-auth-logo.png'
import plpLogo from '@/assets/plp-login-logo.png'

/**
 * The grey-and-green split screen shared by the public auth pages, so the
 * recovery screens are visibly part of the same system as Login. Purely
 * presentational — it holds no state and makes no API calls.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="trace-auth-shell">
      {/* Left Column (Light Spec) */}
      <div className="trace-auth-brand">
        <div className="trace-auth-brand-content">
          <Link to="/" className="trace-auth-logo" aria-label="TRACE — PLP Registrar">
            <img src={traceLogo} alt="" width="2000" height="2000" />
          </Link>
          <div className="trace-auth-introduction">
          <span className="trace-auth-welcome">Welcome to</span>
          <h1>TRACE</h1>
          <p className="trace-auth-expansion">Tracking, Routing, and Automated Credential Engine</p>
          <h2>
            An AI-Assisted Registrar Document Workflow System
          </h2>
          </div>
          <p className="trace-auth-mission">
            Empowering the PLP community with transparent document requests and intelligent, data-driven administrative processing.
          </p>
        </div>
      </div>

      {/* Right Column (Pine Spec) */}
      <div className="trace-auth-form-side trace-action-inverse-surface">
        <img className="trace-auth-seal" src={plpLogo} alt="Pamantasan ng Lungsod ng Pasig logo" width="500" height="500" />
        <div className="trace-auth-form-content">
          <header className="trace-auth-form-heading"><h2>{title}</h2>
          {subtitle && (
            <p>{subtitle}</p>
          )}
          </header>
          {children}
          {footer && <div className="mt-8 text-center">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
