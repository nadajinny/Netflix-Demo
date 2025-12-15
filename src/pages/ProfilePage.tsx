import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getStoredTmdbKey, readUsers } from '../utils/auth'
import {
  THEME_STORAGE_KEY,
  applyThemeClass,
  getStoredTheme,
  saveThemePreference,
  type ThemePreference,
} from '../utils/theme'

const STORAGE_KEYS = {
  wishlist: 'movieWishlist',
  isLogin: 'isLogin',
  rememberId: 'rememberId',
  users: 'users',
  tmdbKey: 'TMDb-Key',
}

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage

const readWishlistCount = () => {
  if (!canUseStorage()) return 0
  const raw = window.localStorage.getItem(STORAGE_KEYS.wishlist)
  if (!raw) return 0

  try {
    const entries = JSON.parse(raw) as unknown
    return Array.isArray(entries) ? entries.length : 0
  } catch {
    return 0
  }
}

const readRememberedId = () => {
  if (!canUseStorage()) return ''
  return window.localStorage.getItem(STORAGE_KEYS.rememberId) ?? ''
}

const readLoginState = () => {
  if (!canUseStorage()) return false
  return window.localStorage.getItem(STORAGE_KEYS.isLogin) === 'true'
}

const resolveUserEmail = () => {
  const remembered = readRememberedId()
  if (remembered) return remembered

  const tmdbKey = getStoredTmdbKey()
  if (!tmdbKey) return ''

  const users = readUsers()
  const match = users.find((user) => user.password === tmdbKey)
  return match?.id ?? ''
}

/**
 * The Profile page displays user-related information and preferences using LocalStorage only.
 * It demonstrates client-side authentication state handling, UI personalization, and persistent user settings without any backend services.
 */
const ProfilePage = () => {
  const [theme, setTheme] = useState<ThemePreference>(() => getStoredTheme())
  const [wishlistCount, setWishlistCount] = useState(() => readWishlistCount())
  const [userEmail, setUserEmail] = useState(() => resolveUserEmail())
  const [rememberedEmail, setRememberedEmail] = useState(() => readRememberedId())
  const [loginState, setLoginState] = useState(() => readLoginState())

  const { logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    saveThemePreference(theme)
    applyThemeClass(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === STORAGE_KEYS.wishlist) {
        setWishlistCount(readWishlistCount())
      }

      if (
        !event.key ||
        event.key === STORAGE_KEYS.rememberId ||
        event.key === STORAGE_KEYS.tmdbKey ||
        event.key === STORAGE_KEYS.users
      ) {
        setRememberedEmail(readRememberedId())
        setUserEmail(resolveUserEmail())
      }

      if (!event.key || event.key === STORAGE_KEYS.isLogin) {
        setLoginState(readLoginState())
      }

      if (!event.key || event.key === THEME_STORAGE_KEY) {
        setTheme(getStoredTheme())
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (!loginState) {
      navigate('/signin', { replace: true })
    }
  }, [loginState, navigate])

  const avatarLetter = useMemo(() => {
    if (!userEmail) return '?'
    return userEmail.charAt(0).toUpperCase()
  }, [userEmail])

  const handleViewWishlist = () => {
    navigate('/wishlist')
  }

  const handleThemeChoice = (nextTheme: ThemePreference) => {
    setTheme(nextTheme)
  }

  const handleLogout = () => {
    logout()
    setLoginState(false)
    navigate('/signin', { replace: true })
  }

  const wishlistSummary =
    wishlistCount === 0 ? 'movieWishlist is empty.' : `${wishlistCount} saved in movieWishlist.`

  return (
    <div className="page profile-page">
      <section className="page-hero profile-intro">
        <p className="eyebrow">Profile & Settings</p>
        <h1>Personalize your MockFlix experience using only LocalStorage.</h1>
        <p>Your auth state, theme, and wishlist all live in LocalStorage.</p>
      </section>

      <section className="profile-overview">
        <article className="profile-card profile-user-card">
          <div className="profile-avatar" aria-hidden="true">
            {avatarLetter}
          </div>
          <div className="profile-user-meta">
            <p className="profile-label">Signed in as</p>
            <h2 className="profile-email" aria-live="polite">
              {userEmail || 'Email unavailable'}
            </h2>
            <p className="profile-session">
              <span className={`status-dot ${loginState ? 'online' : 'offline'}`} aria-hidden="true" />
              {loginState ? 'Session active' : 'Session ended'}
            </p>
          </div>
        </article>

        <article className="profile-card profile-storage-card">
          <header>
            <p className="profile-label">LocalStorage snapshot</p>
            <h3>Key states at a glance</h3>
          </header>
          <ul>
            <li>
              <span>isLogin</span>
              <strong>{loginState ? 'true' : 'false'}</strong>
            </li>
            <li>
              <span>rememberId</span>
              <strong>{rememberedEmail || 'empty'}</strong>
            </li>
            <li>
              <span>movieWishlist</span>
              <strong>{wishlistCount}</strong>
            </li>
            <li>
              <span>theme</span>
              <strong>{theme}</strong>
            </li>
          </ul>
        </article>
      </section>

      <section className="profile-grid">
        <article className="profile-card stat-card">
          <header>
            <p className="profile-label">Wishlist summary</p>
            <h3>Saved movies</h3>
          </header>
          <div className="stat-value">{wishlistCount}</div>
          <p>{wishlistSummary}</p>
          <button type="button" className="pill-button" onClick={handleViewWishlist}>
            View Wishlist
          </button>
        </article>

        <article className="profile-card stat-card">
          <header>
            <p className="profile-label">Remembered login</p>
            <h3>Email memory</h3>
          </header>
          <div className="stat-value">{rememberedEmail || 'Not stored'}</div>
          <p>
            Stored under <code>rememberId</code> for quick sign-ins.
          </p>
        </article>
      </section>

      <section className="profile-grid settings-grid">
        <article className="profile-card theme-card">
          <header>
            <p className="profile-label">Theme preference</p>
            <h3>Dark vs Light</h3>
          </header>
          <p>Saved to the <code>theme</code> key.</p>
          <div className="theme-toggle" role="group" aria-label="Theme toggle">
            <button
              type="button"
              className={theme === 'dark' ? 'is-active' : ''}
              onClick={() => handleThemeChoice('dark')}
              aria-pressed={theme === 'dark'}
            >
              Dark
            </button>
            <button
              type="button"
              className={theme === 'light' ? 'is-active' : ''}
              onClick={() => handleThemeChoice('light')}
              aria-pressed={theme === 'light'}
            >
              Light
            </button>
            <span className={`theme-toggle__thumb ${theme}`} aria-hidden="true" />
          </div>
        </article>

        <article className="profile-card logout-card">
          <header>
            <p className="profile-label">Logout</p>
            <h3>End this session</h3>
          </header>
          <p>Clears <code>isLogin</code> and <code>TMDb-Key</code>.</p>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Log out
          </button>
        </article>
      </section>
    </div>
  )
}

export default ProfilePage
