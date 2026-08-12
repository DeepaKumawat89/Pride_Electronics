import { useState } from 'react'
import {
  Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff,
  Zap, BarChart3, Package, ShoppingCart, Shield
} from 'lucide-react'

const STATS = [
  { icon: <BarChart3 size={16} />, label: 'Revenue Today', value: '₹2.4L' },
  { icon: <ShoppingCart size={16} />, label: 'New Orders',  value: '38'   },
  { icon: <Package size={16} />,      label: 'SKUs Tracked', value: '142' },
]

export default function AdminLogin({ onLoginSuccess, onSwitchToStore }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading]   = useState(false)

  const DEFAULT_EMAIL = 'admin@pride.com'
  const DEFAULT_PASS  = 'admin123'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    if (email.trim() === DEFAULT_EMAIL && password.trim() === DEFAULT_PASS) {
      setErrorMsg('')
      onLoginSuccess()
    } else {
      setErrorMsg('Wrong credentials. Try admin@pride.com / admin123')
    }
    setLoading(false)
  }

  return (
    <div className="apl-backdrop">
      <div className="apl-page">

        {/* ── Left: Photo + Overlay ── */}
        <div className="apl-visual">
          <img
            src="/admin-login-hero.png"
            alt="Pride Electronics Tech"
            className="apl-visual-img"
          />
          <div className="apl-scrim-bottom" />
          <div className="apl-scrim-right" />

          <div className="apl-brand">
            <span className="apl-brand-dot" />
            <span className="apl-brand-name">Pride<strong>Electronics</strong></span>
          </div>

          <div className="apl-headline">
            <p className="apl-headline-tag">
              <Shield size={13} />&nbsp;Secure Admin Portal
            </p>
            <h2 className="apl-headline-h2">
              Command your<br />
              <span>store in real-time.</span>
            </h2>
            <div className="apl-stat-row">
              {STATS.map(s => (
                <div key={s.label} className="apl-stat-chip">
                  {s.icon}
                  <span className="apl-stat-val">{s.value}</span>
                  <span className="apl-stat-lbl">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: Form ── */}
        <div className="apl-form-side">
          <div className="apl-form-inner">

            <div className="apl-form-logo">
              <Zap size={22} />
            </div>

            <h1 className="apl-form-title">Admin Sign In</h1>
            <p className="apl-form-sub">
              Access the control centre to manage inventory, orders &amp; analytics.
            </p>

            {/* demo hint */}
            <div className="apl-hint">
              <span className="apl-hint-label">Default Credentials</span>
              <code>{DEFAULT_EMAIL}</code>
              <code>{DEFAULT_PASS}</code>
              <button
                type="button"
                className="apl-hint-fill"
                onClick={() => { setEmail(DEFAULT_EMAIL); setPassword(DEFAULT_PASS); setErrorMsg('') }}
              >
                Fill →
              </button>
            </div>

            {errorMsg && (
              <div className="apl-error">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="apl-form">
              {/* email */}
              <div className="apl-field">
                <label className="apl-label">Email Address</label>
                <div className="apl-input-wrap">
                  <Mail size={17} className="apl-input-icon" />
                  <input
                    type="email"
                    required
                    placeholder="admin@pride.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="apl-input"
                  />
                </div>
              </div>

              {/* password */}
              <div className="apl-field">
                <label className="apl-label">Password</label>
                <div className="apl-input-wrap">
                  <Lock size={17} className="apl-input-icon" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="apl-input"
                    style={{ paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    className="apl-eye-btn"
                    onClick={() => setShowPass(v => !v)}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* submit */}
              <button type="submit" disabled={loading} className="apl-submit">
                {loading
                  ? <span className="apl-spinner" />
                  : <>Sign In &nbsp;<ArrowRight size={18} /></>
                }
              </button>
            </form>

            <div className="apl-divider" />

            <button
              type="button"
              className="apl-back-link"
              onClick={onSwitchToStore}
            >
              ← Back to Customer Storefront
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
