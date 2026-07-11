import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../utils/hooks'
import { getNotifications, markNotificationsRead, updateProfile } from '../services/api'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const tab = query.get('tab') || 'dashboard'

  const isWindow1 = user?.role === 'clerk' && (user?.desk_assignment === 'Window 1' || user?.desk_assignment === 'Receiving Desk')

  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [profileData, setProfileData] = useState({ phone_number: user?.phone_number || '', password: '' })
  const [savingSettings, setSavingSettings] = useState(false)

  const loadNotifs = async () => {
    try {
      const data = await getNotifications()
      // Use fallback empty array if data.notifications is missing
      setNotifications(data.notifications || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadNotifs()
    }
  }, [user])

  const handleNotifClick = async () => {
    setShowNotifs(!showNotifs)
      if (!showNotifs && (notifications || []).some(n => !n?.is_read)) {
      try {
        await markNotificationsRead()
        setNotifications((notifications || []).map(n => ({ ...n, is_read: true })))
      } catch (err) {
        console.error(err)
      }
    }
  }

  const unreadCount = (notifications || []).filter(n => !n?.is_read).length

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      await updateProfile(profileData)
      setShowSettings(false)
      alert('Profile updated successfully! Note: You may need to log out and log back in to see some changes.')
    } catch (err) {
      alert('Failed to update profile: ' + err.message)
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col p-4 md:p-6 gap-6 font-body text-gray-800">
      {/* Header */}
      <header className="bg-white rounded-full shadow-sm px-6 py-3 flex items-center justify-between shrink-0 border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#15803d] text-white flex items-center justify-center font-display font-black text-sm shadow-md">
            MK
          </div>
          <span className="font-display font-black text-[#15803d] text-lg tracking-widest uppercase">TRACE</span>
        </div>
        
        <div className="flex-1 max-w-xl mx-8 hidden sm:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input type="text" placeholder="Search" className="w-full bg-gray-50 border-none rounded-full py-2.5 pl-11 pr-4 text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none transition-all" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button onClick={handleNotifClick} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                  <h4 className="text-sm font-bold text-gray-800">Notifications</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!(notifications && notifications.length > 0) ? (
                    <div className="p-4 text-center text-sm text-gray-400">No new notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-3 text-sm border-b border-gray-50 ${n.is_read ? 'bg-white text-gray-500' : 'bg-green-50/30 text-gray-800 font-medium'}`}>
                        <div className="font-bold mb-1">{n.title}</div>
                        <div className="text-xs">{n.message}</div>
                        <div className="text-[10px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm shrink-0 bg-gray-100">
            <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('') : 'MK'}&backgroundColor=c4e3d3`} alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex gap-6 min-h-0 relative">
        {/* Sidebar */}
        <aside className="hidden md:flex w-20 flex-col items-center justify-between bg-white rounded-[2rem] shadow-sm py-8 shrink-0 border border-gray-100/50">
          <nav className="flex flex-col gap-4">
            {user?.role === 'student' && (
              <>
                <Link to="/dashboard" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tab === 'dashboard' ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title="Dashboard">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"/></svg>
                </Link>
                <Link to="/dashboard?tab=request-history" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tab === 'request-history' ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title="Request History">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </Link>
                <Link to="/dashboard?tab=payment-history" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tab === 'payment-history' ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title="Payment History">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                </Link>
              </>
            )}

            {user?.role === 'clerk' && user?.desk_assignment === 'Secretary' && (
              <>
                <Link to="/dashboard" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tab === 'dashboard' ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title="Dashboard">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"/></svg>
                </Link>
                <Link to="/dashboard?tab=completed-logs" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tab === 'completed-logs' ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title="Completed Logs">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
                </Link>
              </>
            )}

            {isWindow1 && (
              <>
                <Link to="/dashboard" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tab === 'dashboard' ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title="Workspace Dashboard">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"/></svg>
                </Link>
                <Link to="/dashboard?tab=release-queue" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tab === 'release-queue' ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title="Release Queue">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                </Link>
                <Link to="/dashboard?tab=manual-input" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tab === 'manual-input' ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title="Manual Input Form">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                </Link>
              </>
            )}

            {(user?.role === 'admin' || (user?.role === 'clerk' && user?.desk_assignment === 'Finance')) && (
              <Link to="/dashboard" className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${tab === 'dashboard' ? 'bg-[#15803d] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`} title="Dashboard">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"/></svg>
              </Link>
            )}
          </nav>
          <div className="flex flex-col gap-4">
            <button onClick={() => setShowSettings(true)} className="w-12 h-12 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors" title="Settings">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>
            <button onClick={logout} className="w-12 h-12 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Logout">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">Account Settings</h2>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="text"
                    value={profileData.phone_number}
                    onChange={(e) => setProfileData({...profileData, phone_number: e.target.value})}
                    placeholder="+639123456789"
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">Required for UniSMS notifications.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Change Password</label>
                  <input
                    type="password"
                    value={profileData.password}
                    onChange={(e) => setProfileData({...profileData, password: e.target.value})}
                    placeholder="Leave blank to keep current password"
                    className="w-full bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none"
                  />
                </div>
                <div className="pt-4">
                  <button disabled={savingSettings} type="submit" className="w-full bg-[#15803d] hover:bg-[#166534] text-white font-bold py-3 px-4 rounded-xl transition-colors disabled:opacity-50">
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

