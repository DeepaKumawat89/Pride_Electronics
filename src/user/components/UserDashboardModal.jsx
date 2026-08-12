import { useState, useEffect } from 'react'
import {
  X,
  User,
  Heart,
  Package,
  CreditCard,
  Wallet,
  MapPin,
  Ticket,
  Check,
  Copy,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  Clock,
  CheckCircle2,
  Truck,
  Building,
  Home,
  PlusCircle,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Download,
  AlertCircle,
  RotateCcw,
  FileText,
  ExternalLink,
  ChevronRight,
  ArrowLeft
} from 'lucide-react'

export default function UserDashboardModal({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  user,
  onUpdateUser,
  products = [],
  wishlist = [],
  onToggleWishlist,
  onAddToCart,
  orders = [],
  savedCards = [],
  onAddCard,
  onRemoveCard,
  onSetDefaultCard,
  walletBalance = 2450.0,
  onAddWalletFunds,
  transactions = [],
  savedAddresses = [],
  onAddAddress,
  onRemoveAddress,
  onSetDefaultAddress,
  coupons = [],
  showNotification
}) {
  if (!isOpen) return null

  // Tab State
  const tabList = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, badge: wishlist.length },
    { id: 'orders', label: 'My Orders', icon: Package, badge: orders.length },
    { id: 'saved-cards', label: 'Saved Cards', icon: CreditCard, badge: savedCards.length },
    { id: 'wallet', label: 'Wallet', icon: Wallet, tag: `₹${walletBalance.toFixed(0)}` },
    { id: 'saved-addresses', label: 'Addresses', icon: MapPin, badge: savedAddresses.length },
    { id: 'coupons', label: 'Coupons', icon: Ticket, badge: coupons.length }
  ]

  // Local Form States
  // Profile Form
  const [profileName, setProfileName] = useState(user?.name || 'Alex Vance')
  const [profileEmail, setProfileEmail] = useState(user?.email || 'alex.vance@tech.com')
  const [profilePhone, setProfilePhone] = useState(user?.phone || '+91 98765 43210')
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Wishlist States (Search & Filter)
  const [wishlistSearch, setWishlistSearch] = useState('')
  const [wishlistSort, setWishlistSort] = useState('default') // 'default' | 'price-low' | 'price-high'

  // Orders States (Search, Filter, Date Range & Order Details)
  const [ordersListState, setOrdersListState] = useState(orders)
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('All')
  const [orderTimeFilter, setOrderTimeFilter] = useState('All')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null)

  // Keep local order state synchronized with props
  useEffect(() => {
    setOrdersListState(orders)
  }, [orders])

  // Add Card Form State
  const [showAddCard, setShowAddCard] = useState(false)
  const [cardHolder, setCardHolder] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cardType, setCardType] = useState('Visa')

  // Add Funds Form State
  const [showAddFunds, setShowAddFunds] = useState(false)
  const [fundsAmount, setFundsAmount] = useState('1000')

  // Add Address Form State
  const [showAddAddress, setShowAddAddress] = useState(false)
  const [addrLabel, setAddrLabel] = useState('Home')
  const [addrName, setAddrName] = useState(user?.name || 'Alex Vance')
  const [addrStreet, setAddrStreet] = useState('')
  const [addrCity, setAddrCity] = useState('')
  const [addrPincode, setAddrPincode] = useState('')
  const [addrPhone, setAddrPhone] = useState('+91 98765 43210')

  // Copy Coupon Code Toast State
  const [copiedCode, setCopiedCode] = useState('')

  const handleCopyCoupon = (code) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    if (showNotification) showNotification(`Coupon code "${code}" copied to clipboard!`)
    setTimeout(() => setCopiedCode(''), 2500)
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    if (onUpdateUser) {
      onUpdateUser({
        ...user,
        name: profileName,
        email: profileEmail,
        phone: profilePhone
      })
    }
    setIsEditingProfile(false)
    if (showNotification) showNotification('Profile details updated successfully!')
  }

  const handleCreateCard = (e) => {
    e.preventDefault()
    if (!cardNumber || !cardHolder || !expiry) return
    const newCard = {
      id: `CARD-${Date.now()}`,
      holder: cardHolder,
      number: cardNumber.slice(-4) ? `•••• •••• •••• ${cardNumber.slice(-4)}` : '•••• 8821',
      expiry: expiry,
      type: cardType,
      isDefault: savedCards.length === 0
    }
    onAddCard(newCard)
    setShowAddCard(false)
    setCardHolder('')
    setCardNumber('')
    setExpiry('')
    if (showNotification) showNotification(`Added ${cardType} card ending in ${cardNumber.slice(-4)}.`)
  }

  const handleAddFundsSubmit = (e) => {
    e.preventDefault()
    const amt = parseFloat(fundsAmount)
    if (isNaN(amt) || amt <= 0) return
    onAddWalletFunds(amt)
    setShowAddFunds(false)
    if (showNotification) showNotification(`Successfully added ₹${amt.toLocaleString('en-IN')} to Pride Wallet!`)
  }

  const handleCreateAddress = (e) => {
    e.preventDefault()
    if (!addrStreet || !addrCity || !addrPincode) return
    const newAddr = {
      id: `ADDR-${Date.now()}`,
      label: addrLabel,
      name: addrName,
      street: addrStreet,
      city: addrCity,
      pincode: addrPincode,
      phone: addrPhone,
      isDefault: savedAddresses.length === 0
    }
    onAddAddress(newAddr)
    setShowAddAddress(false)
    setAddrStreet('')
    setAddrCity('')
    setAddrPincode('')
    if (showNotification) showNotification(`Added new ${addrLabel} delivery address.`)
  }

  // --- WISHLIST FILTERING & SORTING ---
  const wishlistProducts = products.filter((p) => wishlist.includes(p.id))

  const filteredWishlist = wishlistProducts
    .filter((p) => {
      if (!wishlistSearch.trim()) return true
      const q = wishlistSearch.toLowerCase().trim()
      const nameMatch = p.name?.toLowerCase().includes(q)
      const catMatch = p.category?.toLowerCase().includes(q)
      const descMatch = p.description?.toLowerCase().includes(q)
      const idMatch = String(p.id).includes(q) || `prd-${p.id}`.includes(q)
      const priceMatch = p.price?.replace(/[^0-9.]/g, '').includes(q)
      return nameMatch || catMatch || descMatch || idMatch || priceMatch
    })
    .sort((a, b) => {
      const pA = Number(a.price?.replace(/[^0-9.]/g, '') || 0)
      const pB = Number(b.price?.replace(/[^0-9.]/g, '') || 0)
      if (wishlistSort === 'price-low') return pA - pB
      if (wishlistSort === 'price-high') return pB - pA
      return 0
    })

  // --- MY ORDERS DATE & TIME FILTERING HELPER ---
  const checkOrderTimeRange = (orderDateStr, filterType, start, end) => {
    if (filterType === 'All') return true
    if (!orderDateStr) return true

    // Parse order date (format: YYYY-MM-DD or YYYY-MM-DD HH:mm)
    const ordDate = new Date(orderDateStr.replace(' ', 'T'))
    if (isNaN(ordDate.getTime())) return true

    const refDate = new Date('2026-08-10T14:56:33+05:30')
    const startOfToday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate())

    if (filterType === 'Today') {
      return ordDate >= startOfToday
    }

    if (filterType === 'Last 7 Days') {
      const d = new Date(startOfToday)
      d.setDate(d.getDate() - 7)
      return ordDate >= d
    }

    if (filterType === 'Last 30 Days') {
      const d = new Date(startOfToday)
      d.setDate(d.getDate() - 30)
      return ordDate >= d
    }

    if (filterType === 'Last 3 Months') {
      const d = new Date(startOfToday)
      d.setMonth(d.getMonth() - 3)
      return ordDate >= d
    }

    if (filterType === 'Last 6 Months') {
      const d = new Date(startOfToday)
      d.setMonth(d.getMonth() - 6)
      return ordDate >= d
    }

    if (filterType === 'This Year') {
      return ordDate.getFullYear() === refDate.getFullYear()
    }

    if (filterType === 'Custom') {
      if (start) {
        const sDate = new Date(start + 'T00:00:00')
        if (ordDate < sDate) return false
      }
      if (end) {
        const eDate = new Date(end + 'T23:59:59')
        if (ordDate > eDate) return false
      }
      return true
    }

    return true
  }

  // --- MY ORDERS FILTERING ---
  const filteredOrders = ordersListState.filter((ord) => {
    // Status Filter
    if (orderStatusFilter !== 'All') {
      const currentStatus = (ord.status || 'Processing').toLowerCase()
      const targetStatus = orderStatusFilter.toLowerCase()
      if (currentStatus !== targetStatus) return false
    }

    // Time/Date Filter
    if (!checkOrderTimeRange(ord.date, orderTimeFilter, customStartDate, customEndDate)) {
      return false
    }

    // Text & Numeric Search Filter (Product Name, Order ID, Product ID/SKU, Price, Payment Method)
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase().trim()
      const idMatch = ord.id?.toLowerCase().includes(q)
      const statusMatch = ord.status?.toLowerCase().includes(q)
      const totalMatch = ord.total?.toLowerCase().includes(q)
      const dateMatch = ord.date?.toLowerCase().includes(q)
      const paymentMatch = ord.paymentMethod?.toLowerCase().includes(q)
      const carrierMatch = ord.carrier?.toLowerCase().includes(q)
      const trackingMatch = ord.trackingId?.toLowerCase().includes(q)

      const itemsMatch = ord.items?.some(
        (item) =>
          item.productName?.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q) ||
          String(item.productId || '').includes(q) ||
          item.price?.toLowerCase().includes(q)
      )

      return (
        idMatch ||
        statusMatch ||
        totalMatch ||
        dateMatch ||
        paymentMatch ||
        carrierMatch ||
        trackingMatch ||
        itemsMatch
      )
    }

    return true
  })

  // Order Actions Handlers
  const handleCancelOrder = (orderId) => {
    setOrdersListState((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'Cancelled', paymentStatus: 'Refunded' }
          : o
      )
    )
    if (selectedOrderDetails?.id === orderId) {
      setSelectedOrderDetails((prev) => ({
        ...prev,
        status: 'Cancelled',
        paymentStatus: 'Refunded'
      }))
    }
    if (showNotification)
      showNotification(`Order ${orderId} has been cancelled. Refund credited to your Pride Wallet.`)
  }

  const handleReturnOrder = (orderId) => {
    setOrdersListState((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: 'Returned', paymentStatus: 'Refunded' }
          : o
      )
    )
    if (selectedOrderDetails?.id === orderId) {
      setSelectedOrderDetails((prev) => ({
        ...prev,
        status: 'Returned',
        paymentStatus: 'Refunded'
      }))
    }
    if (showNotification)
      showNotification(`Return request initiated for Order ${orderId}. Courier pickup scheduled.`)
  }

  const handleBuyAgain = (ord) => {
    if (ord.items && ord.items.length > 0) {
      ord.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId || p.name === item.productName)
        if (prod) {
          onAddToCart(prod)
        } else {
          onAddToCart({
            id: item.productId || Date.now(),
            name: item.productName,
            price: item.price,
            image: item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80',
            category: 'Electronics'
          })
        }
      })
      if (showNotification) showNotification(`Items from order ${ord.id} added back to your cart!`)
    }
  }

  const handleDownloadInvoice = (orderId) => {
    if (showNotification) showNotification(`Invoice ${orderId}_Invoice.pdf generated and downloaded!`)
  }

  const resetOrderFilters = () => {
    setOrderSearch('')
    setOrderStatusFilter('All')
    setOrderTimeFilter('All')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  return (
    <div className="modal-backdrop user-dashboard-backdrop" onClick={onClose}>
      <div className="user-dashboard-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="dashboard-close-btn" onClick={onClose} title="Close Profile Portal">
          <X size={20} />
        </button>

        {/* Sidebar Nav */}
        <aside className="dashboard-sidebar">
          <div className="dashboard-user-card">
            <div className="dashboard-avatar">
              {(profileName.trim()[0] || 'A').toUpperCase()}
            </div>
            <div className="dashboard-user-meta">
              <h3>{profileName}</h3>
              <p>{profileEmail}</p>
            </div>
          </div>

          <nav className="dashboard-nav">
            {tabList.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  className={`dashboard-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setSelectedOrderDetails(null)
                  }}
                >
                  <Icon size={18} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="dash-nav-badge">{tab.badge}</span>
                  )}
                  {tab.tag && (
                    <span className="dash-nav-tag">{tab.tag}</span>
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="dashboard-content">
          {/* TAB 1: MY PROFILE */}
          {activeTab === 'profile' && (
            <div className="dash-tab-pane animate-fadeIn">
              <div className="dash-pane-header">
                <div>
                  <h2>My Account Profile</h2>
                  <p>Manage your account settings, contact information, and personal preferences.</p>
                </div>
                {!isEditingProfile && (
                  <button className="icon-btn secondary" onClick={() => setIsEditingProfile(true)}>
                    <Edit2 size={16} />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>

              <div className="profile-stats-row">
                <div className="stat-card">
                  <div className="stat-icon blue"><Package size={20} /></div>
                  <div className="stat-details">
                    <span className="stat-value">{ordersListState.length}</span>
                    <span className="stat-label">Total Orders</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon amber"><Wallet size={20} /></div>
                  <div className="stat-details">
                    <span className="stat-value">₹{walletBalance.toFixed(2)}</span>
                    <span className="stat-label">Wallet Balance</span>
                  </div>
                </div>
                {/* Default Delivery Address — replaces wishlist stat */}
                {(() => {
                  const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0]
                  return (
                    <div
                      className="stat-card stat-card-address"
                      onClick={() => setActiveTab('saved-addresses')}
                      title="Go to Saved Addresses"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="stat-icon emerald"><MapPin size={20} /></div>
                      <div className="stat-details">
                        {defaultAddr ? (
                          <>
                            <span className="stat-value stat-addr-label">{defaultAddr.label || 'Home'}</span>
                            <span className="stat-label stat-addr-line">
                              {defaultAddr.street}, {defaultAddr.city} – {defaultAddr.pincode}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="stat-value stat-addr-label" style={{ fontSize: '0.82rem' }}>No Address</span>
                            <span className="stat-label" style={{ color: 'var(--blue)' }}>+ Add delivery address</span>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>


              <form onSubmit={handleSaveProfile} className="profile-info-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    disabled={!isEditingProfile}
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    disabled={!isEditingProfile}
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                  />
                </div>

                {isEditingProfile && (
                  <div className="profile-actions-bar">
                    <button type="button" className="icon-btn secondary" onClick={() => setIsEditingProfile(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="icon-btn primary">
                      <Check size={16} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="dash-tab-pane animate-fadeIn">
              <div className="dash-pane-header">
                <div>
                  <h2>Saved Wishlist Hardware ({wishlistProducts.length})</h2>
                  <p>Keep track of components and gear you want to buy later.</p>
                </div>
              </div>

              {/* Wishlist Search & Filter Toolbar */}
              {wishlistProducts.length > 0 && (
                <div className="wishlist-filter-bar glass-panel">
                  <div className="wishlist-search-box">
                    <Search size={16} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search by product name, numeric ID or category..."
                      value={wishlistSearch}
                      onChange={(e) => setWishlistSearch(e.target.value)}
                    />
                    {wishlistSearch && (
                      <button className="clear-search-btn" onClick={() => setWishlistSearch('')}>
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="wishlist-sort-box">
                    <Filter size={15} />
                    <label>Sort By:</label>
                    <select value={wishlistSort} onChange={(e) => setWishlistSort(e.target.value)}>
                      <option value="default">Default</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                    </select>
                  </div>
                </div>
              )}

              {filteredWishlist.length > 0 ? (
                <div className="dash-wishlist-grid">
                  {filteredWishlist.map((p) => (
                    <div key={p.id} className="dash-wishlist-card glass-panel">
                      <div className="dash-wishlist-img-wrapper">
                        <img src={p.image} alt={p.name} />
                        <button
                          className="wishlist-remove-btn"
                          title="Remove from wishlist"
                          onClick={() => onToggleWishlist(p.id)}
                        >
                          <Trash2 size={16} color="#e11d48" />
                        </button>
                      </div>
                      <div className="dash-wishlist-info">
                        <div className="wishlist-cat-row">
                          <span className="dash-wishlist-cat">{p.category}</span>
                          <span className="wishlist-sku-tag">ID #{p.id}</span>
                        </div>
                        <h4>{p.name}</h4>
                        <div className="dash-wishlist-price">{p.price}</div>
                        <button
                          className="icon-btn primary btn-full"
                          style={{ marginTop: '12px', justifyContent: 'center' }}
                          onClick={() => onAddToCart(p)}
                        >
                          <ShoppingBag size={16} />
                          <span>Move to Cart</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : wishlistProducts.length > 0 ? (
                <div className="empty-pane-box">
                  <Search size={44} className="text-dim" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                  <h3>No Wishlist Matching Results</h3>
                  <p>No products found matching "{wishlistSearch}". Try adjusting your search query.</p>
                  <button className="icon-btn secondary" style={{ marginTop: '14px' }} onClick={() => setWishlistSearch('')}>
                    <RefreshCw size={14} />
                    <span>Clear Wishlist Search</span>
                  </button>
                </div>
              ) : (
                <div className="empty-pane-box">
                  <Heart size={48} className="text-dim" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                  <h3>Your Wishlist is Empty</h3>
                  <p>Explore our catalog and click the heart icon to save products for later.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div className="dash-tab-pane animate-fadeIn">
              {/* IF AN ORDER DETAILS IS OPEN, RENDER DETAILED ORDER VIEW */}
              {selectedOrderDetails ? (
                <div className="order-details-view animate-fadeIn">
                  <div className="order-details-topbar">
                    <button className="icon-btn secondary btn-sm" onClick={() => setSelectedOrderDetails(null)}>
                      <ArrowLeft size={16} />
                      <span>Back to Orders List</span>
                    </button>
                    <div className="order-details-title-group">
                      <h2>Order {selectedOrderDetails.id}</h2>
                      <span className={`order-status-badge ${selectedOrderDetails.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                        {selectedOrderDetails.status === 'Delivered' ? (
                          <CheckCircle2 size={14} />
                        ) : selectedOrderDetails.status === 'Cancelled' ? (
                          <AlertCircle size={14} />
                        ) : (
                          <Truck size={14} />
                        )}
                        <span>{selectedOrderDetails.status || 'Processing'}</span>
                      </span>
                    </div>
                  </div>

                  {/* Order Status Tracking Timeline */}
                  <div className="order-tracking-card glass-panel">
                    <h3>Order Status Tracking</h3>
                    <p className="tracking-subhead">
                      Placed on {selectedOrderDetails.date} • Estimated Delivery: <strong>{selectedOrderDetails.estimatedDelivery || '3-5 Business Days'}</strong>
                    </p>

                    {['Cancelled', 'Returned', 'Refunded'].includes(selectedOrderDetails.status) ? (
                      <div className={`status-banner ${selectedOrderDetails.status.toLowerCase()}`}>
                        <AlertCircle size={18} />
                        <div>
                          <strong>Order Status: {selectedOrderDetails.status}</strong>
                          <p>This order has been {selectedOrderDetails.status.toLowerCase()}. Amount has been credited to your Pride Pay Wallet.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="order-timeline-stepper">
                        {[
                          { label: 'Order Placed', stepStatus: 'complete' },
                          { label: 'Confirmed', stepStatus: ['Confirmed', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'].includes(selectedOrderDetails.status) ? 'complete' : 'pending' },
                          { label: 'Processing', stepStatus: ['Processing', 'Shipped', 'Out for Delivery', 'Delivered'].includes(selectedOrderDetails.status) ? 'complete' : 'pending' },
                          { label: 'Shipped', stepStatus: ['Shipped', 'Out for Delivery', 'Delivered'].includes(selectedOrderDetails.status) ? 'complete' : 'pending' },
                          { label: 'Out for Delivery', stepStatus: ['Out for Delivery', 'Delivered'].includes(selectedOrderDetails.status) ? (selectedOrderDetails.status === 'Out for Delivery' ? 'active' : 'complete') : 'pending' },
                          { label: 'Delivered', stepStatus: selectedOrderDetails.status === 'Delivered' ? 'complete' : 'pending' }
                        ].map((step, idx) => (
                          <div key={idx} className={`timeline-step ${step.stepStatus}`}>
                            <div className="step-node">
                              {step.stepStatus === 'complete' ? <Check size={12} /> : <span>{idx + 1}</span>}
                            </div>
                            <span className="step-label">{step.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Products Items List Table */}
                  <div className="order-details-section glass-panel">
                    <h3>Ordered Items ({selectedOrderDetails.items?.length || 1})</h3>
                    <div className="order-items-table">
                      {selectedOrderDetails.items && selectedOrderDetails.items.length > 0 ? (
                        selectedOrderDetails.items.map((item, idx) => (
                          <div key={idx} className="order-details-item-row">
                            <img
                              src={item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=80'}
                              alt={item.productName}
                              className="item-thumb"
                            />
                            <div className="item-details-main">
                              <h4>{item.productName}</h4>
                              <span className="item-sku">SKU / Product ID: {item.sku || `PRD-${item.productId || '101'}`}</span>
                            </div>
                            <div className="item-qty-col">
                              <span className="col-label">Qty</span>
                              <strong>x{item.qty || 1}</strong>
                            </div>
                            <div className="item-price-col">
                              <span className="col-label">Price</span>
                              <span>{item.price}</span>
                            </div>
                            <div className="item-subtotal-col">
                              <span className="col-label">Subtotal</span>
                              <strong>{item.subtotal || item.price}</strong>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="order-details-item-row">
                          <div className="item-details-main">
                            <h4>High-Performance Electronics Hardware Package</h4>
                            <span className="item-sku">SKU: PRD-BUNDLE-99</span>
                          </div>
                          <div className="item-qty-col"><strong>x1</strong></div>
                          <div className="item-subtotal-col"><strong>{selectedOrderDetails.total}</strong></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Payment, Delivery Address & Financial Breakdown */}
                  <div className="order-details-grid-2">
                    <div className="order-info-card glass-panel">
                      <h3>Delivery Address</h3>
                      <div className="address-meta-box">
                        <MapPin size={16} className="text-emerald" />
                        <div>
                          <strong>{selectedOrderDetails.address?.name || selectedOrderDetails.customer || 'Alex Vance'}</strong>
                          <p>{selectedOrderDetails.address?.street || '42 Silicon Avenue, Sector 4'}</p>
                          <p>{selectedOrderDetails.address?.city || 'Bengaluru, KA'} - {selectedOrderDetails.address?.pincode || '560100'}</p>
                          <p className="phone-line">Phone: {selectedOrderDetails.address?.phone || selectedOrderDetails.phone || '+91 98765 43210'}</p>
                        </div>
                      </div>

                      <div className="divider-line" />

                      <h3>Shipping Carrier & Tracking</h3>
                      <div className="tracking-meta-box">
                        <Truck size={16} className="text-blue" />
                        <div>
                          <p>Carrier: <strong>{selectedOrderDetails.carrier || 'BlueDart Express'}</strong></p>
                          <p>Tracking ID: <strong>{selectedOrderDetails.trackingId || 'BD-982104-IN'}</strong></p>
                        </div>
                      </div>
                    </div>

                    <div className="order-info-card glass-panel">
                      <h3>Payment & Price Summary</h3>
                      <div className="payment-meta-box">
                        <CreditCard size={16} className="text-amber" />
                        <div>
                          <p>Method: <strong>{selectedOrderDetails.paymentMethod || 'Pride Pay Digital Wallet'}</strong></p>
                          <p>Status: <span className="payment-status-tag paid">{selectedOrderDetails.paymentStatus || 'Paid'}</span></p>
                        </div>
                      </div>

                      <div className="divider-line" />

                      <div className="financial-summary-rows">
                        <div className="fin-row">
                          <span>Items Subtotal</span>
                          <span>{selectedOrderDetails.subtotal || selectedOrderDetails.total}</span>
                        </div>
                        <div className="fin-row">
                          <span>Delivery / Shipping Charges</span>
                          <span>{selectedOrderDetails.shippingCharge || '₹0.00'}</span>
                        </div>
                        {selectedOrderDetails.couponDiscount && selectedOrderDetails.couponDiscount !== '₹0.00' && (
                          <div className="fin-row discount">
                            <span>Coupon Discount Applied</span>
                            <span>-{selectedOrderDetails.couponDiscount}</span>
                          </div>
                        )}
                        <div className="fin-row">
                          <span>Estimated Tax / GST (18%)</span>
                          <span>{selectedOrderDetails.taxGST || '₹0.00'}</span>
                        </div>
                        <div className="fin-row total">
                          <span>Final Order Total</span>
                          <strong>{selectedOrderDetails.total}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status-Based Action Buttons Row */}
                  <div className="order-details-actions-footer glass-panel">
                    <h4>Available Order Actions</h4>
                    <div className="action-buttons-group">
                      <button
                        className="icon-btn secondary"
                        onClick={() => handleDownloadInvoice(selectedOrderDetails.id)}
                      >
                        <Download size={15} />
                        <span>Download Invoice</span>
                      </button>

                      {['Pending', 'Confirmed', 'Processing'].includes(selectedOrderDetails.status) && (
                        <button
                          className="icon-btn danger"
                          onClick={() => handleCancelOrder(selectedOrderDetails.id)}
                        >
                          <X size={15} />
                          <span>Cancel Order</span>
                        </button>
                      )}

                      {selectedOrderDetails.status === 'Delivered' && (
                        <>
                          <button
                            className="icon-btn warning"
                            onClick={() => handleReturnOrder(selectedOrderDetails.id)}
                          >
                            <RotateCcw size={15} />
                            <span>Return Product</span>
                          </button>
                          <button
                            className="icon-btn primary"
                            onClick={() => handleBuyAgain(selectedOrderDetails)}
                          >
                            <ShoppingBag size={15} />
                            <span>Buy Again</span>
                          </button>
                        </>
                      )}

                      {['Cancelled', 'Returned', 'Refunded'].includes(selectedOrderDetails.status) && (
                        <button
                          className="icon-btn primary"
                          onClick={() => handleBuyAgain(selectedOrderDetails)}
                        >
                          <ShoppingBag size={15} />
                          <span>Buy Again</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* ORDERS LIST VIEW WITH SEARCH & FILTERS */
                <>
                  <div className="dash-pane-header">
                    <div>
                      <h2>Order Telemetry & History</h2>
                      <p>Track live delivery status, filter order history, view detailed invoices, and manage returns.</p>
                    </div>
                  </div>

                  {/* My Orders Search & Multi-Filter Toolbar */}
                  <div className="order-filter-bar glass-panel">
                    <div className="order-search-input">
                      <Search size={16} className="search-icon" />
                      <input
                        type="text"
                        placeholder="Search by Product Name, Order ID, SKU, or Status..."
                        value={orderSearch}
                        onChange={(e) => setOrderSearch(e.target.value)}
                      />
                      {orderSearch && (
                        <button className="clear-search-btn" onClick={() => setOrderSearch('')}>
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div className="order-filter-controls">
                      {/* Order Status Filter */}
                      <div className="filter-select-group">
                        <Filter size={14} />
                        <label>Status:</label>
                        <select
                          value={orderStatusFilter}
                          onChange={(e) => setOrderStatusFilter(e.target.value)}
                        >
                          <option value="All">All Statuses</option>
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Processing">Processing</option>
                          <option value="Shipped">Shipped</option>
                          <option value="Out for Delivery">Out for Delivery</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Returned">Returned</option>
                          <option value="Refunded">Refunded</option>
                        </select>
                      </div>

                      {/* Order Date/Time Filter */}
                      <div className="filter-select-group">
                        <Calendar size={14} />
                        <label>Time Range:</label>
                        <select
                          value={orderTimeFilter}
                          onChange={(e) => setOrderTimeFilter(e.target.value)}
                        >
                          <option value="All">All Time</option>
                          <option value="Today">Today</option>
                          <option value="Last 7 Days">Last 7 Days</option>
                          <option value="Last 30 Days">Last 30 Days</option>
                          <option value="Last 3 Months">Last 3 Months</option>
                          <option value="Last 6 Months">Last 6 Months</option>
                          <option value="This Year">This Year</option>
                          <option value="Custom">Custom Date Range</option>
                        </select>
                      </div>

                      {/* Reset Filters Button */}
                      {(orderSearch || orderStatusFilter !== 'All' || orderTimeFilter !== 'All' || customStartDate || customEndDate) && (
                        <button className="icon-btn secondary btn-sm" onClick={resetOrderFilters} title="Reset all filters">
                          <RefreshCw size={13} />
                          <span>Reset</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Custom Date Inputs Row */}
                  {orderTimeFilter === 'Custom' && (
                    <div className="custom-date-range-bar glass-panel animate-fadeIn">
                      <div className="date-input-group">
                        <label>Start Date:</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div className="date-input-group">
                        <label>End Date:</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                      {(customStartDate || customEndDate) && (
                        <button
                          className="clear-date-btn"
                          onClick={() => {
                            setCustomStartDate('')
                            setCustomEndDate('')
                          }}
                        >
                          Clear Dates
                        </button>
                      )}
                    </div>
                  )}

                  {/* Active Filter Summary Pills */}
                  <div className="filter-results-summary">
                    <span>Showing <strong>{filteredOrders.length}</strong> of <strong>{ordersListState.length}</strong> orders</span>
                  </div>

                  {filteredOrders.length > 0 ? (
                    <div className="dash-orders-list">
                      {filteredOrders.map((ord) => (
                        <div key={ord.id} className="order-telemetry-card glass-panel">
                          <div className="order-card-header">
                            <div>
                              <span className="order-id">{ord.id}</span>
                              <span className="order-date"><Clock size={12} /> Placed on {ord.date}</span>
                            </div>
                            <div className={`order-status-badge ${ord.status?.toLowerCase().replace(/\s+/g, '-')}`}>
                              {ord.status === 'Delivered' ? (
                                <CheckCircle2 size={14} />
                              ) : ord.status === 'Cancelled' ? (
                                <AlertCircle size={14} />
                              ) : (
                                <Truck size={14} />
                              )}
                              <span>{ord.status || 'Processing'}</span>
                            </div>
                          </div>

                          <div className="order-items-preview">
                            {ord.items && ord.items.length > 0 ? (
                              ord.items.map((item, idx) => (
                                <div key={idx} className="order-item-row">
                                  <div className="order-item-title-col">
                                    <span className="item-name">• {item.productName} (x{item.qty})</span>
                                    {item.sku && <span className="item-sku-sub">SKU: {item.sku}</span>}
                                  </div>
                                  <span className="item-price">{item.price}</span>
                                </div>
                              ))
                            ) : (
                              <div className="order-item-row">
                                <span className="item-name">• High-Performance Electronics Shipment</span>
                                <span className="item-price">{ord.total}</span>
                              </div>
                            )}
                          </div>

                          <div className="order-card-footer">
                            <div className="order-total-info">
                              <span>Total Paid:</span>
                              <strong>{ord.total}</strong>
                            </div>
                            <div className="order-actions">
                              <button
                                className="icon-btn primary btn-sm"
                                onClick={() => setSelectedOrderDetails(ord)}
                              >
                                <span>View & Track Order</span>
                                <ChevronRight size={14} />
                              </button>

                              <button
                                className="icon-btn secondary btn-sm"
                                onClick={() => handleDownloadInvoice(ord.id)}
                              >
                                <Download size={13} />
                                <span>Invoice</span>
                              </button>

                              {['Pending', 'Confirmed', 'Processing'].includes(ord.status) && (
                                <button
                                  className="icon-btn danger btn-sm"
                                  onClick={() => handleCancelOrder(ord.id)}
                                >
                                  <span>Cancel</span>
                                </button>
                              )}

                              {ord.status === 'Delivered' && (
                                <button
                                  className="icon-btn secondary btn-sm"
                                  onClick={() => handleBuyAgain(ord)}
                                >
                                  <ShoppingBag size={13} />
                                  <span>Reorder</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-pane-box">
                      <Package size={48} className="text-dim" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                      <h3>No Orders Found</h3>
                      <p>No orders match your specified search and filter criteria.</p>
                      <button className="icon-btn secondary" style={{ marginTop: '14px' }} onClick={resetOrderFilters}>
                        <RefreshCw size={14} />
                        <span>Clear All Filters</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* TAB 4: SAVED CARDS */}
          {activeTab === 'saved-cards' && (
            <div className="dash-tab-pane animate-fadeIn">
              <div className="dash-pane-header">
                <div>
                  <h2>Saved Payment Cards</h2>
                  <p>Manage your saved credit and debit cards for fast, seamless 1-click checkout.</p>
                </div>
                <button className="icon-btn primary" onClick={() => setShowAddCard((prev) => !prev)}>
                  <Plus size={16} />
                  <span>{showAddCard ? 'Cancel' : 'Add New Card'}</span>
                </button>
              </div>

              {showAddCard && (
                <form onSubmit={handleCreateCard} className="add-card-form glass-panel animate-fadeIn">
                  <h3><CreditCard size={18} /> Add New Credit/Debit Card</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="Alex Vance"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Card Network</label>
                      <select value={cardType} onChange={(e) => setCardType(e.target.value)}>
                        <option value="Visa">Visa</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="RuPay">RuPay</option>
                        <option value="Amex">American Express</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Card Number</label>
                      <input
                        type="text"
                        placeholder="4532 8912 3456 7890"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Expiry (MM/YY)</label>
                      <input
                        type="text"
                        placeholder="08/29"
                        maxLength={5}
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="icon-btn primary btn-full" style={{ marginTop: '12px', justifyContent: 'center' }}>
                    <Check size={16} />
                    <span>Save Card</span>
                  </button>
                </form>
              )}

              {savedCards.length > 0 ? (
                <div className="saved-cards-grid">
                  {savedCards.map((card) => (
                    <div key={card.id} className={`credit-card-chip glass-panel ${card.isDefault ? 'default' : ''}`}>
                      <div className="card-top-row">
                        <span className="card-network-tag">{card.type}</span>
                        {card.isDefault && <span className="default-badge"><Check size={12} /> Default</span>}
                      </div>
                      <div className="card-number">{card.number}</div>
                      <div className="card-bottom-row">
                        <div>
                          <span className="card-label">CARDHOLDER</span>
                          <span className="card-val">{card.holder}</span>
                        </div>
                        <div>
                          <span className="card-label">EXPIRES</span>
                          <span className="card-val">{card.expiry}</span>
                        </div>
                      </div>
                      <div className="card-actions-overlay">
                        {!card.isDefault && (
                          <button className="card-action-btn" onClick={() => onSetDefaultCard(card.id)}>
                            Set Default
                          </button>
                        )}
                        <button className="card-action-btn remove" onClick={() => onRemoveCard(card.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-pane-box">
                  <CreditCard size={48} className="text-dim" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                  <h3>No Cards Saved</h3>
                  <p>Click "Add New Card" above to save your payment methods securely.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: WALLET */}
          {activeTab === 'wallet' && (
            <div className="dash-tab-pane animate-fadeIn">
              <div className="dash-pane-header">
                <div>
                  <h2>Pride Pay Digital Wallet</h2>
                  <p>Use your instant wallet for lightning-fast checkouts and instant refund credits.</p>
                </div>
                <button className="icon-btn primary" onClick={() => setShowAddFunds((prev) => !prev)}>
                  <Plus size={16} />
                  <span>{showAddFunds ? 'Cancel' : 'Add Balance'}</span>
                </button>
              </div>

              {/* Wallet Hero Card */}
              <div className="wallet-hero-card">
                <div className="wallet-bg-glow" />
                <div className="wallet-card-header">
                  <div className="wallet-brand">
                    <Wallet size={24} color="#34d399" />
                    <span>Pride Pay Balance</span>
                  </div>
                  <span className="wallet-status-tag"><Sparkles size={12} /> Instant Cash</span>
                </div>
                <div className="wallet-balance-amount">
                  ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="wallet-subtext">Available for checkout on all hardware components and orders.</p>
              </div>

              {showAddFunds && (
                <form onSubmit={handleAddFundsSubmit} className="add-funds-form glass-panel animate-fadeIn">
                  <h3><PlusCircle size={18} /> Top-Up Pride Wallet</h3>
                  <div className="form-group">
                    <label>Enter Amount (₹)</label>
                    <input
                      type="number"
                      min="100"
                      max="100000"
                      value={fundsAmount}
                      onChange={(e) => setFundsAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="preset-amounts">
                    {['500', '1000', '2500', '5000'].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        className={`preset-btn ${fundsAmount === amt ? 'active' : ''}`}
                        onClick={() => setFundsAmount(amt)}
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>
                  <button type="submit" className="icon-btn primary btn-full" style={{ marginTop: '12px', justifyContent: 'center' }}>
                    <Check size={16} />
                    <span>Add ₹{fundsAmount} to Wallet</span>
                  </button>
                </form>
              )}

              {/* Transactions Activity Table */}
              <div className="wallet-transactions-section">
                <h3><TrendingUp size={18} /> Recent Wallet Telemetry</h3>
                <div className="transactions-list">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <div key={tx.id} className="tx-row glass-panel">
                        <div className="tx-icon-box">
                          {tx.type === 'credit' ? (
                            <ArrowDownLeft size={18} color="#10b981" />
                          ) : (
                            <ArrowUpRight size={18} color="#e11d48" />
                          )}
                        </div>
                        <div className="tx-details">
                          <span className="tx-desc">{tx.description}</span>
                          <span className="tx-date">{tx.date}</span>
                        </div>
                        <div className={`tx-amount ${tx.type}`}>
                          {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-pane-box" style={{ padding: '24px' }}>
                      <p>No wallet transactions yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SAVED ADDRESSES */}
          {activeTab === 'saved-addresses' && (
            <div className="dash-tab-pane animate-fadeIn">
              <div className="dash-pane-header">
                <div>
                  <h2>Saved Delivery Addresses</h2>
                  <p>Keep your home, workspace, and lab delivery addresses ready for fast shipping.</p>
                </div>
                <button className="icon-btn primary" onClick={() => setShowAddAddress((prev) => !prev)}>
                  <Plus size={16} />
                  <span>{showAddAddress ? 'Cancel' : 'Add New Address'}</span>
                </button>
              </div>

              {showAddAddress && (
                <form onSubmit={handleCreateAddress} className="add-address-form glass-panel animate-fadeIn">
                  <h3><MapPin size={18} /> Add New Delivery Address</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Address Tag</label>
                      <select value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)}>
                        <option value="Home">Home</option>
                        <option value="Work">Work / Office</option>
                        <option value="Lab">Tech Lab</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Contact Name</label>
                      <input
                        type="text"
                        value={addrName}
                        onChange={(e) => setAddrName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label>Street Address / Building / Flat</label>
                      <input
                        type="text"
                        placeholder="Suite 404, Silicon Towers, Tech Park Rd"
                        value={addrStreet}
                        onChange={(e) => setAddrStreet(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>City & State</label>
                      <input
                        type="text"
                        placeholder="Bengaluru, KA"
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Pincode</label>
                      <input
                        type="text"
                        placeholder="560100"
                        maxLength={6}
                        value={addrPincode}
                        onChange={(e) => setAddrPincode(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="icon-btn primary btn-full" style={{ marginTop: '12px', justifyContent: 'center' }}>
                    <Check size={16} />
                    <span>Save Address</span>
                  </button>
                </form>
              )}

              {savedAddresses.length > 0 ? (
                <div className="saved-addresses-grid">
                  {savedAddresses.map((addr) => (
                    <div key={addr.id} className={`address-card glass-panel ${addr.isDefault ? 'default' : ''}`}>
                      <div className="address-card-header">
                        <span className="address-tag">
                          {addr.label === 'Home' && <Home size={14} />}
                          {addr.label === 'Work' && <Building size={14} />}
                          {addr.label}
                        </span>
                        {addr.isDefault && <span className="default-badge"><Check size={12} /> Default Address</span>}
                      </div>

                      <div className="address-body">
                        <h4>{addr.name}</h4>
                        <p>{addr.street}</p>
                        <p>{addr.city} - {addr.pincode}</p>
                        <p className="phone-num">Phone: {addr.phone}</p>
                      </div>

                      <div className="address-actions-row">
                        {!addr.isDefault && (
                          <button className="icon-btn secondary btn-sm" onClick={() => onSetDefaultAddress(addr.id)}>
                            Set Default
                          </button>
                        )}
                        <button className="icon-btn secondary btn-sm text-rose" onClick={() => onRemoveAddress(addr.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-pane-box">
                  <MapPin size={48} className="text-dim" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                  <h3>No Addresses Saved</h3>
                  <p>Save your delivery locations to expedite checkout.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 7: COUPONS */}
          {activeTab === 'coupons' && (
            <div className="dash-tab-pane animate-fadeIn">
              <div className="dash-pane-header">
                <div>
                  <h2>Available Coupons & Vouchers ({coupons.length})</h2>
                  <p>Apply these promotional codes at checkout for exclusive hardware discounts.</p>
                </div>
              </div>

              {coupons.length > 0 ? (
                <div className="coupons-grid">
                  {coupons.map((c) => {
                    const isCopied = copiedCode === c.code
                    return (
                      <div key={c.id} className="coupon-card glass-panel">
                        <div className="coupon-badge-top">
                          <Ticket size={16} />
                          <span>{c.discount}</span>
                        </div>
                        <h3>{c.title}</h3>
                        <p>{c.description}</p>
                        <div className="coupon-code-row">
                          <div className="coupon-code-box">
                            <code>{c.code}</code>
                          </div>
                          <button
                            className={`icon-btn ${isCopied ? 'secondary' : 'primary'} btn-sm`}
                            onClick={() => handleCopyCoupon(c.code)}
                          >
                            {isCopied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                            <span>{isCopied ? 'Copied' : 'Copy Code'}</span>
                          </button>
                        </div>
                        <span className="coupon-expiry">Valid until {c.expiry}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="empty-pane-box">
                  <Ticket size={48} className="text-dim" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
                  <h3>No Active Coupons</h3>
                  <p>Check back soon for seasonal promotional vouchers and hardware deals.</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
