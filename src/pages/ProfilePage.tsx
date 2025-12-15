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
    wishlistCount === 0
      ? 'movieWishlist가 비어 있습니다.'
      : `movieWishlist에 ${wishlistCount}개가 저장되어 있습니다.`

  return (
    <div className="page profile-page">
      <section className="page-hero profile-intro">
        <p className="eyebrow">프로필 & 설정</p>
        <h1>로컬스토리지로 NaDaflix 경험을 원하는 대로 구성하세요.</h1>
        <p>인증 상태, 테마, 위시리스트가 모두 LocalStorage에 저장됩니다.</p>
      </section>

      <section className="profile-overview">
        <article className="profile-card profile-user-card">
          <div className="profile-avatar" aria-hidden="true">
            {avatarLetter}
          </div>
          <div className="profile-user-meta">
            <p className="profile-label">로그인된 계정</p>
            <h2 className="profile-email" aria-live="polite">
              {userEmail || '이메일 정보를 찾을 수 없습니다'}
            </h2>
            <p className="profile-session">
              <span className={`status-dot ${loginState ? 'online' : 'offline'}`} aria-hidden="true" />
              {loginState ? '세션 유지 중' : '세션 종료됨'}
            </p>
          </div>
        </article>

        <article className="profile-card profile-storage-card">
          <header>
            <p className="profile-label">LocalStorage 스냅샷</p>
            <h3>주요 키 상태</h3>
          </header>
          <ul>
            <li>
              <span>isLogin</span>
              <strong>{loginState ? 'true' : 'false'}</strong>
            </li>
            <li>
              <span>rememberId</span>
              <strong>{rememberedEmail || '비어 있음'}</strong>
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
            <p className="profile-label">위시리스트 요약</p>
            <h3>저장된 영화</h3>
          </header>
          <div className="stat-value">{wishlistCount}</div>
          <p>{wishlistSummary}</p>
          <button type="button" className="pill-button" onClick={handleViewWishlist}>
            위시리스트 보기
          </button>
        </article>

        <article className="profile-card stat-card">
          <header>
            <p className="profile-label">저장된 로그인 정보</p>
            <h3>저장된 이메일</h3>
          </header>
          <div className="stat-value">{rememberedEmail || '저장되지 않음'}</div>
          <p>
            빠른 로그인을 위해 <code>rememberId</code> 키에 보관됩니다.
          </p>
        </article>
      </section>

      <section className="profile-grid settings-grid">
        <article className="profile-card theme-card">
          <header>
            <p className="profile-label">테마 설정</p>
            <h3>다크 vs 라이트</h3>
          </header>
          <p>
            <code>theme</code> 키에 저장됩니다.
          </p>
          <div className="theme-toggle" role="group" aria-label="테마 전환">
            <button
              type="button"
              className={theme === 'dark' ? 'is-active' : ''}
              onClick={() => handleThemeChoice('dark')}
              aria-pressed={theme === 'dark'}
            >
              다크
            </button>
            <button
              type="button"
              className={theme === 'light' ? 'is-active' : ''}
              onClick={() => handleThemeChoice('light')}
              aria-pressed={theme === 'light'}
            >
              라이트
            </button>
            <span className={`theme-toggle__thumb ${theme}`} aria-hidden="true" />
          </div>
        </article>

        <article className="profile-card logout-card">
          <header>
            <p className="profile-label">로그아웃</p>
            <h3>이 세션 종료</h3>
          </header>
          <p>
            <code>isLogin</code>과 <code>TMDb-Key</code> 값을 정리합니다.
          </p>
          <button type="button" className="logout-button" onClick={handleLogout}>
            로그아웃
          </button>
        </article>
      </section>
    </div>
  )
}

export default ProfilePage
