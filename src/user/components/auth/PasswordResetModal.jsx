import { CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  completeUserPasswordReset,
  verifyUserPasswordResetCode,
} from '../../../firebase/userAuth'
import Brand from '../common/Brand'

export default function PasswordResetModal({
  actionCode,
  onComplete,
  onRequestNewLink,
}) {
  const [status, setStatus] = useState('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    verifyUserPasswordResetCode(actionCode)
      .then((accountEmail) => {
        if (!active) return
        setEmail(accountEmail)
        setStatus('ready')
      })
      .catch((verificationError) => {
        if (!active) return
        setError(
          verificationError.message ||
            'This password reset link is invalid or has expired.',
        )
        setStatus('error')
      })
    return () => {
      active = false
    }
  }, [actionCode])

  const submit = async (event) => {
    event.preventDefault()
    if (submitting || status !== 'ready') return
    setError('')
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await completeUserPasswordReset(actionCode, password)
      setPassword('')
      setConfirmPassword('')
      setStatus('complete')
    } catch (resetError) {
      setError(resetError.message || 'Unable to reset your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-end bg-slate-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-4">
      <section aria-busy={status === 'checking' || submitting} className="w-full rounded-t-[30px] bg-[#f7f8f5] p-6 shadow-2xl sm:max-w-md sm:rounded-[30px] sm:p-8">
        <Brand />
        {status === 'checking' ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#75916f]/25 border-t-[#536a50]" />
              <p className="mt-4 text-sm font-bold text-[#425443]">
                Verifying your reset link…
              </p>
            </div>
          </div>
        ) : status === 'complete' ? (
          <div className="py-10 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={26} /></span>
            <h1 className="mt-5 text-2xl font-extrabold text-slate-950">Password updated.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Your old password no longer works. Sign in with your new password.</p>
            <button type="button" onClick={onComplete} className="mt-6 h-12 w-full rounded-full bg-slate-950 text-sm font-extrabold text-white transition hover:bg-[#ff5c35]">Continue to login</button>
          </div>
        ) : status === 'error' ? (
          <div className="py-10 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-100 text-red-600"><KeyRound size={25} /></span>
            <h1 className="mt-5 text-2xl font-extrabold text-slate-950">Reset link unavailable.</h1>
            <p role="alert" className="mt-2 text-sm leading-6 text-red-600">{error}</p>
            <button type="button" onClick={onRequestNewLink} className="mt-6 h-12 w-full rounded-full bg-slate-950 text-sm font-extrabold text-white transition hover:bg-[#ff5c35]">Request a new link</button>
          </div>
        ) : (
          <>
            <h1 className="mt-7 text-3xl font-extrabold tracking-[-0.04em] text-slate-950">Choose a new password.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Resetting the password for <strong>{email}</strong>.</p>
            {error && <div role="alert" className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{error}</div>}
            <form onSubmit={submit} className="mt-6 space-y-3">
              <label className="relative block">
                <span className="sr-only">New password</span>
                <LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="New password" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-11 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10" />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </label>
              <label className="relative block">
                <span className="sr-only">Confirm new password</span>
                <LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirm new password" className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10" />
              </label>
              <button disabled={submitting} className="h-12 w-full rounded-full bg-slate-950 text-sm font-extrabold text-white transition hover:bg-[#ff5c35] disabled:cursor-wait disabled:opacity-60">{submitting ? 'Updating password…' : 'Update password'}</button>
            </form>
          </>
        )}
      </section>
    </div>
  )
}
