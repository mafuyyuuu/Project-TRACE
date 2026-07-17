import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../utils/hooks'
import plpLogo from '../assets/plp_logo.png'

export default function LoginPage() {
  const { login, loading, error: authError } = useAuth()
  const [employeeId, setEmployeeId] = useState('')
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')

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
            <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-200 rounded-xl text-sm font-semibold text-center mb-6">
              ⚠ {error}
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
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-white/50 outline-none text-white focus:bg-white/20 transition-all font-semibold placeholder:text-white/40" 
              />
              <div className="text-right mt-2">
                <Link to="#" className="text-sm font-medium text-white/90 hover:text-white underline underline-offset-4">Forgot Password?</Link>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="mt-6 w-full py-5 bg-[#f8f9fa] text-gray-900 font-black text-2xl rounded-xl hover:bg-white disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg uppercase tracking-wide flex items-center justify-center gap-3"
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

