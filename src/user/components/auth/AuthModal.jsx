import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Brand from '../common/Brand'

const MOCK_ACCOUNTS_KEY = 'pride_mock_accounts'

function getStoredAccounts() {
  try {
    return JSON.parse(sessionStorage.getItem(MOCK_ACCOUNTS_KEY) || '[]')
  } catch {
    return []
  }
}

function nameFromEmail(email) {
  return email
    .split('@')[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Pride Customer'
}

export default function AuthModal({ open, onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

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

  const handleSubmit = (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (password.length < 4) {
      setError('Use at least 4 characters for the mock password.')
      return
    }

    if (mode === 'signup') {
      if (name.trim().length < 2) {
        setError('Please enter your full name.')
        return
      }
      if (password !== confirmPassword) {
        setError('The passwords do not match.')
        return
      }

      const accounts = getStoredAccounts().filter((account) => account.email !== normalizedEmail)
      const user = { name: name.trim(), email: normalizedEmail }
      sessionStorage.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify([...accounts, { ...user, password }]))
      onSuccess(user, 'signup')
    } else {
      const account = getStoredAccounts().find((item) => item.email === normalizedEmail)
      if (account && account.password !== password) {
        setError('Incorrect mock password for this account.')
        return
      }
      onSuccess({ name: account?.name || nameFromEmail(normalizedEmail), email: normalizedEmail }, 'login')
    }

    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setError('')
    onClose()
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
        <p className="mt-2 text-sm leading-6 text-slate-500">{mode === 'login' ? 'Use any email and a 4+ character password for this mock login.' : 'Your mock account stays available during this browser session.'}</p>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          {mode === 'signup' && (
            <label className="relative block">
              <span className="sr-only">Full name</span><UserRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
              <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="Full name" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
            </label>
          )}
          <label className="relative block">
            <span className="sr-only">Email address</span><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input required value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="Email address" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"/>
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
          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-extrabold text-white transition hover:bg-[#ff5c35]">{mode === 'login' ? 'Login to account' : 'Create account'} <ArrowRight size={16}/></button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">{mode === 'login' ? 'New to Pride?' : 'Already have an account?'} <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} className="font-extrabold text-[#ff5c35]">{mode === 'login' ? 'Sign up' : 'Login'}</button></p>
      </div>
    </div>
  )
}
