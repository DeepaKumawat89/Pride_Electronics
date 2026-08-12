import { useState } from 'react'
import { X, Trash2, ShoppingBag, Truck, Tag, ArrowRight, ShieldCheck } from 'lucide-react'

export default function CartDrawer({
  isOpen,
  cartItems,
  cartTotal,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout
}) {
  const [couponCode, setCouponCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [couponNotice, setCouponNotice] = useState('')

  if (!isOpen) return null

  const freeShippingThreshold = 4999
  const progressPercent = Math.min(100, (cartTotal / freeShippingThreshold) * 100)
  const amountNeeded = (freeShippingThreshold - cartTotal).toFixed(2)

  const handleApplyCoupon = (e) => {
    e.preventDefault()
    if (couponCode.trim().toUpperCase() === 'PRIDE20') {
      setDiscountPercent(0.2)
      setCouponNotice('20% Discount Applied!')
    } else {
      setCouponNotice('Invalid coupon code. Try PRIDE20')
    }
  }

  const discountAmount = cartTotal * discountPercent
  const finalTotal = Math.max(0, cartTotal - discountAmount)

  return (
    <div className="cart-drawer-backdrop" onClick={onClose}>
      <div className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="cart-header">
            <h2>
              <ShoppingBag size={22} color="var(--blue)" />
              <span>Your Shopping Cart ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})</span>
            </h2>
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="shipping-progress-bar">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)', fontWeight: '600' }}>
                <Truck size={16} color="var(--blue)" />
                <span>
                  {cartTotal >= freeShippingThreshold
                    ? '🎉 You qualify for FREE Express Shipping!'
                    : `Add ₹${amountNeeded} more for FREE Express Shipping`}
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--blue)' }}>
                {Math.round(progressPercent)}%
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} color="var(--text-dim)" style={{ marginBottom: '12px' }} />
              <p style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-main)' }}>Your cart is empty</p>
              <p style={{ fontSize: '0.88rem', marginTop: '4px' }}>Add components from our catalog to start building.</p>
            </div>
          ) : (
            <div className="cart-items-scroll">
              {cartItems.map(({ product, quantity }) => (
                <div key={product.id} className="cart-item-row">
                  <img src={product.image} alt={product.name} />
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: '700' }}>{product.name}</h4>
                      <button
                        onClick={() => onRemoveItem(product.id)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--rose)', cursor: 'pointer' }}
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--blue)', fontWeight: '700', fontFamily: 'var(--font-mono)', margin: '4px 0' }}>
                      {product.price}
                    </div>

                    <div className="qty-counter">
                      <button onClick={() => onUpdateQuantity(product.id, -1)}>-</button>
                      <span style={{ fontSize: '0.85rem', fontWeight: '700', fontFamily: 'var(--font-mono)' }}>{quantity}</span>
                      <button onClick={() => onUpdateQuantity(product.id, 1)}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-summary-footer">
            <form onSubmit={handleApplyCoupon} style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Coupon (e.g. PRIDE20)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: 'var(--text-main)',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase'
                  }}
                />
              </div>
              <button className="icon-btn" type="submit" style={{ padding: '8px 14px', fontSize: '0.82rem' }}>
                Apply
              </button>
            </form>

            {couponNotice && (
              <span style={{ fontSize: '0.78rem', color: discountPercent > 0 ? 'var(--emerald)' : 'var(--rose)' }}>
                {couponNotice}
              </span>
            )}

            <div className="summary-row">
              <span>Subtotal</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>₹{cartTotal.toFixed(2)}</span>
            </div>

            {discountPercent > 0 && (
              <div className="summary-row" style={{ color: 'var(--emerald)' }}>
                <span>Coupon Discount (20%)</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="summary-row">
              <span>Estimated Express Shipping</span>
              <span>{cartTotal >= freeShippingThreshold ? 'FREE' : '₹299'}</span>
            </div>

            <div className="summary-total-row">
              <span>Total</span>
              <span style={{ color: 'var(--blue)' }}>
                ₹{(finalTotal + (cartTotal >= freeShippingThreshold ? 0 : 299)).toFixed(2)}
              </span>
            </div>

            <button className="icon-btn primary btn-large" onClick={onCheckout} style={{ marginTop: '8px' }}>
              <span>Proceed to Checkout</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
