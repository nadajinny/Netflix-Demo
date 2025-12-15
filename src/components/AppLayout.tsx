import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/', label: 'Browse' },
  { path: '/popular', label: 'Popular' },
  { path: '/search', label: 'Search' },
  { path: '/wishlist', label: 'Wishlist' },
]

const AppLayout = () => {
  const { tmdbKey, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/signin', { replace: true })
  }

  const formattedKey =
    tmdbKey.length > 10
      ? `${tmdbKey.slice(0, 4)}...${tmdbKey.slice(-4)}`
      : tmdbKey || 'Not linked'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="branding">
          <span className="brand-mark">MockFlix</span>
          <span className="brand-subtitle">TMDB Demo Portal</span>
        </div>

        <nav className="main-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'is-active' : ''}`
              }
              end={item.path === '/'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="header-actions">
          <span className="tmdb-chip" title={tmdbKey || 'TMDB key missing'}>
            TMDB Key: {formattedKey}
          </span>
          <button type="button" className="ghost-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

export default AppLayout
