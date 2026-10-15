import ProfileYearField from '@/components/ProfileYearField';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { getProfileCompletion } from '@/utils/profileCompletion';
import { profileEditYearErrors } from '@/utils/profileYears';
import StudentIcon from './StudentIcon';
import StudentProfileSection, { StudentProfileInput } from './StudentProfileSection';

export default function StudentProfileEducation({ user, profileData, setField, saving }) {
  const missing = new Set(getProfileCompletion({ ...user, ...profileData }).missing.map(item => item.field));
  const warning = (field, label) => missing.has(field) && <p id={'profile-' + field + '-needed'} className="trace-student-profile-hint text-amber-800 dark:text-amber-200">Required: {label}.</p>;
  const errors = profileEditYearErrors(profileData, user);
  const year = (field, required = false, readOnly = false) => <ProfileYearField field={field} value={profileData[field]} required={required} error={errors[field]} missing={missing.has(field)} readOnly={readOnly} disabled={saving} onChange={value => setField(field, value)} />;
  return <div className="space-y-4">
    <StudentProfileSection title="College" description="Saved; contact Admin for corrections." icon="profile-5cd0d"><div className="trace-form-grid">
      {year('year_started', user.user_type === 'alumni', user.year_started != null && user.year_started !== '')}
      {year('graduation_year', user.user_type === 'alumni', user.graduation_year != null && user.graduation_year !== '')}
      {year('last_attendance_year')}
      <div><label htmlFor="profile-transfer" className="trace-label mb-2 block">Transfer Student?</label><div className="trace-student-profile-select"><select id="profile-transfer" value={profileData.is_transfer_student ? 'yes' : 'no'} disabled={saving} onChange={e => setField('is_transfer_student', e.target.value === 'yes')} className="trace-control w-full"><option value="no">No</option><option value="yes">Yes</option></select><StudentIcon name="profile-12e5c" /></div></div>
      {profileData.is_transfer_student && <div className="col-span-full"><label htmlFor="profile-previous_school" className="trace-label mb-2 block">Previous School <span className="text-red-500 dark:text-red-300">*</span></label><input id="profile-previous_school" aria-describedby={missing.has('previous_school') ? 'profile-previous_school-needed' : undefined} maxLength={INPUT_LIMITS.name} value={profileData.previous_school || ''} onChange={e => setField('previous_school', e.target.value)} disabled={saving} required className="trace-control w-full" />{warning('previous_school', 'Previous School')}</div>}
    </div></StudentProfileSection>
    {[['elem', 'Elementary'], ['jhs', 'Junior High'], ['shs', 'Senior High']].map(([key, title]) => <StudentProfileSection key={key} title={title} icon="profile-19796"><div className="trace-form-grid">
      <div><label htmlFor={'profile-' + key + '_school'} className="trace-label mb-2 block">{title} School <span className="text-red-500 dark:text-red-300">*</span></label><StudentProfileInput icon="profile-bc027"><input id={'profile-' + key + '_school'} aria-describedby={missing.has(key + '_school') ? 'profile-' + key + '_school-needed' : undefined} maxLength={INPUT_LIMITS.name} disabled={saving} required value={profileData[key + '_school'] || ''} onChange={e => setField(key + '_school', e.target.value)} className="trace-control w-full" /></StudentProfileInput>{warning(key + '_school', title + ' School')}</div>
      {year(key + '_grad_year', true)}
    </div></StudentProfileSection>)}
  </div>;
}
