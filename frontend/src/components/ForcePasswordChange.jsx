import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import useForcePasswordChange from '@/hooks/useForcePasswordChange';
import { PASSWORD_REQUIREMENTS, validNewPassword } from '@/utils/passwordPolicy';

const MIN_LENGTH = 8;

/**
 * Blocking password change for accounts created with an admin-set temporary
 * password.
 *
 * Rendered instead of the dashboard — not as a dismissible modal — because the
 * whole point of `must_change_password` is that the admin-chosen secret cannot
 * survive first use. There is deliberately no cancel button; the only ways out
 * are setting a password or logging out.
 */
export default function ForcePasswordChange({ user, onChanged, onLogout }) {
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const { save, saving, error: saveError } = useForcePasswordChange(onChanged);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const [passwordToConfirm, setPasswordToConfirm] = useState(null);

  const confirmLogout = async () => {
    setLoggingOut(true);
    setLogoutError('');
    try {
      await onLogout();
      setConfirmingLogout(false);
    } catch {
      setLogoutError('Could not sign out. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword) { setError('Enter your current temporary password.'); return; }
    if (!validNewPassword(password)) {
      setError(PASSWORD_REQUIREMENTS);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setPasswordToConfirm({ password, current_password: currentPassword });
  };

  const confirmPasswordChange = async () => {
    if (!passwordToConfirm) return;
    if (await save(passwordToConfirm)) setPasswordToConfirm(null);
  };

  const inputClass =
    "trace-control w-full";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="trace-section trace-section-body shadow-xl w-full max-w-md">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 flex items-center justify-center mb-5">
          <svg className="w-6 h-6 text-amber-600 dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        <h2 className="text-2xl font-display font-black text-gray-900 dark:text-gray-100">Choose your password</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          Welcome, <span className="font-bold text-gray-800 dark:text-gray-100 select-text break-words">{user?.full_name}</span>. Your account was
          created with a temporary password set by an administrator. Please choose your own before
          continuing — the temporary one will stop working.
        </p>

        <form onSubmit={submit} className="space-y-4 mt-6">
          <label className="trace-label block">Current temporary password
            <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className={inputClass} required />
          </label>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-password" className="trace-label">
              New Password
            </label>
            <input maxLength={INPUT_LIMITS.password}
              id="new-password" type={showPassword ? 'text' : 'password'} className={inputClass} required
              minLength={MIN_LENGTH} autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-sm text-gray-500 dark:text-gray-400">{PASSWORD_REQUIREMENTS} Other devices will be logged out.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password" className="trace-label">
              Confirm Password
            </label>
            <input maxLength={INPUT_LIMITS.password}
              id="confirm-password" type={showPassword ? 'text' : 'password'} className={inputClass} required
              autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="button" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="trace-button trace-button-secondary">{showPassword ? 'Hide passwords' : 'Show passwords'}</Button>

          {(error || saveError) && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 rounded-xl p-3">
              {error || saveError}
            </p>
          )}

          <Button
            type="submit" disabled={saving}
            className="trace-button trace-button-primary w-full"
          >
            {saving ? 'Saving...' : 'Set Password & Continue'}
          </Button>

          <Button
            type="button" onClick={() => { setLogoutError(''); setConfirmingLogout(true); }}
            className="trace-action w-full py-2 text-[11px] font-bold text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Sign out instead
          </Button>
        </form>
      </div>
      <ConfirmDialog open={passwordToConfirm !== null} title="Confirm Password Change"
        message={['Save your new password and log out other devices?', error || saveError ? <span role="alert">{error || saveError}</span> : null]}
        confirmLabel="Change Password" loading={saving} onConfirm={confirmPasswordChange}
        onCancel={() => setPasswordToConfirm(null)} />
      <ConfirmDialog
        open={confirmingLogout}
        title="Log Out"
        message={["You'll need to sign in again to continue.", logoutError]}
        confirmLabel="Log Out"
        cancelLabel="Stay Signed In"
        loading={loggingOut}
        loadingLabel="Logging Out…"
        onConfirm={confirmLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  );
}
