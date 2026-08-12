import { Cpu, ShoppingBag, User, CheckCircle2, MapPin } from 'lucide-react'
import ProfileDropdown from './ProfileDropdown'

export default function TopBar({
  isLoggedIn,
  user,
  notice,
  onAuthClick,
  onLogout,
  onSelectSection,
  cartCount = 0,
  wishlistCount = 0,
  couponsCount = 2,
  onCartClick,
  currentView,
  onGoHome,
  savedAddresses = []
}) {
  // Find the default/selected delivery address
  const defaultAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0] || null

  return (
    <>
      <header className="topbar-header glass-panel">
        <button className="brand-logo" onClick={onGoHome} title="Go to Homepage">
          <div className="brand-icon-wrapper">
            <Cpu size={24} />
          </div>
          <div>
            <span className="brand-title">
              PRIDE <span>ELECTRONICS</span>
            </span>
            <span className="brand-subtitle">Next-Gen Hardware &amp; Tech</span>
          </div>
        </button>

        <div className="topbar-actions">
          {/* Selected delivery address — shown to the left of Cart when logged in */}
          {isLoggedIn && (
            <button
              className="topbar-address-chip"
              onClick={() => onSelectSection && onSelectSection('saved-addresses')}
              title="Change delivery address"
            >
              <MapPin size={13} className="topbar-address-icon" />
              <div className="topbar-address-text">
                {defaultAddress ? (
                  <>
                    <span className="topbar-address-label">Deliver to {defaultAddress.label}</span>
                    <span className="topbar-address-line">
                      {defaultAddress.city || defaultAddress.street}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="topbar-address-label">Select address</span>
                    <span className="topbar-address-line">No address saved</span>
                  </>
                )}
              </div>
            </button>
          )}

          {/* Cart button — only visible when logged in */}
          {isLoggedIn && (
            <button className="icon-btn" onClick={onCartClick} title="Open Shopping Cart">
              <ShoppingBag size={18} />
              <span>Cart</span>
              {cartCount > 0 && <span className="badge-count">{cartCount}</span>}
            </button>
          )}

          {isLoggedIn ? (
            <ProfileDropdown
              user={user}
              wishlistCount={wishlistCount}
              cartCount={cartCount}
              couponsCount={couponsCount}
              onSelectSection={onSelectSection}
              onLogout={onLogout}
            />
          ) : (
            <button className="icon-btn primary" onClick={onAuthClick}>
              <User size={18} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {notice && (
        <div className="notice-toast">
          <CheckCircle2 size={20} color="var(--blue)" />
          <span>{notice}</span>
        </div>
      )}
    </>
  )
}
