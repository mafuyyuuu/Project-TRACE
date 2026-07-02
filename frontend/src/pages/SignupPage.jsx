import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../utils/hooks'

export default function SignupPage() {
  const { register, loading } = useAuth()
  const [formData, setFormData] = useState({ employeeId: '', fullName: '', email: '', password: '', userType: 'student' })
  const [file, setFile] = useState(null)
  const [localError, setLocalError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    setSuccess('')
    if (!formData.employeeId.trim() || !formData.fullName.trim() || !formData.password.trim()) {
      setLocalError('Please fill out all required fields.')
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
      form.append('password', formData.password);
      form.append('user_type', formData.userType);
      form.append('id_proof', file);

      const result = await register(form)
      setSuccess(result.message || 'Registration successful. Please wait for admin verification.')
      setTimeout(() => navigate('/'), 3000)
    } catch (err) {
      setLocalError(err.response?.data?.error || err.response?.data?.message || 'Registration failed.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-body relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] rounded-full bg-pine-500/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>

      <div className="bg-white rounded-[2.5rem] p-10 sm:p-12 shadow-sm border border-gray-100 max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-display font-black text-gray-900 tracking-widest mb-2 uppercase">SIGN UP</h1>
          <p className="text-sm font-semibold text-gray-500 mb-1">PLP Registrar's Office</p>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-pine-50 text-pine-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Registration Complete</h2>
            <p className="text-gray-500">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {localError && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center">⚠ {localError}</div>}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-800 ml-1">Account Type *</label>
              <select value={formData.userType} onChange={(e) => setFormData({...formData, userType: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer">
                <option value="student">Current Student</option>
                <option value="alumni">Alumni</option>
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
              <label className="text-sm font-semibold text-gray-800 ml-1">Password *</label>
              <input type="password" placeholder="Create a password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all" />
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
