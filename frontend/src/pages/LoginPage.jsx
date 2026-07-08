import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../utils/hooks'

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
          <div className="w-16 h-16 rounded-full bg-[#15803d] text-white flex items-center justify-center font-display font-black text-sm shadow-md">
            MK
          </div>
        </div>

        <div className="my-auto py-12 md:py-0">
          <span className="text-sm font-black text-gray-500 uppercase tracking-widest block mb-2">Welcome to</span>
          <h1 className="text-7xl md:text-8xl font-display font-black text-[#15803d] tracking-tighter leading-none">TRACE</h1>
        </div>

        <div>
          <p className="text-sm text-gray-600 max-w-sm leading-relaxed font-medium">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/70">USERNAME</label>
              <input 
                type="text" 
                value={employeeId} 
                onChange={(e) => setEmployeeId(e.target.value)} 
                className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-white/30 outline-none text-white focus:bg-white/20 transition-all font-semibold" 
                placeholder="Enter ID" 
                autoFocus 
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/70">PASSWORD</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-sm focus:ring-2 focus:ring-white/30 outline-none text-white focus:bg-white/20 transition-all font-semibold" 
                placeholder="••••••••" 
              />
              <div className="text-right mt-1">
                <Link to="#" className="text-xs font-semibold text-white/80 hover:text-white underline">Forgot Password?</Link>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="mt-8 w-full py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-md uppercase tracking-wider text-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin"></span> 
                  Signing in...
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

