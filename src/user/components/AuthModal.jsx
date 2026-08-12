import { X, User, Mail, Lock, Sparkles, ArrowRight, ShieldCheck, Zap, Package } from 'lucide-react'

export default function AuthModal({
  mode,
  setMode,
  selectedProduct,
  fullName,
  setFullName,
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  onClose
}) {
  return (
    <div className="modal-backdrop auth-modal-backdrop" onClick={onClose}>
      <div className="auth-horizontal-card glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} style={{ zIndex: 10 }}>
          <X size={20} />
        </button>

        {/* Left Side: Visual Hero Photo & Scrim */}
        <div className="auth-visual-side">
          <img
            src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1000&q=80"
            alt="Pride Hardware Tech"
            className="auth-visual-img"
          />
          <div className="auth-scrim-bottom" />

          <div className="auth-brand-watermark">
            <div className="auth-brand-dot" />
            <span className="auth-brand-name">
              PRIDE <strong>ELECTRONICS</strong>
            </span>
          </div>

          <div className="auth-headline-box">
            <div className="auth-tag">
              <Sparkles size={13} />
              <span>Next-Gen Hardware Hub</span>
            </div>
            <h2 className="auth-headline-title">
              Elevate Your <span>Tech Ecosystem</span>
            </h2>
            <p className="auth-headline-desc">
              Join thousands of engineers, builders, and enthusiasts building tomorrow’s hardware.
            </p>

            <div className="auth-features-list">
              <div className="auth-feature-chip">
                <Zap size={14} color="#34d399" />
                <span>Exclusive Member Discounts</span>
              </div>
              <div className="auth-feature-chip">
                <Package size={14} color="#34d399" />
                <span>Real-Time Order Telemetry</span>
              </div>
              <div className="auth-feature-chip">
                <ShieldCheck size={14} color="#34d399" />
                <span>Priority Technical Support</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form & Controls */}
        <div className="auth-form-side">
          <div className="auth-form-header">
            <div className="auth-badge-chip">
              <Sparkles size={12} />
              <span>Pride Tech Account</span>
            </div>

            <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p>
              {selectedProduct
                ? `Sign in to add "${selectedProduct}" to your cart.`
                : 'Access exclusive component pricing, order tracking & priority support.'}
            </p>
          </div>

          <div className="auth-tabs-horizontal">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Sign In
            </button>

            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={onSubmit} className="auth-form-fields">
            {/* Animated Fixed-Slot Container for Full Name */}
            <div
              className="auth-fullname-slot"
              style={{
                height: mode === 'register' ? '68px' : '0px',
                opacity: mode === 'register' ? 1 : 0,
                overflow: 'hidden',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                marginBottom: mode === 'register' ? '0px' : '0px',
                pointerEvents: mode === 'register' ? 'auto' : 'none'
              }}
            >
              <div className="form-group">
                <label>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-dim)'
                    }}
                  />
                  <input
                    type="text"
                    required={mode === 'register'}
                    placeholder="Alex Mercer"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ paddingLeft: '40px', width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-dim)'
                  }}
                />
                <input
                  type="email"
                  required
                  placeholder="alex@techdev.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px', width: '100%' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-dim)'
                  }}
                />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '40px', width: '100%' }}
                />
              </div>
            </div>

            <button className="icon-btn primary btn-large" type="submit" style={{ marginTop: '4px', justifyContent: 'center' }}>
              <span>{mode === 'login' ? 'Sign In to Account' : 'Register Now'}</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
