import ModalShell from '@/components/ModalShell';
import UserAvatar from '@/components/UserAvatar';
import { ROLE_LABELS } from '@/utils/userLabels';

function Field({ label, value }) {
  return (
    <div className="flex justify-between text-[11px] font-mono text-gray-600 py-2 border-b border-gray-100 last:border-0">
      <span>{label}</span>
      <span className="font-bold text-gray-950 select-text">{value || '—'}</span>
    </div>
  );
}

/**
 * Read-only user detail view: large avatar, identity, status chips, a
 * labelled field list, then Edit / Deactivate / Close.
 *
 * Renders identically from both AdminDashboard (view-only — no onEdit/
 * onToggleActive passed) and MaintenancePanel (full staff mutation).
 */
export default function UserDetailModal({ open, onClose, user, onEdit, onToggleActive, saving, viewerId }) {
  if (!user) return null;

  const isStudent = user.role === 'student';
  const isSelf = user.id === viewerId;
  const mutationDisabled = isStudent || !onEdit;
  const dateJoined = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={user.full_name}
      maxWidth="max-w-lg"
      footer={
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onEdit}
              disabled={mutationDisabled || saving}
              className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold bg-[#15803d] hover:bg-[#166534] text-white shadow-sm disabled:opacity-50 transition-colors"
            >
              Edit User
            </button>
            <button
              type="button"
              onClick={onToggleActive}
              disabled={mutationDisabled || isSelf || saving}
              title={isSelf ? 'You cannot deactivate your own account' : ''}
              className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {user.is_active ? 'Deactivate User' : 'Restore User'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3 rounded-2xl text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
          {mutationDisabled && (
            <p className="text-[11px] text-gray-400 text-center">
              {isStudent ? 'Not available for student accounts.' : 'View only.'}
            </p>
          )}
        </div>
      }
    >
      <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100">
        <UserAvatar user={user} className="w-20 h-20 rounded-full object-cover" alt={user.full_name} />
        <h4 className="mt-3 text-lg font-display font-black text-gray-900">{user.full_name}</h4>
        <p className="text-xs text-gray-500 select-text">{user.email || '—'}</p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
            {ROLE_LABELS[user.role] || user.role}
          </span>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              user.is_active
                ? 'bg-emerald-50 text-[#15803d] border-emerald-100'
                : 'bg-gray-100 text-gray-500 border-gray-200'
            }`}
          >
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="pt-4 space-y-0.5">
        <Field label="Department" value="—" />
        <Field label="Position" value="—" />
        <Field label="Appointment" value="—" />
        <Field label="UID" value={user.student_id} />
        <Field label="Date Joined" value={dateJoined} />
        <Field label="Email" value={user.email} />
        <Field label="Contact Number" value={user.phone_number} />
        <Field label="Last Activity" value="—" />
      </div>
    </ModalShell>
  );
}
