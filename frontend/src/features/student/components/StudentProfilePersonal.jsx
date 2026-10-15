import PhoneInput from '@/components/PhoneInput';
import RegistrationProof from '@/components/RegistrationProof';
import AcademicProfileFields from '@/components/AcademicProfileFields';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import { namePartsError, receiptStudentName } from '@/utils/receiptStudentName';
import { getProfileCompletion } from '@/utils/profileCompletion';
import StudentIcon from './StudentIcon';
import StudentProfileSection, { StudentProfileInput } from './StudentProfileSection';

export default function StudentProfilePersonal({ user, profileData, setField, saving, children }) {
  const missing = new Map(getProfileCompletion({ ...user, ...profileData }).missing.map(item => [item.field, item.label]));
  const receiptError = namePartsError(profileData, user);
  const warning = field => missing.has(field) && <p id={'profile-' + field + '-needed'} className="trace-student-profile-hint text-amber-800 dark:text-amber-200">Required: {missing.get(field)}.</p>;
  const input = (field, label, { icon, type = 'text', required = false, marked = false, limit = INPUT_LIMITS.name } = {}) => <div className="min-w-0">
    <label className="trace-label mb-2 block" htmlFor={'profile-' + field}>{label}{(required || marked) && <span className="text-red-500 dark:text-red-300"> *</span>}</label>
    {icon ? <StudentProfileInput icon={icon}><input id={'profile-' + field} aria-describedby={missing.has(field) ? 'profile-' + field + '-needed' : undefined} type={type} maxLength={type === 'date' ? undefined : limit} required={required} disabled={saving} value={profileData[field] || ''} onChange={e => setField(field, e.target.value)} className="trace-control w-full" /></StudentProfileInput>
      : <input id={'profile-' + field} aria-describedby={missing.has(field) ? 'profile-' + field + '-needed' : undefined} type={type} maxLength={limit} required={required} disabled={saving} value={profileData[field] || ''} onChange={e => setField(field, e.target.value)} aria-invalid={receiptError && ['first_name', 'middle_name', 'last_name'].includes(field) ? true : undefined} aria-describedby={receiptError && ['first_name', 'middle_name', 'last_name'].includes(field) ? 'profile-receipt-name-error' : missing.has(field) ? 'profile-' + field + '-needed' : undefined} className="trace-control w-full" />}
    {warning(field)}
  </div>;
  return <div className="space-y-4">
    <RegistrationProof student label="Proof of ID" path={user.id_proof_path} />
    <StudentProfileSection title="Contact details" icon="profile-72803" description="How the Registrar and Finance can reach you.">
      <div className="trace-student-contact-grid">
        <div><label htmlFor="profile-phone_number" className="trace-label mb-2 block">Phone Number <span className="text-red-500 dark:text-red-300">*</span></label>
          <StudentProfileInput icon="profile-24012"><PhoneInput id="profile-phone_number" aria-describedby={missing.has('phone_number') ? 'profile-phone_number-needed' : undefined} value={profileData.phone_number} onChange={e => setField('phone_number', e.target.value)} disabled={saving} required className="trace-control w-full" /></StudentProfileInput>{warning('phone_number')}
        </div><div className="min-w-0">{children}</div>
      </div>
    </StudentProfileSection>
    <StudentProfileSection title="Name on Official Receipts" icon="profile-e78cb">
      <p className="trace-student-profile-hint select-text">Saved Full Name: <strong className="text-gray-900 dark:text-gray-100">{user.full_name}</strong></p>
      <p className="trace-student-profile-guidance"><StudentIcon name="profile-24570" /><span>Confirm the parts of your saved name once. Finance uses them automatically as Last name, First name M.I. Existing receipts retain their original names. Keep compound given names and surnames together; leave Middle Name blank if you have none.</span></p>
      <div className="trace-form-grid">{input('first_name', 'First Name', { marked: true })}{input('middle_name', 'Middle Name (optional)')}{input('last_name', 'Last Name', { marked: true })}{input('extension_name', 'Extension Name', { limit: INPUT_LIMITS.shortCode })}</div>
      {receiptError ? <p id="profile-receipt-name-error" role="alert" className="trace-inline-error">{receiptError}</p> : <p className="trace-student-profile-guidance"><StudentIcon name="profile-e9370" /><span className="select-text">New receipt name: {receiptStudentName({ ...user, ...profileData })}</span></p>}
    </StudentProfileSection>
    <StudentProfileSection title="College and program" icon="profile-5cd0d"><AcademicProfileFields student user={user} profileData={profileData} setField={setField} busy={saving} /></StudentProfileSection>
    <StudentProfileSection title="Personal details" icon="profile-2e306">
      <div className="trace-form-grid">
        {input('birth_date', 'Birth Date', { icon: 'profile-01269', type: 'date', required: true })}
        {input('place_of_birth', 'Place of Birth', { icon: 'profile-8695f', required: true })}
        {[['sex', 'Sex', ['Male', 'Female']], ['civil_status', 'Civil Status', ['Single', 'Married', 'Widowed', 'Divorced', 'Separated']]].map(([field, label, options]) => <div key={field}>
          <label className="trace-label mb-2 block" htmlFor={'profile-' + field}>{label} <span className="text-red-500 dark:text-red-300">*</span></label>
          <div className="trace-student-profile-select"><select id={'profile-' + field} aria-describedby={missing.has(field) ? 'profile-' + field + '-needed' : undefined} required disabled={saving} value={profileData[field] || ''} onChange={e => setField(field, e.target.value)} className="trace-control w-full"><option value="">Select...</option>{options.map(value => <option key={value}>{value}</option>)}</select><StudentIcon name="profile-12e5c" /></div>{warning(field)}
        </div>)}
        {profileData.sex === 'Female' && profileData.civil_status === 'Married' && input('maiden_name', 'Maiden Name', { required: true })}
      </div>
    </StudentProfileSection>
    <StudentProfileSection title="Home address" icon="profile-b4095"><div><label className="trace-label mb-2 block" htmlFor="profile-home_address">Home Address <span className="text-red-500 dark:text-red-300">*</span></label>
      <textarea id="profile-home_address" aria-describedby={missing.has('home_address') ? 'profile-home_address-needed' : undefined} maxLength={INPUT_LIMITS.address} disabled={saving} value={profileData.home_address || ''} onChange={e => setField('home_address', e.target.value)} required rows={3} className="trace-control w-full resize-y" />{warning('home_address')}</div>
    </StudentProfileSection>
  </div>;
}
