import UserAvatar from '@/components/UserAvatar';
import RegistrationProof from '@/components/RegistrationProof';
import RegistrationReviewNotice from '@/components/RegistrationReviewNotice';
import { getUserLabel } from '@/utils/userLabels';
import { isTransferStudent } from '@/utils/profileCompletion';

function Field({ label, value, wide = false }) {
  return <div className={wide ? 'col-span-full min-w-0' : 'min-w-0'}><dt className="text-xs leading-relaxed text-[#6b7890] dark:text-gray-400">{label}</dt><dd className="mt-1.5 select-text break-words text-sm text-trace-ink dark:text-gray-100">{value === null || value === undefined || value === '' ? '—' : value}</dd></div>;
}

/** Profile card layout from Student information frame 2105:1361. */
export default function AdminStudentInfo({ user }) {
  return <div className="space-y-6">
    <div className="trace-admin-profile-summary">
      <div className="flex min-w-0 flex-wrap items-center gap-5"><UserAvatar user={user} className="h-20 w-20 shrink-0 rounded-full object-cover" alt={user.full_name} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><h4 className="select-text break-words text-2xl font-bold">{user.full_name}</h4><span className={`trace-admin-badge ${Number(user.is_active) ? 'trace-admin-badge-green' : 'trace-admin-badge-neutral'}`}>● {Number(user.is_active) ? 'Active' : 'Inactive'}</span></div><p className="mt-2 select-text break-words text-sm text-gray-500 dark:text-gray-400">{user.email || '—'}</p><p className="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">{getUserLabel(user)}</p></div></div>
      <dl className="space-y-4"><Field label={user.user_type === 'alumni' ? 'Alumni ID' : 'Student ID'} value={user.student_id} /><Field label="Date Joined" value={user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} /></dl>
    </div>
    <RegistrationReviewNotice user={user} />
    {!user.college_id && <p className="trace-admin-notice">College assignment needs Admin review before requesting college-restricted documents.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400"><h4 className="font-semibold uppercase">Profile details</h4><span>— Not provided</span></div>
    <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section className="trace-admin-profile-card"><h4 className="trace-section-title">Academic information</h4><dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
        <Field label="College / Department" value={user.college_name || user.college || user.college_id} /><Field label="College" value={user.college_name || user.course} /><Field label="Program/Course" value={user.program} wide />
        <Field label="Enrollment Status" value={user.enrollment_status} /><Field label="Study Load" value={user.study_load} /><Field label="Transfer Student" value={isTransferStudent(user.is_transfer_student) ? 'Yes' : 'No'} /><Field label="Year Started" value={user.year_started} /><Field label="PLP/College Year Graduated" value={user.graduation_year} /><Field label="Last Attendance Year" value={user.last_attendance_year} />
      </dl></section>
      <section className="trace-admin-profile-card"><h4 className="trace-section-title">Personal information</h4><dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
        <Field label="Contact Number" value={user.phone_number} /><Field label="Extension Name" value={user.extension_name} /><Field label="Birth Date" value={user.birth_date ? new Date(user.birth_date).toLocaleDateString('en-PH') : null} /><Field label="Place of Birth" value={user.place_of_birth} /><Field label="Sex" value={user.sex} /><Field label="Civil Status" value={user.civil_status} /><Field label="Maiden Name" value={user.maiden_name} /><Field label="Home Address" value={user.home_address} />
      </dl></section>
      <section className="trace-admin-profile-card"><h4 className="trace-section-title">Education history</h4><dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5">
        <Field label="Previous School" value={user.previous_school} wide /><Field label="Elementary School" value={user.elem_school} /><Field label="Elementary Year Graduated" value={user.elem_grad_year} /><Field label="Junior High School" value={user.jhs_school} /><Field label="Junior High Year Graduated" value={user.jhs_grad_year} /><Field label="Senior High School" value={user.shs_school} /><Field label="Senior High Year Graduated" value={user.shs_grad_year} />
      </dl></section>
      <RegistrationProof path={user.id_proof_path} compact />
    </div>
  </div>;
}
