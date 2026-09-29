import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import useProfileSettings from '@/hooks/useProfileSettings'
import { getNotifications, markNotificationsRead } from '@/services/authService'
import { onNotification, disconnectRealtime } from '@/services/realtimeService'
import SidebarNav from '@/layouts/SidebarNav'
import ProfileSettingsModal from '@/components/ProfileSettingsModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import UserAvatar from '@/components/UserAvatar'
import plpLogo from '@/assets/plp_logo.png'
import OnboardingTutorial from '@/features/student/components/OnboardingTutorial'

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const tab = query.get('tab') || 'dashboard'

  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [showTutorial, setShowTutorial] = useState(user?.role === 'student' && !localStorage.getItem('trace_tutorial_seen'))
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'))
  const contentRef = useRef(null)
  const drawerRef = useRef(null)

  const toggleTheme = () => {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('trace_theme', next ? 'dark' : 'light')
    } catch {
      // The choice still applies when persistent storage is unavailable.
    }
  }

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    const animation = contentRef.current?.animate?.(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    )
    return () => animation?.cancel()
  }, [location.key])

  useEffect(() => {
    if (!showMobileNav) return undefined
    const previousFocus = document.activeElement
    drawerRef.current?.querySelector('button')?.focus()
    const handleKeyDown = (event) => {
      if (document.querySelector('[data-modal-layer]')) return
      if (event.key === 'Escape') setShowMobileNav(false)
      if (event.key !== 'Tab') return
      const controls = drawerRef.current?.querySelectorAll('button, a[href]')
      if (!controls?.length) return
      const first = controls[0]
      const last = controls[controls.length - 1]
      const outside = !drawerRef.current.contains(document.activeElement)
      if (event.shiftKey && (document.activeElement === first || outside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || outside)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [showMobileNav])

  const settings = useProfileSettings(user)

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

  // Live push: a new notification appears in the bell within milliseconds
  // instead of waiting for the next page load.
  useEffect(() => {
    if (!user) return undefined

    const unsubscribe = onNotification((incoming) => {
      setNotifications((current) => [
        { id: `live-${Date.now()}`, ...incoming },
        ...current,
      ])
    })

    return unsubscribe
  }, [user])

  // Drop the socket on logout so the next account doesn't inherit it.
  useEffect(() => {
    if (!user) disconnectRealtime()
  }, [user])

  // A tab change on mobile should leave the drawer closed behind it — including
  // one driven by the browser's back button, which no click handler sees.
  // Adjusting state during render is React's documented alternative to an
  // effect here, and avoids the extra render pass an effect would cost.
  const [navLocationKey, setNavLocationKey] = useState(location.key)
  if (navLocationKey !== location.key) {
    setNavLocationKey(location.key)
    setShowMobileNav(false);
    setShowNotifs(false);
  }

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

  const openSettings = () => {
    settings.resetFeedback()
    setShowSettings(true)
  }

  // A picked-but-unsaved picture must not survive closing without Save.

  useEffect(() => {
    const handleOpenSettings = () => setShowSettings(true);
    window.addEventListener('open-profile-settings', handleOpenSettings);
    return () => window.removeEventListener('open-profile-settings', handleOpenSettings);
  }, []);

  const closeSettings = () => {
    settings.discardAvatarChange()
    setShowSettings(false)
  }

  const handleConfirmLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
      setConfirmingLogout(false)
    }
  }

  return (
    <div className="h-dvh overflow-hidden bg-gray-50 dark:bg-gray-800 flex flex-col p-3 sm:p-4 md:p-6 gap-4 sm:gap-6 font-body text-gray-800 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 rounded-full shadow-sm px-4 sm:px-6 py-3 flex items-center justify-between shrink-0 border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowMobileNav(true)}
            aria-label="Open navigation menu"
            aria-expanded={showMobileNav}
            aria-controls="mobile-navigation"
            className="md:hidden w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <img src={plpLogo} alt="PLP Logo" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover shadow-md" />
          <span className="font-display font-black text-[#15803d] dark:text-green-300 text-base sm:text-lg tracking-widest uppercase">TRACE</span>
        </div>

        <div className="flex-1 max-w-xl mx-8 hidden sm:block">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </span>
            <input type="text" placeholder="Search" className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-full py-2.5 pl-11 pr-4 text-xs font-semibold focus:ring-2 focus:ring-[#15803d]/20 outline-none transition-all" />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Dark mode"
            aria-pressed={darkMode}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {darkMode
                ? <><circle cx="12" cy="12" r="4" strokeWidth="2" /><path strokeWidth="2" strokeLinecap="round" d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>
                : <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />}
            </svg>
          </button>
          <div className="relative">
            <button onClick={handleNotifClick} aria-label="Notifications" className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 dark:bg-red-500 rounded-full"></span>
              )}
            </button>
            {showNotifs && (
              <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50">
                <div className="p-3 border-b border-gray-50 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Notifications</h4>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!(notifications && notifications.length > 0) ? (
                    <div className="p-4 text-center text-sm text-gray-400 dark:text-gray-400">No new notifications</div>
                  ) : (
                    notifications.map(n => (
                      <button type="button" key={n.id} onClick={() => {
                          const match = n.message.match(/TRC-[A-Z0-9]+/i) || n.message.match(/#([0-9]+)/);
                          if (match) window.dispatchEvent(new CustomEvent('trace-open-doc', { detail: match[0].replace('#', '') }));
                          setShowNotifs(false);
                        }} className={`w-full text-left p-3 text-sm border-b border-gray-50 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${n.is_read ? 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400' : 'bg-green-50/30 dark:bg-green-950/30 text-gray-800 dark:text-gray-100 font-medium'}`}>
                        <div className="font-bold mb-1">{n.title}</div>
                        <div className="text-xs">{n.message}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            id="tutorial-profile"
            onClick={openSettings}
            aria-label="Account settings"
            className="w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-gray-800 shadow-sm shrink-0 bg-gray-100 dark:bg-gray-800"
          >
            <UserAvatar
              user={user}
              overridePath={settings.avatarPath}
              className="w-full h-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex gap-6 min-h-0 overflow-hidden relative">
        {/* Desktop rail */}
        <aside className="hidden md:flex w-20 h-full overflow-y-auto flex-col items-center justify-between bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm py-8 shrink-0 border border-gray-100/50 dark:border-gray-700/50">
          <SidebarNav
            user={user}
            tab={tab}
            onOpenSettings={openSettings}
            onLogout={() => setConfirmingLogout(true)}
          />
        </aside>

        {/* Mobile drawer — the rail is hidden below md, so without this there is
            no navigation at all on a phone. */}
        {showMobileNav && (
          <div className="md:hidden fixed inset-0 z-[90] flex">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
              onClick={() => setShowMobileNav(false)}
              aria-hidden="true"
            />
            <aside ref={drawerRef} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation menu" className="relative w-72 max-w-[85vw] h-full bg-white dark:bg-gray-900 shadow-2xl p-4 overflow-y-auto flex flex-col animate-slide-up">
              <div className="flex items-center justify-between mb-6 px-2">
                <span className="font-display font-black text-[#15803d] dark:text-green-300 text-lg tracking-widest uppercase">TRACE</span>
                <button
                  onClick={() => setShowMobileNav(false)}
                  aria-label="Close navigation menu"
                  className="text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <SidebarNav
                user={user}
                tab={tab}
                showLabels
                onNavigate={() => setShowMobileNav(false)}
                onOpenSettings={openSettings}
                onLogout={() => setConfirmingLogout(true)}
              />
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main ref={contentRef} className="flex-1 min-w-0 h-full overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {showSettings && (
        <ProfileSettingsModal
          user={user}
          onClose={closeSettings}
          profileData={settings.profileData}
          setField={settings.setField}
          avatarPath={settings.avatarPath}
          avatarPreviewUrl={settings.avatarPreviewUrl}
          saving={settings.saving}
          success={settings.success}
          error={settings.error}
          onSave={settings.saveProfile}
          onAvatarChange={settings.changeAvatar}
        />
      )}

      <ConfirmDialog
        open={confirmingLogout}
        title="Log Out"
        message="You'll need to sign in again to continue."
        variant="neutral"
        confirmLabel="Log Out"
        cancelLabel="Stay Signed In"
        loadingLabel="Logging Out…"
        loading={loggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  )
}
