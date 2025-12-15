import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { path: '/', label: '둘러보기' },
  { path: '/popular', label: '인기' },
  { path: '/search', label: '검색' },
  { path: '/wishlist', label: '위시리스트' },
  { path: '/profile', label: '프로필' },
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
      : tmdbKey || '연동되지 않음'

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="branding">
          <span className="brand-mark">NaDaflix</span>
          <span className="brand-subtitle">TMDB 데모 포털</span>
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
          <span className="tmdb-chip" title={tmdbKey || 'TMDB 키가 없습니다'}>
            TMDB 키: {formattedKey}
          </span>
          <button type="button" className="ghost-btn" onClick={handleLogout}>
            로그아웃
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
