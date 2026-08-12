import { X, Star, CheckCircle2, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react'

export default function QuickViewModal({
  product,
  onClose,
  onAddToCart,
  onViewFullDetails
}) {
  if (!product) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="quickview-grid">
          <div>
            <img src={product.image} alt={product.name} className="quickview-img" />
          </div>

          <div className="quickview-info">
            <span className="card-category">{product.category}</span>
            <h2>{product.name}</h2>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div className="rating-pill">
                <Star size={14} fill="currentColor" />
                <span>{product.rating}</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {product.reviewsCount} verified hardware reviews
              </span>
            </div>

            <div className="quickview-price">
              {product.price}
              {product.originalPrice && (
                <span className="price-original" style={{ fontSize: '1.05rem', marginLeft: '10px' }}>
                  {product.originalPrice}
                </span>
              )}
            </div>

            <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.92rem' }}>
              {product.description}
            </p>

            <div className="quickview-specs-list">
              <h4 style={{ color: 'var(--text-main)', fontSize: '0.95rem', marginBottom: '4px' }}>Key Technical Highlights:</h4>
              {product.specs &&
                product.specs.map((spec, index) => (
                  <div key={index} className="spec-list-item">
                    <CheckCircle2 size={16} />
                    <span>{spec}</span>
                  </div>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px 0', fontSize: '0.85rem', color: 'var(--emerald)' }}>
              <ShieldCheck size={16} />
              <span>In Stock - Includes 2-Year Full Hardware Warranty</span>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                className="icon-btn primary btn-large"
                style={{ flex: 1 }}
                onClick={() => {
                  onAddToCart(product)
                  onClose()
                }}
              >
                <ShoppingBag size={18} />
                <span>Add to Cart</span>
              </button>

              <button
                className="icon-btn btn-large"
                onClick={() => {
                  onViewFullDetails(product)
                  onClose()
                }}
              >
                <span>Full Details</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
