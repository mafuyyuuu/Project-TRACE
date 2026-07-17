import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../utils/hooks'
import plpLogo from '../assets/plp_logo.png'

export default function LoginPage() {
  const { login, loading, error: authError } = useAuth()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (!employeeId.trim() || !password.trim()) {
      setLocalError('Please enter both ID and password.')
      return
    }
    await login({ employeeId: employeeId.trim(), password })
  }

  const error = localError || authError

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setLocalError(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-body relative overflow-hidden bg-white">
      {/* Left Column (Light Spec) */}
      <div className="md:w-1/2 bg-[#f8f9fa] p-12 md:p-24 flex flex-col justify-between shrink-0">
        <div>
          <img src={plpLogo} alt="PLP Logo" className="w-16 h-16 rounded-full object-cover shadow-md" />
        </div>

        <div className="my-auto py-12 md:py-0">
          <span className="text-2xl font-black text-gray-900 block mb-2 tracking-tight">Welcome to</span>
          <h1 className="text-7xl md:text-[10rem] font-display font-black text-[#15803d] tracking-tighter leading-none mb-4">TRACE</h1>
          <h2 className="text-2xl md:text-3xl font-display font-black text-[#15803d] leading-tight max-w-md">
            An AI-Assisted Registrar Document Workflow System
          </h2>
        </div>

        <div>
          <p className="text-sm font-bold text-gray-900 max-w-sm leading-relaxed">
            Empowering the PLP community with transparent document requests and intelligent, data-driven administrative processing.
          </p>
        </div>
      </div>

      {/* Right Column (Pine Spec) */}
      <div className="md:w-1/2 bg-[#15803d] p-12 md:p-24 flex flex-col justify-center text-white relative">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-4xl font-display font-black mb-10 tracking-tight">Login</h2>
          
          {error && (
            <div className="fixed bottom-6 right-6 z-50 bg-red-900 text-white px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 border border-red-700 animate-slide-up">
              <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg></div>
              <span className="font-semibold text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider">STUDENT ID / STAFF ID</label>
              <input 
                type="text" 
                placeholder="e.g. 23-00123 or ADMIN001"
                value={employeeId} 
                onChange={(e) => setEmployeeId(e.target.value)} 
                className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-white/50 outline-none text-white focus:bg-white/20 transition-all font-semibold placeholder:text-white/40" 
                autoFocus 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white uppercase tracking-wider">PASSWORD</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full p-4 pr-12 bg-white/10 border border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-white/50 outline-none text-white focus:bg-white/20 transition-all font-semibold placeholder:text-white/40" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-white transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9.27-3.11-11-7.5a11.72 11.72 0 013.168-4.477M6.343 6.343A9.97 9.97 0 0112 5c5 0 9.27 3.11 11 7.5a11.72 11.72 0 01-4.168 4.477M6.343 6.343L3 3m3.343 3.343l2.829 2.829m4.243 4.243l2.829 2.829M6.343 6.343l11.314 11.314M14.121 14.121A3 3 0 009.879 9.879" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="text-right mt-2">
                <Link to="#" className="text-sm font-medium text-white/90 hover:text-white hover:underline">Forgot Password?</Link>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="mt-6 w-full py-5 bg-[#f8f9fa] text-gray-900 font-black text-2xl rounded-xl hover:bg-gray-200 active:bg-gray-300 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 shadow-lg uppercase tracking-wide flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <span className="w-5 h-5 border-4 border-gray-900/30 border-t-gray-900 rounded-full animate-spin"></span> 
                  <span className="text-xl">SIGNING IN...</span>
                </>
              ) : 'LOGIN'}
            </button>
          </form>

          <div className="mt-10 text-center text-sm text-white/80 font-medium">
            Don't have an account? <Link to="/signup" className="text-white font-black hover:underline">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

