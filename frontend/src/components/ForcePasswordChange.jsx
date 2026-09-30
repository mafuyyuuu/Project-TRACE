import { INPUT_LIMITS } from '@/utils/inputLimits';
import { useState } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';
import { updateProfile } from '@/services/authService';

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
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
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

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setPasswordToConfirm(password);
  };

  const confirmPasswordChange = async () => {
    if (!passwordToConfirm) return;
    setSaving(true);
    try {
      await updateProfile({ password: passwordToConfirm });
      setPasswordToConfirm(null);
      onChanged();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update your password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white dark:focus:bg-gray-900 transition-all';

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-8">
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-password" className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              New Password
            </label>
            <input maxLength={INPUT_LIMITS.password}
              id="new-password" type="password" className={inputClass} required
              minLength={MIN_LENGTH} autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <p className="text-[10px] text-gray-400 dark:text-gray-400">At least {MIN_LENGTH} characters.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password" className="text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest">
              Confirm Password
            </label>
            <input maxLength={INPUT_LIMITS.password}
              id="confirm-password" type="password" className={inputClass} required
              autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 rounded-xl p-3">
              {error}
            </p>
          )}

          <button
            type="submit" disabled={saving}
            className="w-full py-3 bg-[#15803d] hover:bg-[#166534] disabled:opacity-60 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
          >
            {saving ? 'Saving...' : 'Set Password & Continue'}
          </button>

          <button
            type="button" onClick={() => { setLogoutError(''); setConfirmingLogout(true); }}
            className="w-full py-2 text-[11px] font-bold text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            Sign out instead
          </button>
        </form>
      </div>
      <ConfirmDialog open={passwordToConfirm !== null} title="Confirm Password Change"
        message={['Save your new password?', error ? <span role="alert">{error}</span> : null]}
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
