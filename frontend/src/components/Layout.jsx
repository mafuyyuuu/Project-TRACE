import { Outlet, NavLink } from 'react-router-dom'
import { useAuth } from '../utils/hooks'
import { useSettings } from '../utils/SettingsContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const { systemName, systemLogo, organization, profilePic, systemLogoPic } = useSettings()

  return (
    <div className="min-h-screen bg-gray-50 flex p-4 md:p-6 gap-6 font-body text-gray-800">
      {/* Sidebar */}
      <aside className="hidden md:flex group w-20 hover:w-56 flex-col items-stretch bg-white rounded-[2.5rem] hover:rounded-[2rem] shadow-sm py-6 px-4 gap-8 transition-all duration-300 ease-in-out shrink-0">
        <div className="flex items-center h-12 rounded-full overflow-hidden transition-all duration-300 w-full">
          {systemLogoPic ? (
            <img src={systemLogoPic} className="w-12 h-12 shrink-0 rounded-full object-cover shadow-sm" alt="Logo" />
          ) : (
            <div className="w-12 h-12 shrink-0 rounded-full bg-pine-600 text-white flex items-center justify-center font-display font-bold text-sm shadow-md tracking-wider">
              {systemLogo}
            </div>
          )}
          <div className="ml-3 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap overflow-hidden">
            <span className="font-display font-bold text-pine-600 text-sm tracking-wider uppercase leading-none">
              {systemName}
            </span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">
              {organization}
            </span>
          </div>
        </div>
        <nav className="flex flex-col gap-4 w-full">
          {user?.role !== 'student' && (
            <NavLink 
              to="/dashboard/queue" 
              className={({isActive}) => `flex items-center h-12 rounded-full transition-all duration-300 w-full overflow-hidden ${
                isActive 
                  ? 'bg-pine-50 text-pine-600 shadow-inner' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
              }`} 
              title="Queue"
            >
              <span className="w-12 h-12 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
              </span>
              <span className="ml-3 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                Queue
              </span>
            </NavLink>
          )}
          <NavLink 
            to="/dashboard/upload" 
            className={({isActive}) => `flex items-center h-12 rounded-full transition-all duration-300 w-full overflow-hidden ${
              isActive 
                ? 'bg-pine-50 text-pine-600 shadow-inner' 
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`} 
            title="Upload"
          >
            <span className="w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            </span>
            <span className="ml-3 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Upload
            </span>
          </NavLink>
        </nav>
        <div className="mt-auto flex flex-col gap-4 w-full">
          <NavLink 
            to="/dashboard/settings" 
            className={({isActive}) => `flex items-center h-12 rounded-full transition-all duration-300 w-full overflow-hidden ${
              isActive 
                ? 'bg-pine-50 text-pine-600 shadow-inner' 
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`} 
            title="Settings"
          >
            <span className="w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </span>
            <span className="ml-3 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Settings
            </span>
          </NavLink>
          <button onClick={logout} className="flex items-center h-12 rounded-full transition-all duration-300 w-full overflow-hidden text-gray-400 hover:bg-red-50 hover:text-red-500">
            <span className="w-12 h-12 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </span>
            <span className="ml-3 font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Logout
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
        {/* Header */}
        <header className="bg-white rounded-full shadow-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <span className="font-display font-bold text-pine-600 text-lg tracking-widest uppercase">{systemName}</span>
          </div>
          
          <div className="flex-1 max-w-xl mx-8 hidden sm:block">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              </span>
              <input type="text" placeholder="Search" className="w-full bg-gray-50 border-none rounded-full py-2.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-pine-500 outline-none transition-all" />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pine-500 to-pine-700 text-white flex items-center justify-center font-bold text-sm shadow-md overflow-hidden shrink-0">
              {profilePic ? (
                <img src={profilePic} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                user?.full_name ? user.full_name[0].toUpperCase() : (user?.name ? user.name[0].toUpperCase() : 'U')
              )}
            </div>
          </div>
        </header>
        
        {/* Render Child Pages */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
