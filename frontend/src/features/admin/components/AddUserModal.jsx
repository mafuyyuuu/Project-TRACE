import AdminIcon from './AdminIcon';
import Button from '@/components/Button';
import { PASSWORD_REQUIREMENTS, validNewPassword } from '@/utils/passwordPolicy';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useState } from 'react';
import ModalShell from '@/components/ModalShell';

const DESKS = ['Finance', 'Window 1', 'Secretary', 'Admin Office', 'Receiving Desk', 'Records Desk'];

const inputClass =
  "trace-control w-full";

/**
 * Creates a staff account — the same fields and the same `createStaff` call
 * as the inline form this replaces, just in a modal instead of always-visible
 * inline JSX. Staff-only: the backend can never produce a student row here.
 */
export default function AddUserModal({ open, onClose, onCreate, saving }) {
  const [form, setForm] = useState({ role: 'clerk', desk_assignment: 'Finance' });
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [accountToConfirm, setAccountToConfirm] = useState(null);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validNewPassword(form.password)) { setValidationError(PASSWORD_REQUIREMENTS); return; }
    setValidationError('');
    setAccountToConfirm({
      employee_id: form.employee_id,
      full_name: form.full_name,
      email: form.email,
      password: form.password,
      role: form.role || 'clerk',
      desk_assignment: form.desk_assignment || 'Finance',
    });

  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Add Staff Account"
      panelClassName="trace-modal-panel trace-admin-main-dialog trace-admin-add-staff max-w-[640px]"
      subtitle="Enter staff details, assign access, and set a temporary password."
      maxWidth="max-w-[640px]"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="trace-button trace-button-secondary flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="add-user-form"
            disabled={saving}
            className="trace-button trace-button-primary flex-1"
          >
            {saving ? 'Saving…' : 'Create Account'}
          </Button>
        </div>
      }
    >
      <ConfirmDialog open={!!accountToConfirm} title="Confirm Staff Account"
        message={accountToConfirm ? `Create an account for ${accountToConfirm.full_name} (${accountToConfirm.employee_id})?` : ''}
        confirmLabel="Create Account" loading={saving} onCancel={() => setAccountToConfirm(null)}
        onConfirm={async () => {
          if (await onCreate(accountToConfirm)) { setAccountToConfirm(null); onClose(); }
        }} />
      {validationError && <p role="alert" className="text-sm text-red-600 dark:text-red-300 mb-3">{validationError}</p>}
      <form id="add-user-form" onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-4"><div className="flex items-center justify-between"><h4 className="trace-section-title">Staff identity</h4><p className="trace-admin-caption">* Required</p></div>
          <div className="trace-form-grid"><label className="trace-label">Employee ID <span className="text-red-600">*</span><input maxLength={INPUT_LIMITS.id} className={`${inputClass} mt-2`} placeholder="Employee ID *" required value={form.employee_id || ''} onChange={event => set('employee_id', event.target.value)} /></label>
          <label className="trace-label">Full Name <span className="text-red-600">*</span><input maxLength={INPUT_LIMITS.name} className={`${inputClass} mt-2`} placeholder="Full Name *" required value={form.full_name || ''} onChange={event => set('full_name', event.target.value)} /></label>
          </div><label className="trace-label">Email<input maxLength={INPUT_LIMITS.email} type="email" className={`${inputClass} mt-2`} placeholder="Email" value={form.email || ''} onChange={event => set('email', event.target.value)} /></label>
        </section>
        <section className="space-y-4 border-t border-gray-200 pt-5 dark:border-gray-700"><h4 className="trace-section-title">Account access</h4><div className="trace-form-grid">
          <label className="trace-label">Role<select className={`${inputClass} mt-2`} value={form.role || 'clerk'} onChange={event => set('role', event.target.value)}><option value="clerk">Clerk</option><option value="admin">Administrator</option></select></label>
          <label className="trace-label">Desk<select className={`${inputClass} mt-2`} value={form.desk_assignment || 'Finance'} onChange={event => set('desk_assignment', event.target.value)}>{DESKS.map(desk => <option key={desk} value={desk}>{desk}</option>)}</select></label>
        </div></section>
        <section className="space-y-4 border-t border-gray-200 pt-5 dark:border-gray-700"><h4 className="trace-section-title">Account security</h4>
          <label className="trace-label">Temporary password <span className="text-red-600">*</span><span className="trace-admin-password-input"><input maxLength={INPUT_LIMITS.password} className={`${inputClass} mt-2`} type={showPassword ? "text" : "password"} placeholder="Temporary password *" required minLength={8} value={form.password || ''} onChange={event => set('password', event.target.value)} /><Button type="button" aria-label={showPassword ? 'Hide temporary password' : 'Show temporary password'} aria-pressed={showPassword} className="trace-icon-button" onClick={() => setShowPassword(value => !value)}><AdminIcon name="staff-eye" /></Button></span></label>
          <p className="trace-admin-caption leading-relaxed">{PASSWORD_REQUIREMENTS}</p><p className="trace-admin-guidance"><AdminIcon name="staff-shield-check" />Staff must replace this password at first login.</p>
        </section>
      </form>
    </ModalShell>
  );
}
