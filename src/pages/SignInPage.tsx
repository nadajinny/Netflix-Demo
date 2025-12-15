import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  authenticateUser,
  getRememberedId,
  registerUser,
  storeRememberedId,
  validateEmail,
} from '../utils/auth'
import './SignInPage.css'

type AuthMode = 'signin' | 'signup'

type StatusState = {
  type: 'success' | 'error'
  message: string
} | null

const SignInPage = () => {
  const rememberedId = getRememberedId()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [status, setStatus] = useState<StatusState>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginForm, setLoginForm] = useState({
    email: rememberedId,
    password: '',
    remember: rememberedId.length > 0,
  })

  const [signupForm, setSignupForm] = useState({
    email: '',
    password: '',
    confirm: '',
    agree: false,
  })

  const navigate = useNavigate()
  const location = useLocation()
  const { loginWithKey } = useAuth()
  const redirectPath =
    (location.state as { from?: { pathname?: string } } | undefined)?.from?.pathname ||
    '/'

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message })
  }

  const resetStatus = () => setStatus(null)

  const handleModeToggle = () => {
    resetStatus()
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))
  }

  const handleSignIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetStatus()
    setIsSubmitting(true)

    const email = loginForm.email.trim().toLowerCase()
    const password = loginForm.password.trim()

    if (!validateEmail(email)) {
      showStatus('error', 'Please enter a valid email address.')
      setIsSubmitting(false)
      return
    }

    if (password.length === 0) {
      showStatus('error', 'Your TMDB API key is required to sign in.')
      setIsSubmitting(false)
      return
    }

    const result = authenticateUser(email, password)
    if (!result.success) {
      showStatus('error', 'No matching user found for that email & TMDB key.')
      setIsSubmitting(false)
      return
    }

    if (loginForm.remember) {
      storeRememberedId(email)
    } else {
      storeRememberedId(undefined)
    }

    loginWithKey(password)
    showStatus('success', 'Login successful! Redirecting you now...')
    setTimeout(() => navigate(redirectPath, { replace: true }), 600)
    setIsSubmitting(false)
  }

  const handleSignUp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetStatus()
    setIsSubmitting(true)

    const email = signupForm.email.trim().toLowerCase()
    const password = signupForm.password.trim()
    const confirm = signupForm.confirm.trim()

    if (!validateEmail(email)) {
      showStatus('error', 'Enter a valid email before registering.')
      setIsSubmitting(false)
      return
    }

    if (password.length === 0) {
      showStatus('error', 'Please provide your TMDB API key.')
      setIsSubmitting(false)
      return
    }

    if (password !== confirm) {
      showStatus('error', 'TMDB API key confirmation does not match.')
      setIsSubmitting(false)
      return
    }

    if (!signupForm.agree) {
      showStatus('error', 'You must agree to the academic usage terms.')
      setIsSubmitting(false)
      return
    }

    const result = registerUser(email, password)
    if (!result.success) {
      showStatus('error', result.message ?? 'Unable to complete registration.')
      setIsSubmitting(false)
      return
    }

    showStatus('success', 'Account created! Please sign in with your TMDB key.')
    setSignupForm({
      email: '',
      password: '',
      confirm: '',
      agree: false,
    })
    setLoginForm((prev) => ({ ...prev, email }))
    setMode('signin')
    navigate('/signin', { replace: true })
    setIsSubmitting(false)
  }

  return (
    <div className="signin-page">
      <div className="gradient-bg" />
      <div className={`auth-card ${mode === 'signup' ? 'show-signup' : ''}`}>
        <div className="auth-body">
          <section className="auth-copy">
            <p className="eyebrow">Mock Netflix Experience</p>
            <h1>Access TMDB powered catalogs in minutes.</h1>
            <p className="supporting">
              This academic-only authentication flow saves your TMDB key in LocalStorage
              to make SPA development easier. In production you&apos;d never store keys
              in the browser.
            </p>
            <button className="mode-toggle" type="button" onClick={handleModeToggle}>
              {mode === 'signin' ? 'Need an account? Sign up' : 'Already have access?'}
            </button>
          </section>

          <section className="auth-forms-wrapper">
            <form className="auth-form sign-in" onSubmit={handleSignIn}>
              <h2>Sign in</h2>
              <label htmlFor="signin-email">Email address</label>
              <input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              <label htmlFor="signin-password">TMDB API key</label>
              <input
                id="signin-password"
                name="password"
                type="password"
                placeholder="Paste your TMDB key"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
              <div className="form-row">
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={loginForm.remember}
                    onChange={(event) =>
                      setLoginForm((prev) => ({ ...prev, remember: event.target.checked }))
                    }
                  />
                  Remember my email
                </label>
              </div>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting && mode === 'signin' ? 'Checking...' : 'Enter app'}
              </button>
            </form>

            <form className="auth-form sign-up" onSubmit={handleSignUp}>
              <h2>Create an account</h2>
              <label htmlFor="signup-email">Email address</label>
              <input
                id="signup-email"
                type="email"
                placeholder="student@example.com"
                value={signupForm.email}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              <label htmlFor="signup-password">TMDB API key</label>
              <input
                id="signup-password"
                type="password"
                placeholder="TMDB API key"
                value={signupForm.password}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
              <label htmlFor="signup-confirm">Confirm TMDB key</label>
              <input
                id="signup-confirm"
                type="password"
                placeholder="Retype your TMDB key"
                value={signupForm.confirm}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, confirm: event.target.value }))
                }
              />

              <label className="checkbox-field terms">
                <input
                  type="checkbox"
                  checked={signupForm.agree}
                  onChange={(event) =>
                    setSignupForm((prev) => ({ ...prev, agree: event.target.checked }))
                  }
                />
                I understand this demo stores my TMDB key in LocalStorage for academic
                purposes only.
              </label>

              <button type="submit" disabled={isSubmitting}>
                {isSubmitting && mode === 'signup' ? 'Creating...' : 'Register & return'}
              </button>
            </form>
          </section>
        </div>
      </div>

      {status && (
        <div className={`toast ${status.type}`} role="status" aria-live="assertive">
          {status.message}
        </div>
      )}
    </div>
  )
}

export default SignInPage
