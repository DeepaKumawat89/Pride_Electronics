import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Phone, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Brand from '../common/Brand'
import { signInUser, signUpUser } from '../../../firebase/userAuth'

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const handleEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('Please enter your full name.')
        return
      }
      if (!/^[6-9]\d{9}$/.test(phone)) {
        setError('Enter a valid 10-digit Indian mobile number.')
        return
      }
      if (
        password.length < 8 ||
        !/[a-z]/.test(password) ||
        !/[A-Z]/.test(password) ||
        !/\d/.test(password)
      ) {
        setError(
          'Use at least 8 characters with uppercase, lowercase, and a number.',
        )
        return
      }
      if (password !== confirmPassword) {
        setError('The passwords do not match.')
        return
      }
    }

    setSubmitting(true)
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
      onClose()
    } catch (authenticationError) {
      setError(
        authenticationError.message ||
          'Authentication failed. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="relative max-h-[96vh] w-full overflow-y-auto rounded-t-[30px] bg-[#f7f8f5] p-5 shadow-2xl sm:max-w-md sm:rounded-[30px] sm:p-8">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 grid size-9 place-items-center rounded-full bg-white text-slate-500 shadow-sm transition hover:bg-slate-950 hover:text-white" aria-label="Close authentication"><X size={17}/></button>
        <Brand />

        <div className="mt-7 grid grid-cols-2 rounded-full bg-white p-1">
          <button type="button" onClick={() => switchMode('login')} className={`rounded-full px-4 py-2.5 text-xs font-extrabold transition ${mode === 'login' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Login</button>
          <button type="button" onClick={() => switchMode('signup')} className={`rounded-full px-4 py-2.5 text-xs font-extrabold transition ${mode === 'signup' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Sign up</button>
        </div>

        <h2 className="mt-7 text-3xl font-extrabold tracking-[-0.04em]">{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{mode === 'login' ? 'Sign in securely with your email or verified mobile number.' : 'Create your secure Pride Electronics account.'}</p>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {mode === 'signup' && (
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
          <label className="relative block">
            <span className="sr-only">{mode === 'login' ? 'Email or mobile number' : 'Email address'}</span><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input required value={email} onChange={(event) => setEmail(event.target.value)} type={mode === 'signup' ? 'email' : 'text'} inputMode={mode === 'signup' ? 'email' : 'text'} autoComplete="email" placeholder={mode === 'login' ? 'Email or mobile number' : 'Email address'} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
          </label>
          <label className="relative block">
            <span className="sr-only">Password</span><LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input required value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="Password" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-11 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
            <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
          </label>
          {mode === 'signup' && (
            <label className="relative block">
              <span className="sr-only">Confirm password</span><LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirm password" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
            </label>
          )}
          <button disabled={submitting} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-extrabold text-white transition hover:bg-[#ff5c35] disabled:cursor-wait disabled:opacity-60">{submitting ? 'Please wait…' : mode === 'login' ? 'Login to account' : 'Create account'} <ArrowRight size={16}/></button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">{mode === 'login' ? 'New to Pride?' : 'Already have an account?'} <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="font-extrabold text-[#ff5c35]">{mode === 'login' ? 'Sign up' : 'Login'}</button></p>
      </div>
    </div>
  )
}
