import { Link } from 'react-router-dom';
import traceLogo from '@/assets/trace-auth-logo-white.png';

const steps = [
  ['Academic details', 'Account type, college, ID and program'],
  ['Personal information', 'Name, email and phone number'],
  ['Account & verification', 'Password, proof of ID and privacy notice'],
];

/** Registration keeps one draft owner while its three screens change. */
export default function SignupShell({ step, complete, children }) {
  return <div className="trace-signup-shell">
    <aside className="trace-signup-brand">
      <div className="trace-signup-brand-logo"><div><img src={traceLogo} alt="TRACE" width="2000" height="2000" /></div><p>PLP REGISTRAR'S OFFICE</p></div>
      <div className="trace-signup-intro"><h2>Create your TRACE account</h2><p>Request documents and track them from one place, without the queue.</p>
        <ol className="trace-signup-steps" aria-label="Registration steps">{steps.map(([title, description], i) => <li key={title} data-active={complete || i + 1 <= step} aria-current={!complete && i + 1 === step ? 'step' : undefined}>
          <span>{complete || i + 1 < step ? '✓' : i + 1}</span><div><strong>{title}</strong><p>{description}</p></div>
        </li>)}</ol>
      </div>
      <p className="trace-signup-brand-footer">Already have an account? <Link to="/" className="font-bold underline">Back to Login</Link></p>
    </aside>
    <main className="trace-signup-main">{children}</main>
  </div>;
}
