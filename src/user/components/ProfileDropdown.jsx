import { useState, useRef, useEffect } from 'react'
import {
  User,
  Heart,
  ShoppingBag,
  Package,
  CreditCard,
  Wallet,
  MapPin,
  Ticket,
  LogOut,
  ChevronDown,
  Sparkles
} from 'lucide-react'

export default function ProfileDropdown({
  user,
  wishlistCount = 0,
  cartCount = 0,
  couponsCount = 2,
  onSelectSection,
  onLogout
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const userName = user?.name || 'Alex Vance'
  const userEmail = user?.email || 'alex.vance@tech.com'
  const userInitial = (userName.trim()[0] || 'A').toUpperCase()
  const walletBalance = user?.walletBalance !== undefined ? user.walletBalance : 2450.00

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const handleItemClick = (sectionId) => {
    setIsOpen(false)
    if (sectionId === 'logout') {
      onLogout()
    } else {
      onSelectSection(sectionId)
    }
  }

  return (
    <div className="profile-dropdown-container" ref={dropdownRef}>
      {/* Profile Trigger Button */}
      <button
        className={`profile-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Open User Profile Menu"
      >
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-initial">{userInitial}</div>
          <div className="profile-avatar-icon-badge">
            <User size={10} color="#ffffff" />
          </div>
        </div>

        <div className="profile-btn-info">
          <span className="profile-btn-name">{userName.split(' ')[0]}</span>
        </div>

        <ChevronDown size={14} className={`profile-btn-arrow ${isOpen ? 'rotated' : ''}`} />
      </button>

      {/* Dropdown Popup Menu */}
      {isOpen && (
        <div className="profile-dropdown-menu glass-panel animate-fadeIn">
          {/* Header Card */}
          <div className="profile-menu-header">
            <div className="profile-menu-avatar">
              <span>{userInitial}</span>
            </div>
            <div className="profile-menu-user-details">
              <div className="profile-menu-name-row">
                <span className="profile-menu-fullname">{userName}</span>
              </div>
              <span className="profile-menu-email">{userEmail}</span>
            </div>
          </div>

          <div className="profile-menu-divider" />

          {/* Menu Items List */}
          <div className="profile-menu-items">
            <button
              className="profile-menu-item"
              onClick={() => handleItemClick('profile')}
            >
              <div className="item-icon-box">
                <User size={16} />
              </div>
              <span className="item-label">My Profile</span>
            </button>

            <button
              className="profile-menu-item"
              onClick={() => handleItemClick('wishlist')}
            >
              <div className="item-icon-box">
                <Heart size={16} />
              </div>
              <span className="item-label">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="item-badge counter">{wishlistCount}</span>
              )}
            </button>

            <button
              className="profile-menu-item"
              onClick={() => handleItemClick('cart')}
            >
              <div className="item-icon-box">
                <ShoppingBag size={16} />
              </div>
              <span className="item-label">Cart</span>
              {cartCount > 0 && (
                <span className="item-badge counter">{cartCount}</span>
              )}
            </button>

            <button
              className="profile-menu-item"
              onClick={() => handleItemClick('orders')}
            >
              <div className="item-icon-box">
                <Package size={16} />
              </div>
              <span className="item-label">Orders</span>
            </button>

            <button
              className="profile-menu-item"
              onClick={() => handleItemClick('saved-cards')}
            >
              <div className="item-icon-box">
                <CreditCard size={16} />
              </div>
              <span className="item-label">Saved Cards</span>
            </button>

            <button
              className="profile-menu-item"
              onClick={() => handleItemClick('wallet')}
            >
              <div className="item-icon-box">
                <Wallet size={16} />
              </div>
              <span className="item-label">Wallet</span>
              <span className="item-badge wallet-tag">₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </button>

            <button
              className="profile-menu-item"
              onClick={() => handleItemClick('saved-addresses')}
            >
              <div className="item-icon-box">
                <MapPin size={16} />
              </div>
              <span className="item-label">Saved Addresses</span>
            </button>

            <button
              className="profile-menu-item"
              onClick={() => handleItemClick('coupons')}
            >
              <div className="item-icon-box">
                <Ticket size={16} />
              </div>
              <span className="item-label">Coupons</span>
              {couponsCount > 0 && (
                <span className="item-badge coupon-tag">
                  <Sparkles size={10} style={{ marginRight: '3px' }} />
                  {couponsCount} Active
                </span>
              )}
            </button>

            <div className="profile-menu-divider logout-divider" />

            <button
              className="profile-menu-item logout-item"
              onClick={() => handleItemClick('logout')}
            >
              <div className="item-icon-box logout-icon">
                <LogOut size={16} />
              </div>
              <span className="item-label">Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
