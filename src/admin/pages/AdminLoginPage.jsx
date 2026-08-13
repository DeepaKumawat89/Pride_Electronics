import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Package,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Zap,
} from 'lucide-react'
import { demoAdmin } from '../services/adminAuthService'

const stats = [
  [BarChart3, '₹2.4L', 'Revenue today'],
  [ShoppingBag, '38', 'New orders'],
  [Package, '142', 'SKUs tracked'],
]

export default function AdminLoginPage({ loading, onLogin, onSwitchToStore }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await onLogin(email, password)
    } catch (nextError) {
      setError(nextError.message)
    }
  }

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#f7f8f5] p-4 sm:p-6 lg:grid lg:place-items-center lg:p-10">
      <div className="absolute -left-24 top-1/3 -z-10 size-80 rounded-full bg-[#aacfb3]/35 blur-3xl" />
      <div className="absolute -right-20 top-0 -z-10 size-80 rounded-full bg-[#ff5c35]/8 blur-3xl" />
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[34px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.14)] lg:grid-cols-[1.1fr_.9fr]">
        <section className="relative hidden min-h-[690px] overflow-hidden bg-[#17251c] p-9 text-white lg:flex lg:flex-col lg:justify-between">
          <img
            src="/admin-login-hero.png"
            alt="Modern electronics workspace"
            className="absolute inset-0 size-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#17251c]/80 via-[#17251c]/70 to-[#397a4a]/75" />
          <div className="relative flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#ff5c35] shadow-lg">
              <Zap size={19} fill="currentColor" />
            </span>
            <div>
              <p className="text-sm font-extrabold">Pride Electronics</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9bcaa6]">
                Operations Console
              </p>
            </div>
          </div>
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#b9e2c2] backdrop-blur">
              <ShieldCheck size={13} /> Secure admin access
            </span>
            <h1 className="mt-5 max-w-lg text-5xl font-extrabold leading-[1.05] tracking-[-0.055em]">
              Command your store with confidence.
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/55">
              Products, customers, fulfillment, and performance—all organized in
              one focused workspace.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {stats.map(([Icon, value, label]) => (
                <div
                  key={label}
                  className="rounded-[20px] border border-white/10 bg-white/8 p-4 backdrop-blur"
                >
                  <Icon size={16} className="text-[#9bcaa6]" />
                  <strong className="mt-3 block text-lg">{value}</strong>
                  <span className="mt-1 block text-[8px] font-bold uppercase tracking-wider text-white/40">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="flex min-h-[650px] items-center p-5 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <button
              type="button"
              onClick={onSwitchToStore}
              className="mb-8 flex items-center gap-2 text-[10px] font-extrabold text-slate-500 transition hover:text-[#397a4a]"
            >
              <ArrowLeft size={14} /> Back to storefront
            </button>
            <span className="grid size-12 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]">
              <Sparkles size={20} />
            </span>
            <p className="mt-6 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">
              Welcome back
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-slate-950">
              Admin sign in
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Enter your credentials to access the Pride management console.
            </p>
            <div className="mt-6 rounded-[20px] border border-dashed border-[#9bcaa6] bg-[#f2f8f3] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[8px] font-extrabold uppercase tracking-wider text-[#397a4a]">
                    Demo credentials
                  </p>
                  <p className="mt-2 text-[10px] font-bold text-slate-600">
                    {demoAdmin.email} · {demoAdmin.password}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(demoAdmin.email)
                    setPassword(demoAdmin.password)
                    setError('')
                  }}
                  className="rounded-full bg-[#397a4a] px-3 py-2 text-[9px] font-extrabold text-white"
                >
                  Auto fill
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-[10px] font-bold leading-5 text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-[10px] font-extrabold text-slate-600">
                  Email address
                </span>
                <span className="relative block">
                  <Mail
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@pride.com"
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-[#fafbfa] pl-11 pr-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10"
                  />
                </span>
              </label>
              <label className="block">
                <span className="mb-2 block text-[10px] font-extrabold text-slate-600">
                  Password
                </span>
                <span className="relative block">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="h-13 w-full rounded-2xl border border-slate-200 bg-[#fafbfa] pl-11 pr-12 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-slate-400"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </span>
              </label>
              <button
                type="submit"
                disabled={loading}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[#17251c] text-xs font-extrabold text-white shadow-lg transition hover:bg-[#397a4a] disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? (
                  <span className="size-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                ) : (
                  <>
                    Sign in securely <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}
