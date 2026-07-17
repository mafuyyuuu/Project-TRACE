import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/hooks'

export default function SignupPage() {
  const { register, loading } = useAuth()
  const [formData, setFormData] = useState({ employeeId: '', fullName: '', email: '', phoneNumber: '', password: '', confirmPassword: '', userType: 'student', college: '' })
  const [file, setFile] = useState(null)
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccess('')
    if (!formData.employeeId.trim() || !formData.fullName.trim() || !formData.password.trim() || !formData.phoneNumber.trim() || !formData.college) {
      setLocalError('Please fill out all required fields.')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }
    if (!file) {
      setLocalError('Please upload your proof of ID or Diploma.')
      return
    }
    
    try {
      const form = new FormData();
      form.append('employee_id', formData.employeeId.trim());
      form.append('full_name', formData.fullName.trim());
      form.append('email', formData.email.trim());
      form.append('phone_number', formData.phoneNumber.trim());
      form.append('password', formData.password);
      form.append('user_type', formData.userType);
      form.append('course', formData.college);
      form.append('id_proof', file);

      const result = await register(form)
      setSuccess(result.message || 'Registration successful. Please wait for admin verification.')
      setTimeout(() => navigate('/'), 3000)
    } catch (err) {
      setLocalError(err.response?.data?.error || err.response?.data?.message || 'Registration failed.')
    }
  }

  useEffect(() => {
    if (localError) {
      const timer = setTimeout(() => setLocalError(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [localError])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-body relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-pine-500/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>

      <Link to="/" className="fixed top-6 left-6 z-20 inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back to Login
      </Link>

      <div className="bg-white rounded-[2.5rem] p-10 sm:p-12 shadow-sm border border-gray-100 max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-display font-black text-gray-900 tracking-widest mb-2 uppercase">SIGN UP</h1>
          <p className="text-sm font-semibold text-gray-500 mb-1">PLP Registrar's Office</p>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-pine-50 text-pine-600 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Complete</h2>
            <p className="text-gray-500">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {localError && (
              <div className="fixed bottom-6 right-6 z-50 bg-red-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-red-700 animate-slide-up">
                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></div>
                <span className="font-semibold text-sm">{localError}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">Account Type *</label>
              <select value={formData.userType} onChange={(e) => setFormData({...formData, userType: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer">
                <option value="student">Current Student</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">College *</label>
              <select value={formData.college} onChange={(e) => setFormData({...formData, college: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer">
                <option value="" disabled>Select your college...</option>
                <option value="College of Computer Studies">College of Computer Studies</option>
                <option value="College of Nursing">College of Nursing</option>
                <option value="College of International Hospitality Management">College of International Hospitality Management</option>
                <option value="College of Engineering">College of Engineering</option>
                <option value="College of Education">College of Education</option>
                <option value="College of Arts and Sciences">College of Arts and Sciences</option>
                <option value="College of Business and Accountancy">College of Business and Accountancy</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">Student ID *</label>
              <input type="text" placeholder="e.g. 23-00123" value={formData.employeeId} onChange={(e) => setFormData({...formData, employeeId: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">Full Name *</label>
              <input type="text" placeholder="Juan Dela Cruz" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">Email Address</label>
              <input type="email" placeholder="juan@plp.edu.ph" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">Phone Number *</label>
              <input type="tel" placeholder="09123456789" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">Password *</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} placeholder="Create a password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-3.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 transition-colors" tabIndex={-1}>
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.243 4.243l2.829 2.829M6.343 6.343l11.314 11.314M14.121 14.121A3 3 0 009.879 9.879" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">Confirm Password *</label>
              <div className="relative">
                <input type={showConfirm ? 'text' : 'password'} placeholder="Confirm your password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="w-full p-3.5 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-700 transition-colors" tabIndex={-1}>
                  {showConfirm ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.243 4.243l2.829 2.829M6.343 6.343l11.314 11.314M14.121 14.121A3 3 0 009.879 9.879" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">Upload Proof (ID / Diploma) *</label>
              <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0])} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pine-50 file:text-pine-700 hover:file:bg-pine-100 transition-all cursor-pointer" />
              <p className="text-xs text-gray-400 ml-1 mt-1">Please attach a clear photo of your Student ID or Diploma for verification.</p>
            </div>

            <button type="submit" disabled={loading} className="mt-4 w-full py-4 bg-pine-600 hover:bg-pine-700 disabled:opacity-70 text-white rounded-full font-bold transition-all shadow-sm flex items-center justify-center gap-2">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-4">Already have an account? <Link to="/" className="text-pine-600 font-bold hover:underline">Log in</Link></p>
        </div>
      </div>
    </div>
  )
}
