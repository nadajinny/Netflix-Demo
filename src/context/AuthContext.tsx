import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  clearLoginState,
  getStoredTmdbKey,
  isLoggedIn,
  persistLoginState,
} from '../utils/auth'

type AuthContextValue = {
  isAuthenticated: boolean
  tmdbKey: string
  loginWithKey: (tmdbKey: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => isLoggedIn())
  const [tmdbKey, setTmdbKey] = useState(() => getStoredTmdbKey())

  const loginWithKey = (key: string) => {
    persistLoginState(key)
    setIsAuthenticated(true)
    setTmdbKey(key)
  }

  const logout = () => {
    clearLoginState()
    setIsAuthenticated(false)
    setTmdbKey('')
  }

  useEffect(() => {
    const syncAuth = () => {
      setIsAuthenticated(isLoggedIn())
      setTmdbKey(getStoredTmdbKey())
    }

    window.addEventListener('storage', syncAuth)
    return () => window.removeEventListener('storage', syncAuth)
  }, [])

  const value = useMemo(
    () => ({
      isAuthenticated,
      tmdbKey,
      loginWithKey,
      logout,
    }),
    [isAuthenticated, tmdbKey],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
