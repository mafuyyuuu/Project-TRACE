import UserAvatar from '@/components/UserAvatar';
import { getUserLabel } from '@/utils/userLabels';

/** Active/Inactive pill — matches MaintenancePanel's existing status badge colors. */
function ActiveChip({ active }) {
  return (
    <span
      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
        active
          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#15803d] dark:text-green-300 border-emerald-100 dark:border-emerald-800'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

/** Kept visually distinct from the Active/Inactive chip — a different concept. */
function VerificationChip({ status }) {
  const s = status || 'verified';
  const classes =
    s === 'rejected'
      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-100 dark:border-red-800'
      : s === 'pending'
        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800'
        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800';
  const label = s === 'rejected' ? 'Rejected' : s === 'pending' ? 'Pending Verification' : 'Verified';
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${classes}`}>{label}</span>;
}

/**
 * A user, as a card: avatar, name, ID, email, and status chips.
 *
 * Presentational only — no fetching, no mutation. `onClick` opens whatever
 * detail view the caller wants.
 */
export default function UserCard({ user, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="user-card"
      data-user-id={user.id}
      className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-[#15803d]/40 hover:shadow-md transition-colors text-left flex flex-col gap-3"
    >
      <div className="flex items-center gap-3">
        <UserAvatar user={user} className="w-14 h-14 rounded-full object-cover shrink-0" alt={user.full_name} />
        <div className="min-w-0">
          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate select-text break-words">{user.full_name}</div>
          <div className="text-xs font-mono text-gray-400 dark:text-gray-400 truncate select-text break-words">{user.student_id || '—'}</div>
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 truncate select-text break-words">{user.email || '—'}</div>
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700">
          {getUserLabel(user)}
        </span>
        {user.desk_assignment && (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700">
            {user.desk_assignment}
          </span>
        )}
        <ActiveChip active={user.is_active} />
        <VerificationChip status={user.verification_status} />
      </div>
    </button>
  );
}
