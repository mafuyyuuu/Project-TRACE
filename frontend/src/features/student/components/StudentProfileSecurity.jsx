import { formatDateTime, formatEventLabel } from '@/utils/formatters';
import PaginatedTable from '@/components/PaginatedTable';
import Button from '@/components/Button';
import AuthenticatorSettings from '@/components/AuthenticatorSettings';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import StudentIcon from './StudentIcon';
import StudentProfileSection, { StudentProfileInput } from './StudentProfileSection';

export default function StudentProfileSecurity({ user, profileData, setField, showPasswords, onTogglePasswords,
  loggingOut, onLogout, securityLogs, saving }) {
  const password = profileData.password || '';
  const checks = [[password.length >= 8 && password.length <= INPUT_LIMITS.password, '8–64 characters'],
    [/[A-Z]/.test(password) && /[a-z]/.test(password), 'Uppercase and lowercase'], [/\d/.test(password), 'A number'],
    [/[@$!%*?&_]/.test(password), 'A special character (@ $ ! % * ? & _)']];
  return <div className="space-y-4">
    <AuthenticatorSettings user={user} student />
    <StudentProfileSection icon="profile-38207" title="Change password">
      <div className="trace-form-grid">
        {[['current_password', 'Current Password', 'Enter current password', 'Required to change email or password.', 'current-password'],
          ['password', 'New Password', 'Leave blank to keep current', 'Leave blank to keep your current password.', 'new-password']].map(([field, label, placeholder, hint, autoComplete]) => <div key={field}>
          <label className="trace-label mb-2 block" htmlFor={'profile-security-' + field}>{label}</label>
          <StudentProfileInput icon="profile-30e73">
            <input id={'profile-security-' + field} aria-label={label} autoComplete={autoComplete}
              maxLength={field === 'password' ? INPUT_LIMITS.password : undefined}
              type={showPasswords ? 'text' : 'password'} value={profileData[field] || ''} disabled={saving}
              onChange={event => setField(field, event.target.value)} placeholder={placeholder} className="trace-control w-full" />
            <Button type="button" disabled={saving} aria-label={(showPasswords ? 'Hide ' : 'Show ') + label.toLowerCase()}
              aria-pressed={showPasswords} onClick={onTogglePasswords} className="trace-icon-button"><StudentIcon name="profile-df885" /></Button>
          </StudentProfileInput><p className="trace-student-profile-hint">{hint}</p>
        </div>)}
      </div>
      <ul className="trace-student-password-checks" aria-label="Password requirements">{checks.map(([valid, label]) => <li key={label}
        className={password && valid ? 'trace-student-password-check-valid' : ''}><StudentIcon name="profile-b63a5" />{label}</li>)}</ul>
      <Button type="button" aria-pressed={showPasswords} disabled={saving} onClick={onTogglePasswords}
        className="trace-action trace-student-password-visibility"><StudentIcon name="profile-b26c3" />{showPasswords ? 'Hide passwords' : 'Show passwords'}</Button>
      <p className="trace-student-profile-guidance"><StudentIcon name="profile-24570" /><span>You cannot reuse your current or last three passwords. Changing your password logs out other devices and keeps this browser signed in.</span></p>
    </StudentProfileSection>
    <StudentProfileSection icon="profile-08fdc" title="Session management" description="Log out of all other active sessions across all devices. You will remain logged in on this device."
      action={<Button type="button" disabled={loggingOut} onClick={onLogout} className="trace-button trace-button-danger" aria-label="Logout All Devices"><StudentIcon name="profile-88ddc" />Logout all devices</Button>} />
    <StudentProfileSection icon="profile-128bd" title="Recent security activity" description="View your recent logins, password changes, and other security events.">
      <div className="trace-table-scroll" role="region" aria-label="Recent security activity table" tabIndex={0}><PaginatedTable label="security events" className="trace-data-table min-w-[34rem] text-xs">
        <thead><tr><th>Date</th><th>Event</th><th>IP</th></tr></thead><tbody>
          {!securityLogs.length && <tr><td colSpan={3} className="py-4 text-center">No recent activity</td></tr>}
          {securityLogs.map((log, i) => <tr key={log.id || i}><td>{formatDateTime(log.created_at)}</td><td><span className={'trace-student-security-event ' + (/FAIL|DENIED/.test(log.event_type) ? 'trace-student-security-event-failed' : /LOGOUT/.test(log.event_type) ? 'trace-student-security-event-neutral' : '')}>{formatEventLabel(log.event_type)}</span></td><td className="font-mono">{log.ip_address || 'Unknown'}</td></tr>)}
        </tbody></PaginatedTable></div>
    </StudentProfileSection>
  </div>;
}
