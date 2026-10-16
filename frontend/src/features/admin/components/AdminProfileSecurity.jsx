import { formatDateTime, formatEventLabel } from '@/utils/formatters';
import PaginatedTable from '@/components/PaginatedTable';
import Button from '@/components/Button';
import AuthenticatorSettings from '@/components/AuthenticatorSettings';
import AdminIcon from './AdminIcon';
import { INPUT_LIMITS } from '@/utils/inputLimits';

function Heading({ icon, title, description, action }) {
  return <div className="trace-admin-security-card-heading">
    <span className="trace-admin-security-icon"><AdminIcon name={icon} /></span>
    <div className="min-w-0 flex-1"><h3>{title}</h3><p>{description}</p></div>
    {action}
  </div>;
}

export default function AdminProfileSecurity({ user, profileData, setField, showPasswords, onTogglePasswords,
  personalBrowser, onBrowserVerification, loggingOut, onLogout, securityLogs, showActivity, onToggleActivity, saving }) {
  const password = profileData.password || '';
  const checks = [[password.length >= 8 && password.length <= INPUT_LIMITS.password, '8–64 characters'],
    [/[A-Z]/.test(password) && /[a-z]/.test(password), 'Uppercase and lowercase'], [/\d/.test(password), 'A number'],
    [/[@$!%*?&_]/.test(password), 'A special character (@ $ ! % * ? & _)']];
  return <div className="trace-admin-profile-security-content space-y-3">
    <AuthenticatorSettings user={user} admin />
    <section className="trace-section" aria-label="Browser verification">
      <Heading icon="security-monitor" title="Browser verification" description={personalBrowser
        ? 'Personal-browser preference is saved until midnight Manila time.'
        : 'Shared-computer verification is the default. Verify each login; choose personal-browser trust during verification only on your own device.'} />
      {personalBrowser && <Button type="button" onClick={onBrowserVerification} className="trace-button trace-button-secondary mt-3">Use shared-computer verification</Button>}
    </section>
    <section className="trace-section space-y-3.5">
      <Heading icon="security-lock1" title="Change password" description="Use a strong password you don’t use anywhere else." />
      {[['current_password', 'Current Password', 'Required to change email or password', 'current-password'],
        ['password', 'New Password', 'Leave blank to keep current password', 'new-password']].map(([field, label, placeholder, autoComplete]) => <div key={field}>
        <label className="trace-label mb-1.5" htmlFor={'profile-security-' + field}>{label}</label>
        <div className="trace-admin-password-input">
          <input id={'profile-security-' + field} aria-label={label} autoComplete={autoComplete}
            maxLength={field === 'password' ? INPUT_LIMITS.password : undefined}
            type={showPasswords ? 'text' : 'password'} value={profileData[field] || ''} disabled={saving}
            onChange={event => setField(field, event.target.value)} placeholder={placeholder} className="trace-control w-full" />
          <Button type="button" disabled={saving} aria-label={(showPasswords ? 'Hide ' : 'Show ') + label.toLowerCase()}
            aria-pressed={showPasswords} onClick={onTogglePasswords} className="trace-icon-button"><AdminIcon name="security-eye" /></Button>
        </div>
      </div>)}
      <ul className="trace-admin-password-checks" aria-label="Password requirements">{checks.map(([valid, label]) => <li key={label}
        className={password && valid ? 'trace-admin-password-check-valid' : ''}><AdminIcon name="security-check" />{label}</li>)}</ul>
      <Button type="button" aria-pressed={showPasswords} disabled={saving} onClick={onTogglePasswords}
        className="trace-action trace-admin-password-visibility"><AdminIcon name="security-show-eye" />{showPasswords ? 'Hide passwords' : 'Show passwords'}</Button>
      <p className="trace-admin-guidance"><AdminIcon name="security-info" /><span>You can’t reuse your current or last three passwords. Changing your password logs out other devices and keeps this browser signed in.</span></p>
    </section>
    <section className="trace-section">
      <Heading icon="security-logout" title="Session management" description="Log out of all other active sessions across all devices. You will remain logged in on this device."
        action={<Button type="button" disabled={loggingOut} onClick={onLogout} className="trace-button trace-button-danger" aria-label="Logout All Devices"><AdminIcon name="security-logout1" />Logout all devices</Button>} />
    </section>
    <section className="trace-section">
      <Heading icon="security-activity" title="Recent security activity" description="View your recent logins, password changes, and other security events."
        action={<Button type="button" aria-expanded={showActivity} onClick={onToggleActivity} className="trace-button trace-button-secondary">{showActivity ? 'Hide activity' : 'View activity'}</Button>} />
      {showActivity && <div className="trace-table-scroll mt-4" role="region" aria-label="Recent security activity table" tabIndex={0}><PaginatedTable label="security events" className="trace-data-table min-w-[24rem] text-xs">
        <thead><tr><th>Date</th><th>Event</th><th>IP</th></tr></thead><tbody>
          {!securityLogs.length && <tr><td colSpan={3} className="py-4 text-center">No recent activity</td></tr>}
          {securityLogs.map((log, i) => <tr key={log.id || i}><td>{formatDateTime(log.created_at)}</td><td>{formatEventLabel(log.event_type)}</td><td>{log.ip_address || 'Unknown'}</td></tr>)}
        </tbody></PaginatedTable></div>}
    </section>
  </div>;
}
