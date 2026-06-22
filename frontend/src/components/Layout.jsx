import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { getMe } from '../services/api'

export default function Layout() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // Try to get user from localStorage first, then fetch from API
    const stored = localStorage.getItem('trace_user')
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        // ignore parse errors
      }
    }

    // Fetch fresh user data
    getMe()
      .then((data) => {
        const userData = data.user || data
        setUser(userData)
        localStorage.setItem('trace_user', JSON.stringify(userData))
      })
      .catch(() => {
        // If the fetch fails but we have stored data, keep it
      })
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('trace_token')
    localStorage.removeItem('trace_user')
    navigate('/')
  }

  const closeSidebar = () => setSidebarOpen(false)

  const getInitials = () => {
    if (!user?.name) return '?'
    return user.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="layout">
      {/* Sidebar Overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-row">
            <div className="brand-logo">📋</div>
            <div className="brand-text">
              <h2>TRACE</h2>
              <p>PLP Registrar</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Navigation</div>

          <NavLink
            to="/dashboard/upload"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
            onClick={closeSidebar}
          >
            <span className="nav-icon">📤</span>
            <span>Upload</span>
          </NavLink>

          <NavLink
            to="/dashboard/queue"
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
            onClick={closeSidebar}
          >
            <span className="nav-icon">📋</span>
            <span>Queue</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <div className="user-info">
            <div className="user-details">
              <span className="user-name">
                {user?.name ? `Welcome, ${user.name}` : 'Welcome'}
              </span>
              <span className="user-role">
                {user?.role || 'Staff'}
              </span>
            </div>
            <div className="user-avatar">{getInitials()}</div>
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="main-body">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
