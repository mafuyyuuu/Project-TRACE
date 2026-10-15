import PhoneInput from '@/components/PhoneInput';
import { normalizePhoneNumber } from '@/utils/phoneNumber';
import { fullNameFromParts } from '@/utils/receiptStudentName';
import Button from '@/components/Button';
import { INPUT_LIMITS } from '@/utils/inputLimits';
import ReviewSummary from '@/components/ReviewSummary';
import ProfileYearField from '@/components/ProfileYearField';
import { signupFieldErrors, signupServerField } from '@/utils/signupValidation';
import ConfirmDialog from '@/components/ConfirmDialog'
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import { getColleges, getPrograms } from '@/services/referenceService'
import RegistrationPrivacyNotice from '@/components/RegistrationPrivacyNotice'
import { PRIVACY_NOTICE_VERSION } from '@/utils/registrationPrivacy'
import ModalShell from '@/components/ModalShell'
import PlpBrand from '@/components/PlpBrand'
import FileUploadField from '@/components/FileUploadField'
import useNotificationDismissal from '@/hooks/useNotificationDismissal'

export default function SignupPage() {
  const { register, loading } = useAuth()
  const [formData, setFormData] = useState({ employeeId: '', first_name: '', middle_name: '', last_name: '', email: '', phoneNumber: '', password: '', confirmPassword: '', userType: new URLSearchParams(window.location.search).get('applicant') === 'alumni' ? 'alumni' : 'student', college: '', program: '', year_started: '', graduation_year: '', proofUnavailable: false, proofReason: '', privacyAcknowledged: false })
  const submitGuard = useRef(false)
  const [file, setFile] = useState(null)
  const [localError, setLocalError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState('')
  const [registrationToConfirm, setRegistrationToConfirm] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  // Colleges are admin-managed reference data rather than a hardcoded list.
  const [colleges, setColleges] = useState([])
  const [programs, setPrograms] = useState([])
  const [catalog, setCatalog] = useState({ loading: true, error: '' })
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [showPrivacy, setShowPrivacy] = useState(false)
  useNotificationDismissal(() => setSuccess(''));

  useEffect(() => {
    let cancelled = false
    Promise.all([getColleges(), getPrograms()])
      .then(([collegeData, programData]) => {
        if (!Array.isArray(collegeData?.colleges) || !Array.isArray(programData?.programs)) throw new Error('Invalid academic catalog.');
        if (!cancelled) {
          setColleges(collegeData.colleges); setPrograms(programData.programs);
          setCatalog({ loading: false, error: '' });
        }
      })
      .catch(() => {
        if (!cancelled) {
          const message = 'Could not load colleges and programs. Retry Catalog or contact the Registrar.';
          setCatalog({ loading: false, error: message });
        }
      })
    return () => { cancelled = true }
  }, [catalogAttempt])
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()

  const fullName = fullNameFromParts(formData);
  const selectedCollege = colleges.find(college => college.name === formData.college);
  const availablePrograms = programs.filter(program => String(program.college_id) === String(selectedCollege?.id));
  const setFields = patch => {
    setFormData(current => ({ ...current, ...patch }));
    setFieldErrors(current => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[field];
      if (Object.hasOwn(patch, 'password')) delete next.confirmPassword;
      if (Object.hasOwn(patch, 'year_started')) delete next.graduation_year;
      if (['first_name', 'middle_name', 'last_name'].some(field => Object.hasOwn(patch, field))) {
        for (const field of ['first_name', 'middle_name', 'last_name']) delete next[field];
      }
      if (Object.hasOwn(patch, 'userType') || Object.hasOwn(patch, 'proofUnavailable')) {
        for (const field of ['year_started', 'graduation_year', 'proofReason', 'proof']) delete next[field];
      }
      return next;
   });
    setLocalError('');
  };
  const fieldProps = field => ({ id: `signup-${field}`, 'aria-invalid': Boolean(fieldErrors[field]), 'aria-describedby': fieldErrors[field] ? `signup-${field}-error` : undefined });
  const fieldFeedback = field => fieldErrors[field] && <p id={`signup-${field}-error`} className="mt-1 text-xs leading-relaxed text-red-700 dark:text-red-300">{fieldErrors[field]}</p>;
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccess('')
    const errors = signupFieldErrors(formData, { colleges, programs, file, catalog });
    setFieldErrors(errors);
    if (Object.keys(errors).length) { setLocalError('Please check the highlighted fields above.'); return; }
    
      const form = new FormData();
      form.append('employee_id', formData.employeeId.trim());
      form.append('full_name', fullName);
      for (const field of ['first_name', 'middle_name', 'last_name']) form.append(field, formData[field].trim());
      form.append('email', formData.email.trim());
      form.append('phone_number', normalizePhoneNumber(formData.phoneNumber));
      form.append('password', formData.password);
      form.append('user_type', formData.userType);
      form.append('course', formData.college);
      form.append('program', formData.program || '');
      form.append('privacy_acknowledged', 'true');
      form.append('privacy_notice_version', PRIVACY_NOTICE_VERSION);
      const college = colleges.find(college => college.name === formData.college);
      if (college) form.append('college_id', String(college.id));
      if (formData.userType === 'alumni') { form.append('year_started', formData.year_started); form.append('graduation_year', formData.graduation_year); }
      if (formData.proofUnavailable && formData.userType === 'alumni') {
        form.append('registration_proof_unavailable', 'true'); form.append('registration_proof_reason', formData.proofReason.trim());
      } else if (file) form.append('id_proof', file);

    setRegistrationToConfirm(form)
  }

  const confirmRegistration = async () => {
    if (!registrationToConfirm || submitGuard.current) return
    submitGuard.current = true
    setLocalError('')
    try {
      const result = await register(registrationToConfirm)
      setRegistrationToConfirm(null)
      setSuccess([result.message || 'Registration successful. Please wait for admin verification.', result.verification_reason].filter(Boolean).join(' '))
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message ||
        (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT'
          ? 'Registration took too long to respond. Your account may already be saved. Check Login or contact the Registrar before trying again.'
          : 'Registration failed. Check your connection and try again, or contact the Registrar.');
      const field = signupServerField(message);
      if (field) { setFieldErrors({ [field]: message }); setLocalError('Please check the highlighted field above.'); }
      else setLocalError(message);
      setRegistrationToConfirm(null);
    } finally { submitGuard.current = false }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 font-body relative">
      <ModalShell open={showPrivacy} title="Registration Privacy Notice" onClose={() => setShowPrivacy(false)}
        maxWidth="max-w-2xl" footer={<Button type="button" className="trace-button trace-button-primary" onClick={() => setShowPrivacy(false)}>Close Notice</Button>}>
        <RegistrationPrivacyNotice />
      </ModalShell>
      <ConfirmDialog open={!!registrationToConfirm} title="Confirm Registration" presentation="review"
        message="Submit your registration for identity review?"
        confirmLabel="Submit Registration" loading={loading} onConfirm={confirmRegistration}
        onCancel={() => setRegistrationToConfirm(null)}>
        {registrationToConfirm && <ReviewSummary entries={[
          ['Name', registrationToConfirm.get('full_name')], ['ID Number', registrationToConfirm.get('employee_id')],
          ['College', registrationToConfirm.get('course')], ['Email', registrationToConfirm.get('email')],
          ['Program/Course', registrationToConfirm.get('program')],
          ['Privacy Notice', 'Acknowledged · ' + registrationToConfirm.get('privacy_notice_version')],
          ...(registrationToConfirm.get('user_type') === 'alumni' ? [['Year Started', registrationToConfirm.get('year_started')], ['Year Graduated', registrationToConfirm.get('graduation_year')]] : []),
          ['Proof', registrationToConfirm.get('registration_proof_unavailable') ? 'Unavailable — pending Admin identity review' : registrationToConfirm.get('id_proof')?.name],
          ...(registrationToConfirm.get('registration_proof_unavailable') ? [['Missing Proof Reason', registrationToConfirm.get('registration_proof_reason')]] : []),
        ]} />}
        {registrationToConfirm?.get('id_proof') instanceof File && <div className="mt-4"><FileUploadField label="Attached Proof" file={registrationToConfirm.get('id_proof')} allowReplace={false} compactPreview /></div>}
      </ConfirmDialog>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-pine-500/5 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-500/5 dark:bg-blue-500/5 blur-[100px]"></div>
      </div>

      <header className="pointer-events-none relative top-0 z-30 w-full bg-transparent px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 md:sticky">
        <Link to="/" className="trace-action pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-transparent px-3 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Login
        </Link>
      </header>

      <main className="relative z-10 flex w-full flex-col items-center px-4 py-8 sm:py-12">
      <div className="trace-section trace-section-body max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4"><PlpBrand /></div>
          <h1 className="trace-page-title mb-2">TRACE Sign Up</h1>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">PLP Registrar's Office</p>
        </div>

        {success ? (
          <ModalShell open title="Registration Complete" onClose={() => navigate('/')} footer={<Button type="button" onClick={() => navigate('/')} className="trace-button trace-button-primary w-full">Close and Go to Login</Button>}>
            <p className="text-sm leading-relaxed">{success}</p>
          </ModalShell>
        ) : (
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-account-type" className="trace-label ml-1">Account Type *</label>
              <select id="signup-account-type" disabled={loading} value={formData.userType} onChange={(e) => setFields({ userType: e.target.value, employeeId: '', proofUnavailable: false })} className="trace-control w-full appearance-none cursor-pointer">
                <option value="student">Current Student</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-college" className="trace-label ml-1">College *</label>
              <select {...fieldProps('college')} required disabled={loading || catalog.loading || !!catalog.error} value={formData.college} onChange={(e) => setFields({ college: e.target.value, program: '' })} className="trace-control w-full appearance-none cursor-pointer">
                  <option value="" disabled>
                    {catalog.loading ? 'Loading colleges...' : 'Select your college...'}
                  </option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
              {fieldFeedback('college')}
              {catalog.error && <div className="space-y-2 text-sm"><p>{catalog.error}</p><Button type="button" disabled={loading} className="trace-button trace-button-secondary" onClick={() => { setCatalog({ loading: true, error: '' }); setCatalogAttempt(attempt => attempt + 1); }}>Retry Catalog</Button></div>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-employeeId" className="trace-label ml-1">{formData.userType === 'alumni' ? 'Alumni ID *' : 'Student ID *'}</label>
              <input {...fieldProps('employeeId')} maxLength={INPUT_LIMITS.id} type="text" placeholder={formData.userType === 'alumni' ? 'Enter your Alumni ID' : 'e.g. 23-00123'} value={formData.employeeId} onChange={(e) => setFields({ employeeId: e.target.value })} className="trace-control w-full" />
              {fieldFeedback('employeeId')}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="signup-program" className="trace-label ml-1">Program/Course *</label>
              <select {...fieldProps('program')} required aria-describedby={['signup-program-help', fieldErrors.program && 'signup-program-error'].filter(Boolean).join(' ')} value={formData.program}
                disabled={loading || catalog.loading || !!catalog.error || !selectedCollege || !availablePrograms.length}
                onChange={event => setFields({ program: event.target.value })} className="trace-control w-full min-w-0 cursor-pointer">
                <option value="" disabled>{!selectedCollege ? 'Select your college first' : !availablePrograms.length ? 'No programs available' : 'Select your program...'}</option>
                {availablePrograms.map(program => <option key={program.id} value={program.name}>{program.name}</option>)}
              </select>
              {fieldFeedback('program')}
              <p id="signup-program-help" className="ml-1 text-xs text-gray-600 dark:text-gray-300 break-words">{formData.program || (selectedCollege && !catalog.loading && !catalog.error && !availablePrograms.length ? 'No active programs are listed for this college. Contact the Registrar before registering.' : 'Choose the program recorded in your school records. If it is missing, contact the Registrar.')}</p>
            </div>

            {formData.userType === 'alumni' && <section className="trace-form-grid rounded-lg bg-gray-50 p-4 dark:bg-gray-800" aria-label="Alumni study years">
              <ProfileYearField field="year_started" label="Year Started" required validate={false} error={fieldErrors.year_started} value={formData.year_started} disabled={loading} onChange={value => setFields({ year_started: value })} />
              <ProfileYearField field="graduation_year" label="Year Graduated" required validate={false} error={fieldErrors.graduation_year} value={formData.graduation_year} disabled={loading} onChange={value => setFields({ graduation_year: value })} />
              <p className="col-span-full text-xs text-gray-600 dark:text-gray-300">Enter these once. Graduation must be within 10 years of starting. Saved years are reused for requests; corrections need Admin review.</p>
            </section>}

            <section className="space-y-3" aria-label="Student name">
              <p className="text-xs">Enter compound given names and surnames together. Your Full Name is assembled automatically; Finance uses the saved parts on receipts.</p>
              {[['first_name', 'First Name *'], ['middle_name', 'Middle Name (optional)'], ['last_name', 'Last Name *']].map(([field, label]) => <div key={field}><label className="trace-label block" htmlFor={`signup-${field}`}>{label}
                <input {...fieldProps(field)} required={field !== 'middle_name'} maxLength={INPUT_LIMITS.name} disabled={loading}
                  value={formData[field]} onChange={event => setFields({ [field]:event.target.value })} className="trace-control mt-2 w-full" />
              </label>{fieldFeedback(field)}</div>)}
              <label className="trace-label block">Full Name<input type="text" readOnly value={fullName} placeholder="Juan Dela Cruz" className="trace-control mt-2 w-full" /></label>
            </section>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-email" className="trace-label ml-1">Email Address *</label>
              <input {...fieldProps('email')} type="email" maxLength={INPUT_LIMITS.email} placeholder="juan@plp.edu.ph" value={formData.email} onChange={(e) => setFields({ email: e.target.value })} className="trace-control w-full" />
              {fieldFeedback('email')}
              <p className="text-xs text-gray-500 dark:text-gray-400">After your first login, verify this address from Edit Profile before requesting documents.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-phoneNumber" className="trace-label ml-1">Phone Number *</label>
              <PhoneInput {...fieldProps('phoneNumber')} value={formData.phoneNumber} onChange={(e) => setFields({ phoneNumber: e.target.value })} className="trace-control w-full" />
              {fieldFeedback('phoneNumber')}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-password" className="trace-label ml-1">Password *</label>
              <div className="relative">
                <input {...fieldProps('password')} maxLength={INPUT_LIMITS.password} type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={formData.password} onChange={(e) => setFields({ password: e.target.value })} className="trace-control w-full pr-12" />
                <Button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="trace-action absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.243 4.243l2.829 2.829M6.343 6.343l11.314 11.314M14.121 14.121A3 3 0 009.879 9.879" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </Button>
              </div>
              {fieldFeedback('password')}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-confirmPassword" className="trace-label ml-1">Confirm Password *</label>
              <div className="relative">
                <input {...fieldProps('confirmPassword')} maxLength={INPUT_LIMITS.password} type={showConfirm ? 'text' : 'password'} placeholder="Confirm your password" value={formData.confirmPassword} onChange={(e) => setFields({ confirmPassword: e.target.value })} className="trace-control w-full pr-12" />
                <Button type="button" aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'} onClick={() => setShowConfirm(!showConfirm)} className="trace-action absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.243 4.243l2.829 2.829M6.343 6.343l11.314 11.314M14.121 14.121A3 3 0 009.879 9.879" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </Button>
              </div>
              {fieldFeedback('confirmPassword')}
            </div>

            {formData.userType === 'alumni' && <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <label className="flex items-start gap-3 text-sm font-semibold">
                <input type="checkbox" className="trace-choice mt-1" checked={formData.proofUnavailable} disabled={loading}
                  onChange={event => setFields({ proofUnavailable: event.target.checked })} />
                Records / proof unavailable
              </label>
              <p className="text-xs leading-relaxed">For alumni with lost or unavailable records, including S.Y. 2018 and earlier. Your application stays pending until Admin verifies your identity. Contact the Registrar with your ID for review follow-up.</p>
              {formData.proofUnavailable && <div><label htmlFor="signup-proofReason" className="trace-label">Explain Missing Proof
                <textarea {...fieldProps('proofReason')} className="trace-control mt-2" required maxLength={500} value={formData.proofReason} disabled={loading}
                  onChange={event => setFields({ proofReason: event.target.value })} />
              </label>{fieldFeedback('proofReason')}</div>}
            </section>}

            {!formData.proofUnavailable && <div className="flex flex-col gap-1.5">
              <p className="trace-label ml-1">Upload Proof of ID{formData.userType === 'student' ? ' *' : ''}</p>
              <p className="ml-1 text-xs font-semibold text-gray-700 dark:text-gray-200">Accepted files: JPG, JPEG, PNG or PDF. Maximum size: 10 MB (one file).</p>
              <FileUploadField id="signup-proof" showLabel={false} label="Proof of ID" file={file} validationError={fieldErrors.proof}
                onChange={picked => { setFile(picked); setFieldErrors(current => ({ ...current, proof: '' })); setLocalError(''); }}
                onError={message => setFieldErrors(current => ({ ...current, proof: message }))} accept=".pdf,.png,.jpg,.jpeg" disabled={loading} />
              <p className="ml-1 text-xs text-gray-600 dark:text-gray-300">{formData.userType === 'alumni' ? 'Proof examples: your PLP Student/Alumni ID, diploma or school record showing your name and school details. The Registrar may ask for additional evidence.' : 'Use your PLP Student ID with the school name, Student ID number and college readable.'} Use a clear, complete image or scan; avoid cropped, blurred or password-protected files.</p>
            </div>}

            <section aria-label="Privacy acknowledgment" className={`space-y-3 rounded-xl border p-4 ${fieldErrors.privacyAcknowledged ? 'border-red-600 dark:border-red-400' : 'border-gray-200 dark:border-gray-700'}`}>
              <p className="text-sm leading-relaxed">TRACE uses your registration details and proof to verify your identity and provide Registrar services.</p>
              <Button type="button" className="trace-action text-sm font-semibold underline" onClick={() => setShowPrivacy(true)}>Read Privacy Notice</Button>
              <label className="flex items-start gap-3 text-sm leading-relaxed">
                <input {...fieldProps('privacyAcknowledged')} type="checkbox" required className="trace-choice mt-1 shrink-0" checked={formData.privacyAcknowledged} disabled={loading}
                  onChange={event => setFields({ privacyAcknowledged: event.target.checked })} />
                <span>I have read and acknowledge the Registration Privacy Notice. *</span>
              </label>
              {fieldFeedback('privacyAcknowledged')}
            </section>

            {localError && <p role="alert" className="text-sm leading-relaxed text-red-700 dark:text-red-300">{localError}</p>}
            <Button type="submit" disabled={loading} className="trace-button-lift trace-action mt-4 w-full py-4 bg-pine-600 enabled:hover:bg-pine-700 disabled:opacity-70 text-white rounded-full font-bold transition-colors shadow-sm flex items-center justify-center gap-2">
              {loading ? 'Creating...' : 'Create Account'}
            </Button>
          </form>
        )}

        <div className="mt-8 text-center">
        </div>
      </div>
      </main>
    </div>
  )
}
