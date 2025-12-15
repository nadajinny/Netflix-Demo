export type StoredUser = {
  id: string
  password: string
}

const USERS_KEY = 'users'
const TMDB_KEY = 'TMDb-Key'
const IS_LOGIN_KEY = 'isLogin'
const REMEMBER_ID_KEY = 'rememberId'

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

const canUseStorage = () => typeof window !== 'undefined' && !!window.localStorage

const readFromStorage = (key: string) => {
  if (!canUseStorage()) return null
  return window.localStorage.getItem(key)
}

const writeToStorage = (key: string, value: string) => {
  if (!canUseStorage()) return
  window.localStorage.setItem(key, value)
}

const removeFromStorage = (key: string) => {
  if (!canUseStorage()) return
  window.localStorage.removeItem(key)
}

export const validateEmail = (email: string) => EMAIL_REGEX.test(email)

export const readUsers = (): StoredUser[] => {
  const raw = readFromStorage(USERS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as StoredUser[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry) => entry?.id && entry?.password)
  } catch {
    return []
  }
}

export const saveUsers = (users: StoredUser[]) => {
  writeToStorage(USERS_KEY, JSON.stringify(users))
}

export const registerUser = (email: string, password: string) => {
  const users = readUsers()
  if (users.some((user) => user.id === email)) {
    return { success: false, message: 'That email is already registered.' }
  }

  const updated = [...users, { id: email, password }]
  saveUsers(updated)

  return { success: true }
}

export const authenticateUser = (email: string, password: string) => {
  const users = readUsers()
  const match = users.find((user) => user.id === email && user.password === password)

  if (!match) {
    return { success: false, message: 'Invalid credentials provided.' }
  }

  return { success: true, tmdbKey: match.password }
}

export const persistLoginState = (tmdbKey: string) => {
  writeToStorage(TMDB_KEY, tmdbKey)
  writeToStorage(IS_LOGIN_KEY, 'true')
}

export const clearLoginState = () => {
  removeFromStorage(TMDB_KEY)
  writeToStorage(IS_LOGIN_KEY, 'false')
}

export const isLoggedIn = () => readFromStorage(IS_LOGIN_KEY) === 'true'

export const getStoredTmdbKey = () => readFromStorage(TMDB_KEY) ?? ''

export const storeRememberedId = (email?: string) => {
  if (!email) {
    removeFromStorage(REMEMBER_ID_KEY)
    return
  }
  writeToStorage(REMEMBER_ID_KEY, email)
}

export const getRememberedId = () => readFromStorage(REMEMBER_ID_KEY) ?? ''
