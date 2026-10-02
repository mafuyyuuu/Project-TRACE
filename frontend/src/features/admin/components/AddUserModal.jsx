import { PASSWORD_REQUIREMENTS, validNewPassword } from '@/utils/passwordPolicy';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useState } from 'react';
import ModalShell from '@/components/ModalShell';

const DESKS = ['Finance', 'Window 1', 'Secretary', 'Admin Office', 'Receiving Desk', 'Records Desk'];

const inputClass =
  'w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#15803d]/20 focus:bg-white dark:focus:bg-gray-900 transition-all';

/**
 * Creates a staff account — the same fields and the same `createStaff` call
 * as the inline form this replaces, just in a modal instead of always-visible
 * inline JSX. Staff-only: the backend can never produce a student row here.
 */
export default function AddUserModal({ open, onClose, onCreate, saving }) {
  const [form, setForm] = useState({ role: 'clerk', desk_assignment: 'Finance' });
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
      maxWidth="max-w-md"
      footer={
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="add-user-form"
            disabled={saving}
            className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-sm disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Create Account'}
          </button>
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
      <form id="add-user-form" onSubmit={handleSubmit} className="space-y-3">
        <input maxLength={INPUT_LIMITS.id} className={inputClass} placeholder="Employee ID *" required
          value={form.employee_id || ''} onChange={(e) => set('employee_id', e.target.value)} />
        <input maxLength={INPUT_LIMITS.name} className={inputClass} placeholder="Full Name *" required
          value={form.full_name || ''} onChange={(e) => set('full_name', e.target.value)} />
        <input maxLength={INPUT_LIMITS.email} className={inputClass} type="email" placeholder="Email"
          value={form.email || ''} onChange={(e) => set('email', e.target.value)} />

        <select className={`${inputClass} cursor-pointer`} value={form.role || 'clerk'}
          onChange={(e) => set('role', e.target.value)}>
          <option value="clerk">Clerk</option>
          <option value="admin">Administrator</option>
        </select>

        <select className={`${inputClass} cursor-pointer`} value={form.desk_assignment || 'Finance'}
          onChange={(e) => set('desk_assignment', e.target.value)}>
          {DESKS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <div>
          <input maxLength={INPUT_LIMITS.password} className={inputClass} type="password" placeholder="Temporary password *" required minLength={8}
            value={form.password || ''} onChange={(e) => set('password', e.target.value)} />
          <p className="text-[10px] text-gray-400 dark:text-gray-400 mt-1.5 leading-relaxed">
            {PASSWORD_REQUIREMENTS} The user must replace it at first login.
          </p>
        </div>
      </form>
    </ModalShell>
  );
}
