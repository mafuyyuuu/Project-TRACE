import { INPUT_LIMITS } from '@/utils/inputLimits';
import ConfirmDialog from '@/components/ConfirmDialog'
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import { getColleges } from '@/services/referenceService'
import ModalShell from '@/components/ModalShell'
import FileUploadField from '@/components/FileUploadField'
import useSignupOcr from '@/hooks/useSignupOcr'
import useNotificationDismissal from '@/hooks/useNotificationDismissal'
import { PASSWORD_REQUIREMENTS, validNewPassword } from '@/utils/passwordPolicy'

export default function SignupPage() {
  const { register, loading } = useAuth()
  const [formData, setFormData] = useState({ employeeId: '', fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '', userType: new URLSearchParams(window.location.search).get('applicant') === 'alumni' ? 'alumni' : 'student', college: '' })
  const [file, setFile] = useState(null)
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState('')
  const [registrationToConfirm, setRegistrationToConfirm] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  // Colleges are admin-managed reference data rather than a hardcoded list.
  const [colleges, setColleges] = useState([])
  useNotificationDismissal(() => setSuccess(''));
  const ocr = useSignupOcr(file, formData.userType, result => setFormData(current => ({
    ...current,
    employeeId: current.employeeId || (current.userType === 'alumni' ? result.alumni_id : result.student_id) || '',
    fullName: current.fullName || result.full_name || '',
    college: current.college || colleges.find(college => college.id === result.college_id)?.name || '',
  })));

  useEffect(() => {
    let cancelled = false
    getColleges()
      .then((data) => { if (!cancelled) setColleges(data.colleges || []) })
      .catch(() => { if (!cancelled) setColleges([]) })
    return () => { cancelled = true }
  }, [])
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccess('')
    if (!formData.employeeId.trim() || !formData.fullName.trim() || !formData.email.trim() || !formData.password.trim() || !formData.phoneNumber.trim() || !formData.college) {
      setLocalError('Please fill out all required fields.')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }
    if (!validNewPassword(formData.password)) { setLocalError(PASSWORD_REQUIREMENTS); return }
    if (!file) {
      setLocalError('Please upload your proof of ID or Diploma.')
      return
    }
    
      const form = new FormData();
      form.append('employee_id', formData.employeeId.trim());
      form.append('full_name', formData.fullName.trim());
      form.append('email', formData.email.trim());
      form.append('phone_number', formData.phoneNumber.trim());
      form.append('password', formData.password);
      form.append('user_type', formData.userType);
      form.append('course', formData.college);
      form.append('program', formData.program || '');
      const college = colleges.find(college => college.name === formData.college);
      if (college) form.append('college_id', String(college.id));
      form.append('id_proof', file);

    setRegistrationToConfirm(form)
  }

  const confirmRegistration = async () => {
    if (!registrationToConfirm) return
    setLocalError('')
    try {
      const result = await register(registrationToConfirm)
      setRegistrationToConfirm(null)
      setSuccess([result.message || 'Registration successful. Please wait for admin verification.', result.verification_reason].filter(Boolean).join(' '))
    } catch (err) {
      setLocalError(err.response?.data?.error || err.response?.data?.message ||
        (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT'
          ? 'Registration took too long to respond. Your account may already be saved. Check Login or contact the Registrar before trying again.'
          : 'Registration failed. Check your connection and try again, or contact the Registrar.'))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-6 px-4 py-8 sm:py-12 font-body relative overflow-hidden">
      <ConfirmDialog open={!!registrationToConfirm} title="Confirm Registration"
        message={['Submit your registration and proof of identity for review?', localError ? <span role="alert">{localError}</span> : null]}
        confirmLabel="Submit Registration" loading={loading} onConfirm={confirmRegistration}
        onCancel={() => setRegistrationToConfirm(null)} />
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-pine-500/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-500/5 dark:bg-blue-500/5 blur-[100px] pointer-events-none"></div>

      <Link to="/" className="trace-action relative z-20 inline-flex w-full max-w-md items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Login
      </Link>

      <div className="trace-section trace-section-body max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <h1 className="trace-page-title mb-2">TRACE Sign Up</h1>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">PLP Registrar's Office</p>
        </div>

        {success ? (
          <ModalShell open title="Registration Complete" onClose={() => navigate('/')} footer={<button type="button" onClick={() => navigate('/')} className="trace-button trace-button-primary w-full">Close and Go to Login</button>}>
            <p className="text-sm leading-relaxed">{success}</p>
          </ModalShell>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {localError && (
              <div role="alert" className="trace-error flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 dark:bg-red-500/20 text-red-400 dark:text-red-300 flex items-center justify-center shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></div>
                <span className="font-semibold text-sm">{localError}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="trace-label ml-1">Account Type *</label>
              <select value={formData.userType} onChange={(e) => setFormData({...formData, userType: e.target.value, employeeId: ''})} className="trace-control w-full appearance-none cursor-pointer">
                <option value="student">Current Student</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="trace-label ml-1">College *</label>
              <select value={formData.college} onChange={(e) => setFormData({...formData, college: e.target.value})} className="trace-control w-full appearance-none cursor-pointer">
                  <option value="" disabled>
                    {colleges.length ? 'Select your college...' : 'Loading colleges...'}
                  </option>
                  {colleges.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="trace-label ml-1">{formData.userType === 'alumni' ? 'Alumni ID *' : 'Student ID *'}</label>
              <input maxLength={INPUT_LIMITS.id} type="text" placeholder={formData.userType === 'alumni' ? 'Enter your Alumni ID' : 'e.g. 23-00123'} value={formData.employeeId} onChange={(e) => setFormData({...formData, employeeId: e.target.value})} className="trace-control w-full" />
            </div>

            <label className="trace-label block">Program/Course
              <input maxLength={150} value={formData.program || ''} onChange={event => setFormData({ ...formData, program: event.target.value })} placeholder="e.g. BS Information Technology" className="trace-control mt-2 w-full" />
            </label>

            <div className="flex flex-col gap-1.5">
              <label className="trace-label ml-1">Full Name *</label>
              <input maxLength={INPUT_LIMITS.name} type="text" placeholder="Juan Dela Cruz" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="trace-control w-full" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="trace-label ml-1">Email Address *</label>
              <input type="email" maxLength={INPUT_LIMITS.email} placeholder="juan@plp.edu.ph" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="trace-control w-full" />
              <p className="text-xs text-gray-500 dark:text-gray-400">After your first login, verify this address from Edit Profile before requesting documents.</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="trace-label ml-1">Phone Number *</label>
              <input type="tel" maxLength={INPUT_LIMITS.phone} placeholder="09123456789" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="trace-control w-full" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="trace-label ml-1">Password *</label>
              <div className="relative">
                <input maxLength={INPUT_LIMITS.password} type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="trace-control w-full pr-12" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)} className="trace-action absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.243 4.243l2.829 2.829M6.343 6.343l11.314 11.314M14.121 14.121A3 3 0 009.879 9.879" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="trace-label ml-1">Confirm Password *</label>
              <div className="relative">
                <input maxLength={INPUT_LIMITS.password} type={showConfirm ? 'text' : 'password'} placeholder="Confirm your password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="trace-control w-full pr-12" />
                <button type="button" aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'} onClick={() => setShowConfirm(!showConfirm)} className="trace-action absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.243 4.243l2.829 2.829M6.343 6.343l11.314 11.314M14.121 14.121A3 3 0 009.879 9.879" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="trace-label ml-1">Upload Proof (ID / Diploma) *</label>
              <FileUploadField label="Proof of ID / Diploma" file={file} onChange={setFile} accept=".pdf,.png,.jpg,.jpeg" disabled={loading} />
              <button type="button" onClick={ocr.readId} disabled={!file || ocr.reading || loading}
                className="trace-button trace-button-info self-start">
                {ocr.reading ? 'Reading ID…' : 'Read ID'}
              </button>
              {ocr.message && <p role="status" className="text-sm text-blue-800 dark:text-blue-300 select-text">{ocr.message}</p>}
              <p className="text-xs text-gray-400 dark:text-gray-400 ml-1 mt-1">Please attach a clear photo of your Student ID or Diploma for verification.</p>
            </div>

            <button type="submit" disabled={loading || ocr.reading} className="trace-action mt-4 w-full py-4 bg-pine-600 hover:bg-pine-700 disabled:opacity-70 text-white rounded-full font-bold transition-colors shadow-sm flex items-center justify-center gap-2">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
        </div>
      </div>
    </div>
  )
}
