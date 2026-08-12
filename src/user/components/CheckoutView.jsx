import { useState } from 'react'
import {
  ArrowLeft,
  CreditCard,
  ShieldCheck,
  Truck,
  Lock,
  CheckCircle2,
  QrCode,
  Wallet,
  Building2,
  Sparkles,
  Check,
  Tag,
  User,
  Mail,
  Phone,
  MapPin,
  Building,
  Award,
  Zap,
  Clock,
  ArrowRight
} from 'lucide-react'

export default function CheckoutView({
  cartItems = [],
  cartTotal = 0,
  onBack,
  onPlaceOrder
}) {
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [deliverySpeed, setDeliverySpeed] = useState('express') // 'express' | 'priority'
  const [couponCode, setCouponCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState(0) // percentage e.g. 10
  const [couponMessage, setCouponMessage] = useState({ text: '', type: '' })
  const [vpaId, setVpaId] = useState('')
  const [vpaVerified, setVpaVerified] = useState(false)
  const [selectedBank, setSelectedBank] = useState('')

  const [formData, setFormData] = useState({
    fullName: 'Alex Mercer',
    email: 'alex.mercer@techdev.io',
    phone: '+91 98765 43210',
    address: 'Suite 402, XION Innovation Park, Hinjawadi',
    city: 'Pune',
    state: 'Maharashtra',
    zipCode: '411057',
    cardNumber: '4532 •••• •••• 8921',
    cardName: 'ALEX MERCER',
    cardExp: '08/28',
    cardCvc: '•••'
  })

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleApplyCoupon = (e) => {
    e.preventDefault()
    const cleanCode = couponCode.trim().toUpperCase()
    if (!cleanCode) return

    if (cleanCode === 'PRIDE10' || cleanCode === 'FIRST10') {
      setAppliedDiscount(10)
      setCouponMessage({ text: '🎉 10% Pride Special Discount applied!', type: 'success' })
    } else if (cleanCode === 'PRIDE20') {
      setAppliedDiscount(20)
      setCouponMessage({ text: '🔥 20% Super VIP Discount applied!', type: 'success' })
    } else {
      setCouponMessage({ text: 'Invalid coupon code. Try "PRIDE10"', type: 'error' })
    }
  }

  const handleVerifyVPA = () => {
    if (vpaId.includes('@')) {
      setVpaVerified(true)
    } else {
      alert('Please enter a valid UPI VPA ID (e.g. yourname@upi or user@okicici)')
    }
  }

  // Cost calculations
  const freeShippingThreshold = 4999
  const baseShipping = cartTotal >= freeShippingThreshold ? 0 : 299
  const shippingCost = deliverySpeed === 'priority' ? baseShipping + 200 : baseShipping
  
  const discountAmount = (cartTotal * appliedDiscount) / 100
  const discountedSubtotal = cartTotal - discountAmount
  const grandTotal = Math.max(0, discountedSubtotal + shippingCost).toFixed(2)

  const progressToFreeShipping = Math.min(100, Math.round((cartTotal / freeShippingThreshold) * 100))

  const handleSubmit = (e) => {
    e.preventDefault()
    onPlaceOrder({
      ...formData,
      paymentMethod,
      deliverySpeed,
      grandTotal,
      appliedDiscount
    })
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="checkout-empty-container glass-panel">
        <div className="empty-icon-circle">
          <Truck size={48} color="var(--blue)" />
        </div>
        <h2>Your Cart is Currently Empty</h2>
        <p>Explore our high-performance hardware catalog and add items to proceed with checkout.</p>
        <button className="icon-btn primary btn-large" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Return to Catalog</span>
        </button>
      </div>
    )
  }

  return (
    <div className="checkout-container">
      {/* Top Header Navigation */}
      <div className="checkout-header-bar">
        <button className="checkout-back-btn" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Hardware Catalog</span>
        </button>

        {/* Stepper Navigation */}
        <div className="checkout-stepper">
          <div className="step-item completed">
            <span className="step-num"><Check size={12} /></span>
            <span className="step-label">Cart</span>
          </div>
          <div className="step-divider active"></div>
          <div className="step-item active">
            <span className="step-num">2</span>
            <span className="step-label">Shipping</span>
          </div>
          <div className="step-divider"></div>
          <div className="step-item">
            <span className="step-num">3</span>
            <span className="step-label">Payment</span>
          </div>
          <div className="step-divider"></div>
          <div className="step-item">
            <span className="step-num">4</span>
            <span className="step-label">Review</span>
          </div>
        </div>
      </div>

      {/* Page Title & Subtitle Banner */}
      <div className="checkout-title-banner">
        <div>
          <div className="security-tag-pill">
            <ShieldCheck size={14} />
            <span>256-Bit Bank-Grade SSL Protection</span>
          </div>
          <h1>Express Secured Checkout</h1>
          <p>Review your hardware order details and select your preferred payment gateway.</p>
        </div>
      </div>

      {/* Main 2-Column Checkout Layout Grid */}
      <div className="checkout-layout">
        {/* Left Column: Form Details & Payment Selector */}
        <form onSubmit={handleSubmit} className="checkout-form-column">
          {/* Section 1: Contact & Delivery Information */}
          <div className="checkout-section-card glass-panel">
            <div className="section-card-header">
              <div className="section-step-badge">1</div>
              <div>
                <h3>Shipping & Delivery Address</h3>
                <p>Provide your delivery location for express dispatch</p>
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label><User size={14} /> Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="e.g. Alex Mercer"
                  value={formData.fullName}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label><Mail size={14} /> Email Address</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="alex@techdev.io"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label><Phone size={14} /> Mobile Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  required
                  placeholder="+91 98765 43210"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label><MapPin size={14} /> Street Address / Flat No.</label>
                <input
                  type="text"
                  name="address"
                  required
                  placeholder="XION Innovation Park, Hinjawadi"
                  value={formData.address}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            <div className="form-grid-3col">
              <div className="form-group">
                <label><Building size={14} /> City</label>
                <input
                  type="text"
                  name="city"
                  required
                  placeholder="Pune"
                  value={formData.city}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>State / Region</label>
                <input
                  type="text"
                  name="state"
                  required
                  placeholder="Maharashtra"
                  value={formData.state}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>PIN / Zip Code</label>
                <input
                  type="text"
                  name="zipCode"
                  required
                  placeholder="411057"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Delivery Method Selection */}
            <div className="delivery-method-box">
              <span className="delivery-box-title">Choose Delivery Speed</span>
              <div className="delivery-options-grid">
                <label className={`delivery-option-card ${deliverySpeed === 'express' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliverySpeed === 'express'}
                    onChange={() => setDeliverySpeed('express')}
                  />
                  <div className="option-info">
                    <div className="option-title-row">
                      <Truck size={16} color="var(--blue)" />
                      <strong>Standard Express Delivery</strong>
                    </div>
                    <span className="option-sub">Est. Delivery in 2 - 3 Business Days</span>
                  </div>
                  <div className="option-price">
                    {baseShipping === 0 ? <span className="free-tag">FREE</span> : <span>₹299</span>}
                  </div>
                </label>

                <label className={`delivery-option-card ${deliverySpeed === 'priority' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliverySpeed === 'priority'}
                    onChange={() => setDeliverySpeed('priority')}
                  />
                  <div className="option-info">
                    <div className="option-title-row">
                      <Zap size={16} color="var(--amber)" />
                      <strong>Priority Next-Day Air</strong>
                    </div>
                    <span className="option-sub">Overnight Insured Express Flight Dispatch</span>
                  </div>
                  <div className="option-price">
                    <span>₹{baseShipping + 200}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Payment Method Selection */}
          <div className="checkout-section-card glass-panel">
            <div className="section-card-header">
              <div className="section-step-badge">2</div>
              <div>
                <h3>Select Payment Method</h3>
                <p>All payments are securely processed via 256-bit encrypted channels</p>
              </div>
            </div>

            {/* Payment Tabs Grid */}
            <div className="payment-tabs-grid">
              <button
                type="button"
                className={`payment-tab-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard size={18} />
                <span>Credit/Debit Card</span>
              </button>

              <button
                type="button"
                className={`payment-tab-btn ${paymentMethod === 'upi' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('upi')}
              >
                <QrCode size={18} />
                <span>UPI / GPay / PhonePe</span>
              </button>

              <button
                type="button"
                className={`payment-tab-btn ${paymentMethod === 'netbanking' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('netbanking')}
              >
                <Building2 size={18} />
                <span>NetBanking / Wallets</span>
              </button>

              <button
                type="button"
                className={`payment-tab-btn ${paymentMethod === 'cod' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <Truck size={18} />
                <span>Cash on Delivery</span>
              </button>
            </div>

            {/* Dynamic Payment Tab Sub-views */}
            {paymentMethod === 'card' && (
              <div className="payment-details-box card-box">
                {/* Live Card Preview Illustration */}
                <div className="card-mockup-visual">
                  <div className="card-mockup-chip"></div>
                  <div className="card-mockup-number">{formData.cardNumber || '•••• •••• •••• 8921'}</div>
                  <div className="card-mockup-bottom">
                    <div>
                      <div className="mockup-label">CARDHOLDER</div>
                      <div className="mockup-val">{formData.cardName || 'ALEX MERCER'}</div>
                    </div>
                    <div>
                      <div className="mockup-label">EXPIRES</div>
                      <div className="mockup-val">{formData.cardExp || '08/28'}</div>
                    </div>
                    <div className="card-brand-logo">VISA / MC</div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Cardholder Name</label>
                  <input
                    type="text"
                    name="cardName"
                    required
                    placeholder="ALEX MERCER"
                    value={formData.cardName}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label>Card Number</label>
                  <input
                    type="text"
                    name="cardNumber"
                    required
                    placeholder="4532 8901 2345 8921"
                    value={formData.cardNumber}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-grid-2col">
                  <div className="form-group">
                    <label>Expiry Date</label>
                    <input
                      type="text"
                      name="cardExp"
                      required
                      placeholder="MM / YY"
                      value={formData.cardExp}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Security Code (CVV)</label>
                    <input
                      type="password"
                      name="cardCvc"
                      required
                      maxLength={4}
                      placeholder="•••"
                      value={formData.cardCvc}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="ssl-info-note">
                  <Lock size={14} color="var(--emerald)" />
                  <span>Card numbers are end-to-end tokenized and never stored on servers.</span>
                </div>
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="payment-details-box upi-box">
                <div className="upi-qr-card">
                  <div className="qr-box">
                    <QrCode size={90} color="#0f172a" />
                  </div>
                  <div className="qr-meta">
                    <h4>Instant UPI QR Scan & Pay</h4>
                    <p>Open Google Pay, PhonePe, Paytm, BHIM, or CRED app to scan & complete payment instantly.</p>
                  </div>
                </div>

                <div className="vpa-input-divider">
                  <span>OR PAY VIA VPA ID</span>
                </div>

                <div className="vpa-input-row">
                  <input
                    type="text"
                    placeholder="Enter UPI VPA ID (e.g. alex@okicici)"
                    value={vpaId}
                    onChange={(e) => {
                      setVpaId(e.target.value)
                      setVpaVerified(false)
                    }}
                  />
                  <button type="button" className="vpa-verify-btn" onClick={handleVerifyVPA}>
                    {vpaVerified ? <Check size={16} /> : 'Verify'}
                  </button>
                </div>
                {vpaVerified && (
                  <div className="vpa-success-tag">
                    <CheckCircle2 size={14} /> VPA Handle Verified! Ready for 1-click checkout.
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'netbanking' && (
              <div className="payment-details-box netbanking-box">
                <h4>Select Top Indian Bank</h4>
                <div className="popular-banks-grid">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank'].map((bank) => (
                    <button
                      key={bank}
                      type="button"
                      className={`bank-pill-btn ${selectedBank === bank ? 'active' : ''}`}
                      onClick={() => setSelectedBank(bank)}
                    >
                      <Building2 size={14} />
                      <span>{bank}</span>
                    </button>
                  ))}
                </div>

                <div className="form-group" style={{ marginTop: '16px' }}>
                  <label>All Other Indian Banks</label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="bank-select-dropdown"
                  >
                    <option value="">-- Choose NetBanking Bank --</option>
                    <option value="Bank of Baroda">Bank of Baroda</option>
                    <option value="Canara Bank">Canara Bank</option>
                    <option value="IndusInd Bank">IndusInd Bank</option>
                    <option value="IDFC FIRST Bank">IDFC FIRST Bank</option>
                    <option value="Federal Bank">Federal Bank</option>
                  </select>
                </div>
              </div>
            )}

            {paymentMethod === 'cod' && (
              <div className="payment-details-box cod-box">
                <div className="cod-badge-banner">
                  <Truck size={24} color="#b45309" />
                  <div>
                    <strong>Doorstep Cash / UPI Payment</strong>
                    <p>Pay cash or scan UPI QR code with delivery agent when package arrives at your home.</p>
                  </div>
                </div>
                <div className="cod-notes">
                  <ul>
                    <li>An SMS OTP verification code will be sent to your mobile phone prior to dispatch.</li>
                    <li>Please keep exact cash amount ₹{grandTotal} ready for doorstep delivery.</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Submit Order Action Button */}
            <button className="checkout-submit-btn" type="submit">
              <Lock size={18} />
              <span>Confirm & Place Secured Order • ₹{grandTotal}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </form>

        {/* Right Column: Sticky Order Summary Sidebar */}
        <div className="checkout-sidebar-column">
          <div className="checkout-summary-card glass-panel sticky-summary">
            <div className="summary-header">
              <h3>Order Summary</h3>
              <span className="items-count-pill">{cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items</span>
            </div>

            {/* Free Shipping Progress Indicator */}
            <div className="free-shipping-bar-box">
              <div className="shipping-bar-text">
                {cartTotal >= freeShippingThreshold ? (
                  <span className="unlocked-text"><Sparkles size={14} /> Express FREE Shipping Unlocked!</span>
                ) : (
                  <span>Add ₹{(freeShippingThreshold - cartTotal).toFixed(0)} more for FREE Express Shipping</span>
                )}
              </div>
              <div className="shipping-progress-track">
                <div
                  className="shipping-progress-fill"
                  style={{ width: `${progressToFreeShipping}%` }}
                ></div>
              </div>
            </div>

            {/* Items List Preview */}
            <div className="summary-items-list">
              {cartItems.map(({ product, quantity }) => {
                const numPrice = Number(product.price.replace(/[^0-9.]/g, ''))
                const itemTotal = (numPrice * quantity).toFixed(2)
                return (
                  <div key={product.id} className="summary-item-row">
                    <div className="item-thumb-wrapper">
                      <img src={product.image} alt={product.name} />
                      <span className="item-qty-badge">{quantity}</span>
                    </div>
                    <div className="item-details">
                      <h4 className="item-name">{product.name}</h4>
                      <span className="item-cat">{product.category}</span>
                      <span className="item-price">₹{numPrice.toLocaleString()} each</span>
                    </div>
                    <div className="item-total-price">
                      ₹{itemTotal}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Coupon / Promo Code Field */}
            <div className="coupon-code-card">
              <form onSubmit={handleApplyCoupon} className="coupon-form-row">
                <div className="coupon-input-wrap">
                  <Tag size={15} className="coupon-icon" />
                  <input
                    type="text"
                    placeholder="Promo Code (Try PRIDE10)"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                </div>
                <button type="submit" className="coupon-apply-btn">Apply</button>
              </form>
              {couponMessage.text && (
                <div className={`coupon-msg ${couponMessage.type}`}>
                  {couponMessage.text}
                </div>
              )}
            </div>

            {/* Price Calculations Table */}
            <div className="summary-calculations">
              <div className="calc-row">
                <span>Items Subtotal</span>
                <span className="mono-val">₹{cartTotal.toFixed(2)}</span>
              </div>

              {appliedDiscount > 0 && (
                <div className="calc-row discount-row">
                  <span>Promo Discount ({appliedDiscount}%)</span>
                  <span className="mono-val">-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="calc-row">
                <span>Delivery Charge</span>
                <span>
                  {shippingCost === 0 ? (
                    <strong className="free-shipping-tag">FREE Express</strong>
                  ) : (
                    <span className="mono-val">₹{shippingCost}</span>
                  )}
                </span>
              </div>

              <div className="calc-row">
                <span>GST & Duties (Included)</span>
                <span className="mono-val">₹0.00</span>
              </div>

              <div className="calc-divider"></div>

              <div className="calc-row grand-total-row">
                <span>Total Amount Payable</span>
                <span className="grand-price">₹{grandTotal}</span>
              </div>
            </div>

            {/* Pride Guarantee Badges Box */}
            <div className="pride-guarantee-card">
              <div className="guarantee-header">
                <ShieldCheck size={18} color="var(--blue)" />
                <strong>Pride Buyer Protection Included</strong>
              </div>
              <div className="guarantee-grid">
                <div className="guarantee-item">
                  <Award size={14} color="var(--blue)" />
                  <span>2-Year Warranty</span>
                </div>
                <div className="guarantee-item">
                  <Clock size={14} color="var(--emerald)" />
                  <span>30-Day Money Back</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
