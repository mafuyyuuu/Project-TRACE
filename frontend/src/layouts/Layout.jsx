import { readTextSize, saveTextSize } from '@/utils/textSize';
import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import useAuth from '@/hooks/useAuth'
import useProfileSettings from '@/hooks/useProfileSettings'
import useNotificationDismissal from '@/hooks/useNotificationDismissal'
import { getNotifications, markNotificationsRead } from '@/services/authService'
import { onNotification, disconnectRealtime } from '@/services/realtimeService'
import SidebarNav from '@/layouts/SidebarNav'
import ProfileSettingsModal from '@/components/ProfileSettingsModal'
import ConfirmDialog from '@/components/ConfirmDialog'
import UserAvatar from '@/components/UserAvatar'
import plpLogo from '@/assets/plp_logo.png'
import GraduateApplication from '@/features/graduate/GraduateApplication'
import OnboardingTutorial from '@/components/OnboardingTutorial'
import useQuickGuide from '@/hooks/useQuickGuide'

export default function Layout() {
  const { user, logout, loading: authLoading } = useAuth()
  const graduateRequired = user?.role === 'student' && user.user_type === 'alumni' && !user.has_grad_application
  const location = useLocation()
  const navigate = useNavigate()
  const [settingsTab, setSettingsTab] = useState(() => new URLSearchParams(location.search).get('settings') === 'security' ? 'security' : 'personal')
  const query = new URLSearchParams(location.search)
  const tab = query.get('tab') || 'dashboard'
  const guideEligible = ['student', 'clerk', 'admin'].includes(user?.role) && !authLoading && !graduateRequired && !user?.must_change_password
  const guide = useQuickGuide(user?.id, guideEligible && tab === 'dashboard')

  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  useNotificationDismissal(() => setShowNotifs(false));
  const [showSettings, setShowSettings] = useState(() => query.get('settings') === 'security')
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [confirmingLogout, setConfirmingLogout] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains('dark'))
  const [textSize, setTextSize] = useState(readTextSize)
  const changeTextSize = value => setTextSize(saveTextSize(value))
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
    if (!document.querySelector('[data-modal-layer]')) drawerRef.current?.querySelector('button')?.focus()
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
    if (user && !graduateRequired) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadNotifs()
    }
  }, [user, graduateRequired])

  // Live push: a new notification appears in the bell within milliseconds
  // instead of waiting for the next page load.
  useEffect(() => {
    if (!user || graduateRequired) return undefined

    const unsubscribe = onNotification((incoming) => {
      setNotifications((current) => [
        { id: `live-${Date.now()}`, ...incoming },
        ...current,
      ])
    })

    return unsubscribe
  }, [user, graduateRequired])

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
    if (query.get('settings') === 'security') { setSettingsTab('security'); setShowSettings(true); }
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

  const openSettings = (section = 'personal') => {
    setSettingsTab(typeof section === 'string' ? section : 'personal')
    settings.resetFeedback()
    setShowSettings(true)
  }

  // A picked-but-unsaved picture must not survive closing without Save.

  useEffect(() => {
    const handleOpenSettings = () => { setSettingsTab('personal'); setShowSettings(true); };
    window.addEventListener('open-profile-settings', handleOpenSettings);
    return () => window.removeEventListener('open-profile-settings', handleOpenSettings);
  }, []);


  const closeSettings = () => {
    settings.discardAvatarChange()
    setShowSettings(false)
    if (query.has('settings')) { query.delete('settings'); navigate({ pathname: location.pathname, search: query.toString() }, { replace: true }); }
  }

  const prepareGuide = (area) => {
    setShowNotifs(false)
    setShowMobileNav(area.startsWith('navigation:') && window.innerWidth < 768)
    window.dispatchEvent(new Event('trace-close-support'))
    if (area === 'email' || area === 'security') openSettings(area === 'email' ? 'personal' : 'security')
    else closeSettings()
  }

  const closeGuide = () => {
    guide.close()
    setShowMobileNav(false)
    closeSettings()
    window.dispatchEvent(new Event('trace-close-support'))
  }

  const handleConfirmLogout = async () => {
    setLoggingOut(true)
    try {
      const result = await logout()
      if (result === false) { setLogoutError('Could not confirm logout. Check your connection and try again.'); return; }
      setLogoutError('')
      setConfirmingLogout(false)
    } finally {
      setLoggingOut(false)
    }
  }

  if (graduateRequired) return (
    <main className="min-h-dvh bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-8 space-y-5">
      <header className="flex flex-wrap gap-4 items-center justify-between"><strong className="text-xl">TRACE</strong>
        <button type="button" onClick={() => setConfirmingLogout(true)} className="border rounded-xl px-4 py-2">Log Out</button></header>
      <p className="text-sm">Submit your graduate application to unlock TRACE. You can complete email verification afterward.</p>
      <GraduateApplication user={user} />
      <ConfirmDialog open={confirmingLogout} title="Log Out" message={logoutError || 'End this session?'} confirmLabel="Log Out" loading={loggingOut} onConfirm={handleConfirmLogout} onCancel={() => setConfirmingLogout(false)} />
    </main>
  );

  return (
    <div className="h-dvh overflow-hidden bg-gray-50 dark:bg-gray-800 flex flex-col p-3 sm:p-4 md:p-6 gap-4 sm:gap-6 font-body text-gray-800 dark:text-gray-100">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 rounded-3xl sm:rounded-full shadow-sm px-4 sm:px-6 py-3 flex flex-wrap gap-2 items-center justify-between shrink-0 border border-gray-100 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
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

        <div className="flex shrink-0 ml-auto items-center gap-2 sm:gap-4">
          {guideEligible && <button id="tutorial-guide" type="button" aria-label="Open quick guide" title="Quick guide" onClick={() => { navigate('/dashboard'); guide.show(); }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-green-700">
            <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 0 1 5 .3c0 1.7-2.5 1.8-2.5 3.7M12 16h.01" /></svg>
          </button>}
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
            <button id="tutorial-notifications" onClick={handleNotifClick} aria-label="Notifications" className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors relative">
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
                          if (typeof n.action_url === 'string' && n.action_url.startsWith('/dashboard') && !n.action_url.startsWith('//')) { navigate(n.action_url); setShowNotifs(false); return; }
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
            aria-label="Edit Profile"
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
            onOpenSettings={() => openSettings('appearance')}
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
                onOpenSettings={() => openSettings('appearance')}
                onLogout={() => setConfirmingLogout(true)}
              />
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main ref={contentRef} className="trace-content flex-1 min-w-0 h-full overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {guide.open && guideEligible && <OnboardingTutorial key={user.id} user={user} onComplete={closeGuide} onPrepare={prepareGuide} onAction={area => {
        if (area === 'profile') openSettings('personal')
        else if (area.startsWith('navigation:')) { navigate(`/dashboard?tab=${area.slice(11)}`); closeGuide(); }
        else window.dispatchEvent(new Event('trace-open-support'))
      }} />}

      {showSettings && (
        <ProfileSettingsModal
          user={user}
          initialTab={settingsTab} darkMode={darkMode} onToggleTheme={toggleTheme}
          textSize={textSize} onTextSizeChange={changeTextSize}
          pendingEmail={settings.pendingEmail}
          onVerifyEmail={settings.verifyEmail}
          verifyingEmail={settings.verifyingEmail}
          verificationMessage={settings.verificationMessage}
          verificationError={settings.verificationError}
          onClose={closeSettings}
          profileData={settings.profileData}
          setField={settings.setField}
          avatarPath={settings.avatarPath}
          avatarPreviewUrl={settings.avatarPreviewUrl}
          avatarFile={settings.avatarFile}
          saving={settings.saving || settings.verifyingEmail}
          success={settings.success}
          error={settings.error}
          onSave={settings.saveProfile}
          onAvatarChange={settings.changeAvatar}
        />
      )}

      <ConfirmDialog
        open={confirmingLogout}
        title="Log Out"
        message={logoutError || "You'll need to sign in again to continue."}
        variant="neutral"
        confirmLabel="Log Out"
        cancelLabel="Stay Signed In"
        loadingLabel="Logging Out…"
        loading={loggingOut}
        onConfirm={handleConfirmLogout}
        onCancel={() => { setConfirmingLogout(false); setLogoutError('') }}
      />
    </div>
  )
}
