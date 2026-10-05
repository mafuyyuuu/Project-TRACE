import Button from '@/components/Button';
import ModalShell from '@/components/ModalShell';
import UserAvatar from '@/components/UserAvatar';
import FileUploadField from '@/components/FileUploadField';
import { getUserLabel } from '@/utils/userLabels';
import StaffAuthenticatorSetup from '@/features/admin/components/StaffAuthenticatorSetup';
import RegistrationReviewNotice from '@/components/RegistrationReviewNotice';

function Field({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-[11px] font-mono text-gray-600 dark:text-gray-300 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <span>{label}</span>
      <span className="font-bold text-gray-950 dark:text-gray-100 select-text min-w-0 break-words text-right">{value || '—'}</span>
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
  const mutationDisabled = !onEdit;
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
            {onEdit && <Button
              type="button"
              onClick={onEdit}
              disabled={mutationDisabled || saving}
              className="trace-button trace-button-info flex-1"
            >
              Edit User
            </Button>}
            {onToggleActive && <Button
              type="button"
              onClick={onToggleActive}
              disabled={isStudent || !onToggleActive || isSelf || saving}
              title={isSelf ? 'You cannot deactivate your own account' : ''}
              className={`trace-button flex-1 ${user.is_active ? 'trace-button-danger' : 'trace-button-primary'}`}
            >
              {user.is_active ? 'Deactivate User' : 'Restore User'}
            </Button>}
            <Button
              type="button"
              onClick={onClose}
              className="trace-button trace-button-secondary flex-1"
            >
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100 dark:border-gray-700">
        <UserAvatar user={user} className="w-20 h-20 rounded-full object-cover" alt={user.full_name} />
        <h4 className="mt-3 text-lg font-display font-black text-gray-900 dark:text-gray-100 select-text break-words">{user.full_name}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 select-text">{user.email || '—'}</p>
        <div className="flex flex-wrap justify-center gap-1.5 mt-3">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700">
            {getUserLabel(user)}
          </span>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              user.is_active
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-[#15803d] dark:text-green-300 border-emerald-100 dark:border-emerald-800'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
            }`}
          >
            {user.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="pt-4 space-y-0.5">
        <RegistrationReviewNotice user={user} />
        <Field label="College / Department" value={user.college || user.college_name || user.college_id} />
        {user.role === 'student' && !user.college_id && <p className="text-xs text-amber-800 dark:text-amber-300">College assignment needs Admin review before requesting college-restricted documents.</p>}
        <Field label="College" value={user.college_name || user.course} />
        {isStudent && <Field label="Program/Course" value={user.program} />}
        <Field label={isStudent ? user.user_type === 'alumni' ? 'Alumni ID' : 'Student ID' : 'Staff ID'} value={user.student_id} />
        <Field label="Date Joined" value={dateJoined} />
        <Field label="Email" value={user.email} />
        <Field label="Contact Number" value={user.phone_number} />
        {user.role === 'clerk' && Boolean(user.is_active) && viewerId && <StaffAuthenticatorSetup key={user.id} user={user} />}
        {isStudent && <>
          <Field label="Extension Name" value={user.extension_name} />
          <Field label="Birth Date" value={user.birth_date ? new Date(user.birth_date).toLocaleDateString('en-PH') : null} />
          <Field label="Place of Birth" value={user.place_of_birth} />
          <Field label="Sex" value={user.sex} />
          <Field label="Civil Status" value={user.civil_status} />
          <Field label="Maiden Name" value={user.maiden_name} />
          <Field label="Home Address" value={user.home_address} />
          <Field label="Enrollment Status" value={user.enrollment_status} />
          <Field label="Study Load" value={user.study_load} />
          <Field label="Last Attendance Year" value={user.last_attendance_year} />
          <Field label="Transfer Student" value={user.is_transfer_student ? 'Yes' : 'No'} />
          <Field label="Previous School" value={user.previous_school} />
          <Field label="Elementary School" value={user.elem_school} />
          <Field label="Elementary Graduation" value={user.elem_grad_year} />
          <Field label="Junior High School" value={user.jhs_school} />
          <Field label="Junior High Graduation" value={user.jhs_grad_year} />
          <Field label="Senior High School" value={user.shs_school} />
          <Field label="Senior High Graduation" value={user.shs_grad_year} />
          <FileUploadField label="Registration identity proof" path={user.id_proof_path} allowReplace={false} />
        </>}
      </div>
    </ModalShell>
  );
}
