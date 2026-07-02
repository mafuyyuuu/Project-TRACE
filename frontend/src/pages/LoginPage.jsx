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
      setLocalError('Please enter both Employee ID and password.')
      return
    }
    await login({ employeeId: employeeId.trim(), password })
  }

  const error = localError || authError

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-body relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-pine-500/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>

      <div className="bg-white rounded-[2.5rem] p-10 sm:p-12 shadow-sm border border-gray-100 max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-pine-600 text-white rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-md shadow-pine-600/20">📋</div>
          <h1 className="text-2xl font-display font-black text-gray-900 tracking-widest mb-2 uppercase">TRACE</h1>
          <p className="text-sm font-semibold text-gray-500 mb-1">PLP Registrar's Office</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium text-center">⚠ {error}</div>}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-800 ml-1">Employee ID</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">👤</span>
              <input type="text" placeholder="Enter your Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full p-3.5 pl-11 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all" autoFocus />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-800 ml-1">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">🔒</span>
              <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3.5 pl-11 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-pine-500 focus:bg-white outline-none transition-all" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="mt-6 w-full py-4 bg-pine-600 hover:bg-pine-700 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-full font-bold transition-all shadow-sm flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 mb-4">Don't have an account? <Link to="/signup" className="text-pine-600 font-bold hover:underline">Sign up</Link></p>
          <p className="text-xs text-gray-400">© 2026 Pamantasan ng Lungsod ng Pasig</p>
        </div>
      </div>
    </div>
  )
}
