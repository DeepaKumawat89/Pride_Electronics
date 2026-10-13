import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import Brand from '../common/Brand'
import {
  clearPendingGoogleLink,
  requestUserPasswordReset,
  signInUser,
  signInUserWithGoogle,
  signUpUser,
} from '../../../firebase/userAuth'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14.1a6 6 0 0 1 0-4.2V7.3H3.2a10 10 0 0 0 0 9.4l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.9.5 3.9 1.5l2.8-2.8A9.5 9.5 0 0 0 12 2a10 10 0 0 0-8.8 5.3l3.3 2.6a5.8 5.8 0 0 1 5.5-4Z" />
    </svg>
  )
}

export default function AuthModal({ initialMode = 'login', open, onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submissionMethod, setSubmissionMethod] = useState('')
  const submittingRef = useRef(false)

  const closeModal = useCallback(() => {
    if (submittingRef.current) return
    clearPendingGoogleLink()
    setMode('login')
    setError('')
    setMessage('')
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const handleEscape = (event) =>
      event.key === 'Escape' && closeModal()
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, closeModal])

  if (!open) return null

  const switchMode = (nextMode) => {
    if (submittingRef.current) return
    if (nextMode === 'signup') clearPendingGoogleLink()
    setMode(nextMode)
    setError('')
    setMessage('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submittingRef.current) return
    setError('')
    setMessage('')
    const normalizedIdentifier = email.trim()
    if (!normalizedIdentifier) {
      setError(
        'Enter your email address.',
      )
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier)) {
      setError('Enter a valid email address.')
      return
    }
    if (mode === 'forgot') {
      submittingRef.current = true
      setSubmitting(true)
      setSubmissionMethod('password-reset')
      try {
        const result = await requestUserPasswordReset(normalizedIdentifier)
        setMessage(result.message)
      } catch (authenticationError) {
        setError(
          authenticationError.message ||
            'Unable to send the password reset email. Please try again.',
        )
      } finally {
        submittingRef.current = false
        setSubmitting(false)
        setSubmissionMethod('')
      }
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('Please enter your full name.')
        return
      }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        setError('Enter a valid 10-digit Indian mobile number.')
        return
      }
      if (password !== confirmPassword) {
        setError('The passwords do not match.')
        return
      }
    }

    submittingRef.current = true
    setSubmitting(true)
    setSubmissionMethod('password')
    try {
      const user = mode === 'signup'
        ? await signUpUser({ name, phone, email, password })
        : await signInUser(email, password)
      onSuccess(user, mode)
      setName('')
      setPhone('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setError('')
      clearPendingGoogleLink()
      onClose()
    } catch (authenticationError) {
      setError(
        authenticationError.message ||
          'Authentication failed. Please try again.',
      )
    } finally {
      submittingRef.current = false
      setSubmitting(false)
      setSubmissionMethod('')
    }
  }

  const handleGoogleAuthentication = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    setSubmissionMethod('google')
    setError('')
    try {
      const user = await signInUserWithGoogle()
      onSuccess(user, user.isNewUser ? 'signup' : 'login')
      setName('')
      setPhone('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setError('')
      onClose()
    } catch (authenticationError) {
      if (authenticationError.code === 'account-linking-required') {
        setMode('login')
        setEmail(authenticationError.email || '')
        setPassword('')
        setConfirmPassword('')
      }
      setError(
        authenticationError.message ||
          'Google authentication failed. Please try again.',
      )
    } finally {
      submittingRef.current = false
      setSubmitting(false)
      setSubmissionMethod('')
    }
  }

  const isSignup = mode === 'signup'
  const isForgotPassword = mode === 'forgot'
  const title = mode === 'login'
    ? 'Welcome back.'
    : isSignup
      ? 'Create your account.'
      : 'Reset your password.'
  const description = mode === 'login'
    ? 'Sign in securely with your email and password.'
    : isSignup
      ? 'Create your secure Pride Electronics account.'
      : 'Enter your account email and Firebase will send a secure reset link.'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 p-0 backdrop-blur-sm md:place-items-center md:p-6"
      onMouseDown={(event) => event.target === event.currentTarget && closeModal()}
    >
      <div
        aria-busy={submitting}
        className={`relative max-h-[96vh] w-full overflow-y-auto rounded-t-[30px] bg-[#f7f8f5] shadow-2xl transition-[max-width] duration-300 md:rounded-[32px] ${
          isSignup
            ? 'md:max-w-5xl'
            : isForgotPassword
              ? 'md:max-w-3xl'
              : 'md:max-w-4xl'
        }`}
      >
        <button
          type="button"
          disabled={submitting}
          onClick={closeModal}
          className="absolute right-4 top-4 z-20 grid size-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-950 hover:text-white disabled:cursor-wait disabled:opacity-50 md:right-5 md:top-5"
          aria-label="Close authentication"
        >
          <X size={17}/>
        </button>

        <div className={`grid md:grid-cols-[minmax(0,0.82fr)_minmax(360px,1.18fr)] ${isSignup ? 'lg:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)]' : ''}`}>
          <section className="relative isolate overflow-hidden bg-[#17211d] px-6 py-8 text-white md:flex md:min-h-full md:flex-col md:justify-between md:px-8 md:py-10 lg:px-10">
            <div className="absolute -left-20 -top-24 -z-10 size-64 rounded-full bg-[#397a4a]/25 blur-2xl" />
            <div className="absolute -bottom-28 -right-20 -z-10 size-64 rounded-full bg-[#ff5c35]/20 blur-2xl" />
            <Brand inverse />

            <div className="mt-8 max-w-sm md:mt-16">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#ffb000]">
                {isForgotPassword ? 'Account recovery' : 'Your Pride account'}
              </p>
              <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                {description}
              </p>
            </div>

            {!isForgotPassword && (
              <div className="mt-7 hidden gap-3 text-xs font-semibold text-white/65 md:grid">
                <p className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#ffb000]" /> Faster, secure checkout</p>
                <p className="flex items-center gap-2"><CheckCircle2 size={15} className="text-[#ffb000]" /> Orders and wishlist in one place</p>
              </div>
            )}
          </section>

          <section className="px-5 pb-6 pt-5 sm:px-8 sm:pb-8 md:px-9 md:py-10 lg:px-12">
            {!isForgotPassword && (
              <div className="mr-12 grid grid-cols-2 rounded-full bg-white p-1 shadow-sm ring-1 ring-slate-200/70">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => switchMode('login')}
                  className={`rounded-full px-4 py-2.5 text-xs font-extrabold transition disabled:cursor-wait ${mode === 'login' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Login
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => switchMode('signup')}
                  className={`rounded-full px-4 py-2.5 text-xs font-extrabold transition disabled:cursor-wait ${isSignup ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Sign up
                </button>
              </div>
            )}

            <div className={isForgotPassword ? 'mr-12' : 'mt-7'}>
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-400">
                {isForgotPassword ? 'Reset access' : isSignup ? 'Personal details' : 'Account details'}
              </p>
              <h3 className="mt-2 text-xl font-extrabold tracking-[-0.03em] text-slate-950">
                {isForgotPassword ? 'Where should we send the link?' : isSignup ? 'Set up your profile' : 'Enter your credentials'}
              </h3>
            </div>

            {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{error}</div>}
            {message && <div role="status" className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{message}</div>}

            <form onSubmit={handleSubmit} className={`mt-5 grid gap-3 ${isSignup ? 'sm:grid-cols-2' : ''}`}>
              {isSignup && (
                <>
                  <label className="relative block">
                    <span className="sr-only">Full name</span><UserRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Full name" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
                  </label>
                  <label className="relative block">
                    <span className="sr-only">Mobile number</span><Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input required value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} type="tel" inputMode="numeric" autoComplete="tel" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="Mobile number" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
                  </label>
                </>
              )}
              <label className={`relative block ${isSignup ? 'sm:col-span-2' : ''}`}>
                <span className="sr-only">Email address</span><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input required value={email} onChange={(event) => setEmail(event.target.value)} type="email" inputMode="email" autoComplete="email" placeholder="Email address" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
              </label>
              {!isForgotPassword && <label className="relative block">
                <span className="sr-only">Password</span><LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                <input required value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Password" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-11 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
              </label>}
              {mode === 'login' && (
                <div className="flex justify-end">
                  <button type="button" disabled={submitting} onClick={() => switchMode('forgot')} className="text-xs font-extrabold text-[#ff5c35] disabled:cursor-wait disabled:opacity-50">Forgot password?</button>
                </div>
              )}
              {isSignup && (
                <label className="relative block sm:col-start-2">
                  <span className="sr-only">Confirm password</span><LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
                  <input required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirm password" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
                </label>
              )}
              <button disabled={submitting} className={`flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-extrabold text-white transition hover:bg-[#ff5c35] disabled:cursor-wait disabled:opacity-60 ${isSignup ? 'sm:col-span-2' : ''}`}>{submissionMethod === 'password' || submissionMethod === 'password-reset' ? 'Please wait…' : mode === 'login' ? 'Login to account' : isSignup ? 'Create account' : 'Send reset link'} <ArrowRight size={16}/></button>
            </form>

            {isForgotPassword ? (
              <button type="button" disabled={submitting} onClick={() => switchMode('login')} className="mx-auto mt-6 flex items-center gap-2 text-xs font-extrabold text-[#397a4a] disabled:cursor-wait disabled:opacity-50"><ArrowLeft size={14} /> Back to login</button>
            ) : (
              <>
                <p className="mt-5 text-center text-xs text-slate-500">{mode === 'login' ? 'New to Pride?' : 'Already have an account?'} <button type="button" disabled={submitting} onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="font-extrabold text-[#ff5c35] disabled:cursor-wait disabled:opacity-50">{mode === 'login' ? 'Sign up' : 'Login'}</button></p>
                <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><span className="h-px flex-1 bg-slate-200"/><span>or</span><span className="h-px flex-1 bg-slate-200"/></div>
                <button type="button" disabled={submitting} onClick={handleGoogleAuthentication} className="flex h-12 w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60">
                  <GoogleIcon />
                  {submissionMethod === 'google' ? 'Connecting to Google…' : 'Continue with Google'}
                </button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
