import { useEffect, useRef, useState } from 'react'
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
  const signInFormRef = useRef<HTMLFormElement>(null)
  const signUpFormRef = useRef<HTMLFormElement>(null)
  const [formHeight, setFormHeight] = useState(520)
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
      showStatus('error', '올바른 이메일 주소를 입력해주세요.')
      setIsSubmitting(false)
      return
    }

    if (password.length === 0) {
      showStatus('error', '로그인하려면 TMDB API 키가 필요합니다.')
      setIsSubmitting(false)
      return
    }

    const result = authenticateUser(email, password)
    if (!result.success) {
      showStatus('error', '해당 이메일과 TMDB 키로 등록된 사용자를 찾을 수 없습니다.')
      setIsSubmitting(false)
      return
    }

    if (loginForm.remember) {
      storeRememberedId(email)
    } else {
      storeRememberedId(undefined)
    }

    loginWithKey(password)
    showStatus('success', '로그인에 성공했습니다! 곧 이동합니다...')
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
      showStatus('error', '회원가입 전에 올바른 이메일을 입력해주세요.')
      setIsSubmitting(false)
      return
    }

    if (password.length === 0) {
      showStatus('error', 'TMDB API 키를 입력해주세요.')
      setIsSubmitting(false)
      return
    }

    if (password !== confirm) {
      showStatus('error', 'TMDB API 키 확인 값이 일치하지 않습니다.')
      setIsSubmitting(false)
      return
    }

    if (!signupForm.agree) {
      showStatus('error', '서비스 약관에 동의해야 합니다.')
      setIsSubmitting(false)
      return
    }

    const result = registerUser(email, password)
    if (!result.success) {
      showStatus('error', result.message ?? '회원가입을 완료할 수 없습니다.')
      setIsSubmitting(false)
      return
    }

    showStatus('success', '계정이 생성되었습니다! TMDB 키로 로그인해주세요.')
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

  useEffect(() => {
    const updateWrapperHeight = () => {
      const activeForm = mode === 'signin' ? signInFormRef.current : signUpFormRef.current
      if (activeForm) {
        setFormHeight(activeForm.offsetHeight)
      }
    }

    updateWrapperHeight()

    window.addEventListener('resize', updateWrapperHeight)
    return () => window.removeEventListener('resize', updateWrapperHeight)
  }, [mode])

  return (
    <div className="signin-page">
      <div className="gradient-bg" />
      <div className={`auth-card ${mode === 'signup' ? 'show-signup' : ''}`}>
        <div className="auth-body">
          <section className="auth-copy">
            <p className="eyebrow">NaDaflix에 오신 것을 환영합니다</p>
            <h1>최신 인기작부터 숨은 명작까지 한곳에서 만나보세요.</h1>
            <p className="supporting">
              등록한 TMDB 키는 이 기기에 안전하게 보관되며 언제든지 변경하거나 삭제할 수 있습니다.
            </p>
            <button className="mode-toggle" type="button" onClick={handleModeToggle}>
              {mode === 'signin' ? '계정이 없나요? 가입하기' : '이미 계정이 있나요? 로그인하기'}
            </button>
          </section>

          <section className="auth-forms-wrapper" style={{ height: `${formHeight}px` }}>
            <form
              ref={signInFormRef}
              className="auth-form sign-in"
              onSubmit={handleSignIn}
              aria-hidden={mode !== 'signin'}
            >
              <h2>로그인</h2>
              <label htmlFor="signin-email">이메일</label>
              <input
                id="signin-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="student@school.ac.kr"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              <label htmlFor="signin-password">TMDB API 키</label>
              <input
                id="signin-password"
                name="password"
                type="password"
                placeholder="TMDB 키를 붙여넣으세요"
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
                  이메일 기억하기
                </label>
              </div>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting && mode === 'signin' ? '확인 중...' : '앱으로 이동'}
              </button>
            </form>

            <form
              ref={signUpFormRef}
              className="auth-form sign-up"
              onSubmit={handleSignUp}
              aria-hidden={mode !== 'signup'}
            >
              <h2>계정 만들기</h2>
              <label htmlFor="signup-email">이메일</label>
              <input
                id="signup-email"
                type="email"
                placeholder="student@school.ac.kr"
                value={signupForm.email}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, email: event.target.value }))
                }
              />
              <label htmlFor="signup-password">TMDB API 키</label>
              <input
                id="signup-password"
                type="password"
                placeholder="TMDB API 키"
                value={signupForm.password}
                onChange={(event) =>
                  setSignupForm((prev) => ({ ...prev, password: event.target.value }))
                }
              />
              <label htmlFor="signup-confirm">TMDB 키 확인</label>
              <input
                id="signup-confirm"
                type="password"
                placeholder="TMDB 키를 다시 입력하세요"
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
                <span>
                  <strong>약관 동의</strong> — 이 기기에 입력한 TMDB 키가 저장되며 나중에 언제든 삭제할 수
                  있다는 사실을 확인했습니다.
                </span>
              </label>

              <button type="submit" disabled={isSubmitting || !signupForm.agree}>
                {isSubmitting && mode === 'signup' ? '생성 중...' : '회원가입'}
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
