import useRegistrationIdCheck from '@/hooks/useRegistrationIdCheck';
import ReviewIcon from '@/components/ReviewIcon';
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
import { useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import useStepMotion from '@/hooks/useStepMotion'
import { getColleges, getPrograms } from '@/services/referenceService'
import RegistrationPrivacyNotice from '@/components/RegistrationPrivacyNotice'
import { PRIVACY_NOTICE_VERSION } from '@/utils/registrationPrivacy'
import ModalShell from '@/components/ModalShell'
import SignupShell from '@/features/auth/components/SignupShell'
import PasswordVisibilityButton from '@/components/PasswordVisibilityButton'
import FileUploadField from '@/components/FileUploadField'


const STEP_FIELDS = [
  ['userType', 'study_load', 'is_transfer_student', 'previous_school', 'college', 'employeeId', 'program', 'year_started', 'graduation_year'],
  ['first_name', 'middle_name', 'last_name', 'email', 'phoneNumber'],
  ['password', 'confirmPassword', 'proof', 'proofReason', 'privacyAcknowledged'],
];

export default function SignupPage() {
  const { register, loading } = useAuth()
  const [formData, setFormData] = useState({ employeeId: '', first_name: '', middle_name: '', last_name: '', email: '', phoneNumber: '', password: '', confirmPassword: '', study_load: '', is_transfer_student: '', previous_school: '', userType: new URLSearchParams(window.location.search).get('applicant') === 'alumni' ? 'alumni' : 'student', college: '', program: '', year_started: '', graduation_year: '', proofUnavailable: false, proofReason: '', privacyAcknowledged: false })
  const submitGuard = useRef(false)
  const idCheck = useRegistrationIdCheck();
  const [file, setFile] = useState(null)
  const [localError, setLocalError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [success, setSuccess] = useState('')
  const [verificationStatus,setVerificationStatus] = useState('pending')
  const [registrationToConfirm, setRegistrationToConfirm] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  // Colleges are admin-managed reference data rather than a hardcoded list.
  const [colleges, setColleges] = useState([])
  const [programs, setPrograms] = useState([])
  const [catalog, setCatalog] = useState({ loading: true, error: '' })
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [step, setStep] = useState(1);
  const headingRef = useRef(null);
  const formRef = useRef(null);
  useStepMotion(formRef, success ? 4 : step);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, [step, success]);

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
    if (step === 1) idCheck.invalidate();
    const resetTransfer = Object.hasOwn(patch, 'userType') || Object.hasOwn(patch, 'study_load');
    setFormData(current => ({ ...current, ...patch, ...(resetTransfer ? { is_transfer_student: '', previous_school: '' } : {}) }));
    setFieldErrors(current => {
      const next = { ...current };
      for (const field of Object.keys(patch)) delete next[field];
      if (resetTransfer) { delete next.is_transfer_student; delete next.previous_school; }
      if (Object.hasOwn(patch, 'is_transfer_student')) delete next.previous_school;
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
  const fieldError = field => fieldErrors[field] || (field === 'employeeId' ? idCheck.error : '');
  const fieldProps = field => ({ id: `signup-${field}`, 'aria-invalid': Boolean(fieldError(field)), 'aria-describedby': fieldError(field) ? `signup-${field}-error` : undefined });
  const fieldFeedback = field => fieldError(field) && <p id={`signup-${field}-error`} className="mt-1 text-xs leading-relaxed text-red-700 dark:text-red-300">{fieldError(field)}</p>;
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccess('')
    const errors = signupFieldErrors(formData, { colleges, programs, file, catalog });
    const scoped = step < 3 ? Object.fromEntries(Object.entries(errors).filter(([field]) => STEP_FIELDS[step - 1].includes(field))) : errors;
    setFieldErrors(scoped);
    if (Object.keys(scoped).length) {
      const first = Object.keys(scoped)[0];
      setStep(STEP_FIELDS.findIndex(fields => fields.includes(first)) + 1 || step);
      setLocalError('Please check the highlighted fields.');
      return;
    }
    if (step === 1) {
      if (await idCheck.check(formData.employeeId)) setStep(2);
      return;
    }
    if (step === 2) { setStep(3); return; }
    
      const form = new FormData();
      form.append('employee_id', formData.employeeId.trim());
      form.append('full_name', fullName);
      for (const field of ['first_name', 'middle_name', 'last_name']) form.append(field, formData[field].trim());
      form.append('email', formData.email.trim());
      form.append('phone_number', normalizePhoneNumber(formData.phoneNumber));
      form.append('password', formData.password);
      form.append('user_type', formData.userType);
      if (formData.userType === 'student') {
        form.append('study_load', formData.study_load);
        if (formData.study_load === 'irregular') {
          form.append('is_transfer_student', formData.is_transfer_student);
          if (formData.is_transfer_student === 'true') form.append('previous_school', formData.previous_school.trim());
        }
      }
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
      setVerificationStatus(result.verification_status || 'pending')
      setSuccess([result.message || 'Registration successful. Please wait for admin verification.', result.verification_reason].filter(Boolean).join(' '))
    } catch (err) {
      const message = err.response?.data?.error || err.response?.data?.message ||
        (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT'
          ? 'Registration took too long to respond. Your account may already be saved. Check Login or contact the Registrar before trying again.'
          : 'Registration failed. Check your connection and try again, or contact the Registrar.');
      const field = signupServerField(message);
      if (field) { setStep(STEP_FIELDS.findIndex(fields => fields.includes(field)) + 1 || 3); setFieldErrors({ [field]: message }); setLocalError('Please check the highlighted field above.'); }
      else setLocalError(message);
      setRegistrationToConfirm(null);
    } finally { submitGuard.current = false }
  }

  return <SignupShell step={step} complete={Boolean(success)}>
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
          ['Program', registrationToConfirm.get('program')],
          ...(formData.userType === 'student' ? [['Type of Student', formData.study_load === 'irregular' ? 'Irregular' : 'Regular']] : []),
          ...(registrationToConfirm.get('study_load') === 'irregular' ? [['Transfer Student', registrationToConfirm.get('is_transfer_student') === 'true' ? 'Yes' : 'No']] : []),
          ...(registrationToConfirm.get('is_transfer_student') === 'true' ? [['Previous School', registrationToConfirm.get('previous_school')]] : []),
          ['Privacy Notice', 'Acknowledged · ' + registrationToConfirm.get('privacy_notice_version')],
          ...(registrationToConfirm.get('user_type') === 'alumni' ? [['Year Started', registrationToConfirm.get('year_started')], ['Year Graduated', registrationToConfirm.get('graduation_year')]] : []),
          ['Proof', registrationToConfirm.get('registration_proof_unavailable') ? 'Unavailable — pending Admin identity review' : registrationToConfirm.get('id_proof')?.name],
          ...(registrationToConfirm.get('registration_proof_unavailable') ? [['Missing Proof Reason', registrationToConfirm.get('registration_proof_reason')]] : []),
        ]} />}
        {registrationToConfirm?.get('id_proof') instanceof File && <div className="mt-4"><FileUploadField label="Attached Proof" file={registrationToConfirm.get('id_proof')} allowReplace={false} compactPreview /></div>}
      </ConfirmDialog>
      <div className="trace-signup-card">
        {success ? <div ref={formRef} className="trace-signup-complete">
          <div className="trace-signup-complete-mark" aria-hidden="true"><ReviewIcon name="154c2" /></div>
          <p className="trace-signup-step-label">REGISTRATION SUBMITTED</p>
          <h1 ref={headingRef} tabIndex={-1}>Registration complete</h1>
          <p role="status">{success}</p>
          <span className="trace-signup-pending"><ReviewIcon name="3e1a9" />{verificationStatus === 'verified' ? 'Account verified' : 'Awaiting account verification'}</span>
          <section className="trace-signup-next"><h2>What happens next</h2>{[['659bd','Account created','Your registration has been saved.'],['4b210','Registration review',verificationStatus === 'verified' ? 'Your account verification is complete.' : 'Admin verifies your identity and school details.'],['6461b','Ready to log in','You can sign in once your account is verified.']].map(([icon,title,description]) => <div key={title}><ReviewIcon name={icon} /><div><strong>{title}</strong><p>{description}</p></div></div>)}</section>
          <p className="trace-signup-help"><ReviewIcon name="d1c88" />Need help sooner? Contact the Registrar with your ID for review follow-up.</p>
          <Button type="button" onClick={() => navigate('/')} className="trace-button trace-signup-primary">Go to Login</Button>
        </div> : <>
          <header className="trace-signup-heading">
            <ol className="trace-signup-progress" aria-label="Registration progress">{[1,2,3].map(number => <li key={number} data-complete={number <= step} aria-current={number === step ? 'step' : undefined}><span className="sr-only">Step {number}{number < step ? ' complete' : ''}</span></li>)}</ol>
            <p className="trace-signup-step-label">STEP {step} OF 3</p>
            <h1 ref={headingRef} tabIndex={-1}>{['Academic details', 'Personal information', 'Account & verification'][step - 1]}</h1>
            <p>{['Enter your details exactly as they appear in your school records.', 'We use these details on your document requests and receipts.', 'Secure your account and verify your identity.'][step - 1]}</p>
          </header>
          <form ref={formRef} noValidate onSubmit={handleSubmit} className="trace-signup-form" aria-busy={loading || idCheck.checking}>
            {step === 1 && <>
            <fieldset className="space-y-[6px]"><legend className="trace-label mb-[6px]">Account Type *</legend>
              <div className="trace-signup-account-types">{[['student', 'Current Student'], ['alumni', 'Alumni']].map(([type, label]) => <Button key={type} type="button" disabled={loading} aria-pressed={formData.userType === type} onClick={() => setFields({ userType: type, employeeId: '', proofUnavailable: false })}>{label}</Button>)}</div>
            </fieldset>
            {formData.userType === 'student' && <div><label htmlFor="signup-study_load" className="trace-label mb-[6px] block">Type of Student *</label>
              <select {...fieldProps('study_load')} className="trace-control" required disabled={loading} value={formData.study_load} onChange={event => setFields({ study_load: event.target.value })}>
                <option value="" disabled>Select student type...</option><option value="regular">Regular</option><option value="irregular">Irregular</option>
              </select>{fieldFeedback('study_load')}</div>}
            {formData.userType === 'student' && formData.study_load === 'irregular' && <>
              <div><label htmlFor="signup-is_transfer_student" className="trace-label mb-[6px] block">Are you a transfer student? *</label>
                <select {...fieldProps('is_transfer_student')} className="trace-control" required disabled={loading} value={formData.is_transfer_student} onChange={event => setFields({ is_transfer_student: event.target.value, previous_school: '' })}>
                  <option value="" disabled>Select an answer...</option><option value="false">No</option><option value="true">Yes</option>
                </select>{fieldFeedback('is_transfer_student')}</div>
              {formData.is_transfer_student === 'true' && <div><label htmlFor="signup-previous_school" className="trace-label mb-[6px] block">Previous School *</label>
                <input {...fieldProps('previous_school')} className="trace-control" required disabled={loading} maxLength={INPUT_LIMITS.name} value={formData.previous_school} onChange={event => setFields({ previous_school: event.target.value })} />{fieldFeedback('previous_school')}</div>}
            </>}
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

            <div className="trace-signup-two-fields">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-employeeId" className="trace-label ml-1">{formData.userType === 'alumni' ? 'Alumni ID *' : 'Student ID *'}</label>
              <input {...fieldProps('employeeId')} maxLength={INPUT_LIMITS.id} type="text" placeholder={formData.userType === 'alumni' ? 'Enter your Alumni ID' : 'e.g. 23-00123'} value={formData.employeeId} onChange={(e) => setFields({ employeeId: e.target.value })} className="trace-control w-full" />
              {fieldFeedback('employeeId')}
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor="signup-program" className="trace-label ml-1">Program *</label>
              <select {...fieldProps('program')} required aria-describedby={['signup-program-help', fieldErrors.program && 'signup-program-error'].filter(Boolean).join(' ')} value={formData.program}
                disabled={loading || catalog.loading || !!catalog.error || !selectedCollege || !availablePrograms.length}
                onChange={event => setFields({ program: event.target.value })} className="trace-control w-full min-w-0 cursor-pointer">
                <option value="" disabled>{!selectedCollege ? 'Select your college first' : !availablePrograms.length ? 'No programs available' : 'Select your program...'}</option>
                {availablePrograms.map(program => <option key={program.id} value={program.name}>{program.name}</option>)}
              </select>
              {fieldFeedback('program')}

            </div>

            </div>
              <p id="signup-program-help" className="ml-1 text-xs text-gray-600 dark:text-gray-300 break-words">{formData.program || (selectedCollege && !catalog.loading && !catalog.error && !availablePrograms.length ? 'No active programs are listed for this college. Contact the Registrar before registering.' : 'Choose the program recorded in your school records. If it is missing, contact the Registrar.')}</p>

            {formData.userType === 'alumni' && <section className="trace-form-grid rounded-lg bg-gray-50 p-4 dark:bg-gray-800" aria-label="Alumni study years">
              <ProfileYearField field="year_started" label="Year Started" required validate={false} error={fieldErrors.year_started} value={formData.year_started} disabled={loading} onChange={value => setFields({ year_started: value })} />
              <ProfileYearField field="graduation_year" label="Year Graduated" required validate={false} error={fieldErrors.graduation_year} value={formData.graduation_year} disabled={loading} onChange={value => setFields({ graduation_year: value })} />
              <p className="col-span-full text-xs text-gray-600 dark:text-gray-300">Enter these once. Graduation must be within 10 years of starting. Saved years are reused for requests; corrections need Admin review.</p>
            </section>}

            </>}
            {step === 2 && <>
            <section className="space-y-3" aria-label="Student name">
              <p className="text-xs">Enter compound given names and surnames together. Your Full Name is assembled automatically; Finance uses the saved parts on receipts.</p>
              <div className="trace-signup-name-fields">{[['first_name', 'First Name *'], ['middle_name', 'Middle Name (optional)'], ['last_name', 'Last Name *']].map(([field, label]) => <div key={field}><label className="trace-label block" htmlFor={`signup-${field}`}>{field === 'middle_name' ? <>Middle Name<span className="sr-only"> (optional)</span></> : label}
                <input {...fieldProps(field)} required={field !== 'middle_name'} maxLength={INPUT_LIMITS.name} disabled={loading}
                  value={formData[field]} onChange={event => setFields({ [field]:event.target.value })} className="trace-control mt-2 w-full" />
              </label>{fieldFeedback(field)}</div>)}</div>
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

            </>}
            {step === 3 && <>
            <div className="trace-signup-two-fields">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-password" className="trace-label ml-1">Password *</label>
              <div className="relative">
                <input {...fieldProps('password')} maxLength={INPUT_LIMITS.password} type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={formData.password} onChange={(e) => setFields({ password: e.target.value })} className="trace-control w-full pr-12" />
                <PasswordVisibilityButton icon={!showPassword && <ReviewIcon name="a52b6" />} visible={showPassword} onToggle={() => setShowPassword(value => !value)} controls="signup-password" disabled={loading} />
              </div>
              {fieldFeedback('password')}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="signup-confirmPassword" className="trace-label ml-1">Confirm Password *</label>
              <div className="relative">
                <input {...fieldProps('confirmPassword')} maxLength={INPUT_LIMITS.password} type={showConfirm ? 'text' : 'password'} placeholder="Confirm your password" value={formData.confirmPassword} onChange={(e) => setFields({ confirmPassword: e.target.value })} className="trace-control w-full pr-12" />
                <PasswordVisibilityButton icon={!showConfirm && <ReviewIcon name="a52b6" />} visible={showConfirm} label="confirmation password" onToggle={() => setShowConfirm(value => !value)} controls="signup-confirmPassword" disabled={loading} />
              </div>
              {fieldFeedback('confirmPassword')}
            </div>

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

            </>}
            {localError && <p role="alert" className="text-sm leading-relaxed text-red-700 dark:text-red-300">{localError}</p>}
            <div className="trace-signup-actions">
              {step > 1 && <Button type="button" disabled={loading} onClick={() => { setStep(current => current - 1); setLocalError(''); }} className="trace-button trace-button-secondary">Back</Button>}
              <Button type="submit" disabled={loading || idCheck.checking} className="trace-button trace-signup-primary">{idCheck.checking ? 'Checking ID…' : loading ? 'Creating...' : step < 3 ? 'Continue' : 'Create Account'}</Button>
            </div>
          </form>
        </>}
      </div>
    </SignupShell>;
}
