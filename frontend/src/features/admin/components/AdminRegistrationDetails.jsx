import EmailText from '@/components/EmailText';
import AdminIcon from './AdminIcon';
import { USER_TYPE_LABELS } from '@/utils/userLabels';
import { registrationChecks } from '@/utils/registrationChecks';

export default function AdminRegistrationDetails({ student }) {
  const fields = [['review-id1', 'ID Number', student.student_id], ['review-cap', 'Course / Program', student.program], ['review-school', 'College', student.college_name || student.course], ['review-mail', 'Email', student.email], ...(student.user_type !== 'alumni' ? [['review-user', 'Type of Student', student.study_load === 'irregular' ? 'Irregular' : student.study_load === 'regular' ? 'Regular' : 'Not recorded']] : [])];
  return <div className="min-w-0 space-y-4">
    <section className="trace-admin-review-details">
      <header className="flex min-w-0 items-center gap-3.5 px-[18px] py-[18px]"><span aria-hidden="true" className="trace-admin-initials">{(student.full_name || '?').split(' ').slice(0, 2).map(name => name[0]).join('')}</span><div className="min-w-0"><h4 className="select-text break-words text-base font-semibold">{student.full_name}</h4><span className="trace-admin-badge trace-admin-badge-blue mt-1"><AdminIcon name="review-user" />{USER_TYPE_LABELS[student.user_type] || 'Student'}</span></div></header>
      <dl>{fields.map(([icon, label, value]) => <div key={label} className="trace-admin-review-field"><dt className="flex items-center gap-2.5"><AdminIcon name={icon} />{label}</dt><dd className={'min-w-0 select-text break-words text-right font-semibold ' + (label === 'ID Number' ? 'font-mono' : '')}>{label === 'Email' && value ? <EmailText value={value} /> : value || 'Not entered'}</dd></div>)}</dl>
    </section>
    <section aria-label="Registration review reason" className="trace-admin-review-notice">
      <h4 className="flex items-center gap-2.5 text-sm font-semibold"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900"><AdminIcon name="review-alert" /></span>Awaiting manual proof review</h4>
      <p className="my-3 text-[13px] leading-relaxed">{student.verification_reason || 'The automatic-check reason was not recorded for this account. Inspect the uploaded proof and account details.'}</p>
      <div className="overflow-hidden rounded-xl border border-amber-200 bg-white dark:border-amber-800 dark:bg-gray-900"><h5 className="flex items-center gap-2 border-b border-amber-100 px-3.5 py-2.5 text-[11px] font-semibold tracking-wider text-slate-500 dark:border-amber-800 dark:text-gray-300"><AdminIcon name="review-scan" />OCR CHECKS</h5>
        <dl>{registrationChecks(student.verification_reason).map(({label, read}) => <div key={label} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3.5 py-2.5 last:border-0 dark:border-gray-700"><dt className="text-[13px]">{label}</dt><dd className={'trace-admin-badge rounded-full border ' + (read === true ? 'trace-admin-badge-green border-emerald-200' : read === false ? 'trace-admin-badge-amber border-amber-200' : 'trace-admin-badge-neutral border-gray-200')}>
          {read !== null && <AdminIcon name={read ? 'review-check' : 'review-alert1'} />}{read === true ? 'Read' : read === false ? 'Not confirmed' : 'Not recorded'}
        </dd></div>)}</dl>
      </div>
      <p className="trace-admin-caption mt-3 leading-relaxed">Pending review does not mean the proof is fake. Only the Registrar’s review determines approval or rejection.</p>
    </section>
  </div>;
}
