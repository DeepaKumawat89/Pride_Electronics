import { useRef, useState } from 'react'
import { Star, ShoppingBag, Heart, ArrowRight } from 'lucide-react'

export default function ProductCard({
  product,
  isLoggedIn,
  onAddToCart,
  onViewDetails,
  onQuickView,
  isWishlisted,
  onToggleWishlist
}) {
  const timerRef = useRef(null)
  const isLongPressRef = useRef(false)
  const [holding, setHolding] = useState(false)

  // Swipeable image carousel state
  const productImages = product.images && product.images.length > 0 ? product.images : [product.image]
  const [currentImg, setCurrentImg] = useState(0)
  const swipeStartX = useRef(null)
  const swipeStartY = useRef(null)
  const isSwiping = useRef(false)

  // --- Long-press handlers for card body (navigate to details / quick view) ---
  const handlePressStart = (e) => {
    if (e.target.closest('button')) return
    if (isSwiping.current) return
    isLongPressRef.current = false
    setHolding(true)
    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true
      setHolding(false)
      if (onQuickView) onQuickView(product)
    }, 420)
  }

  const handlePressEnd = (e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setHolding(false)
    if (!isLongPressRef.current && !e.target.closest('button') && !isSwiping.current) {
      if (onViewDetails) onViewDetails(product)
    }
    isLongPressRef.current = false
    isSwiping.current = false
  }

  const handlePressCancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setHolding(false)
    isLongPressRef.current = false
    isSwiping.current = false
  }

  // --- Image carousel swipe handlers ---
  const handleImgTouchStart = (e) => {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
    isSwiping.current = false
  }

  const handleImgTouchMove = (e) => {
    if (swipeStartX.current === null) return
    const dx = Math.abs(e.touches[0].clientX - swipeStartX.current)
    const dy = Math.abs(e.touches[0].clientY - swipeStartY.current)
    // If mostly horizontal movement, mark as swiping and cancel long press
    if (dx > dy && dx > 8) {
      isSwiping.current = true
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setHolding(false)
    }
  }

  const handleImgTouchEnd = (e) => {
    if (swipeStartX.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    const wasPrimarilyHorizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30

    if (wasPrimarilyHorizontal) {
      e.stopPropagation()
      if (dx < 0) {
        setCurrentImg((prev) => Math.min(prev + 1, productImages.length - 1))
      } else {
        setCurrentImg((prev) => Math.max(prev - 1, 0))
      }
    }

    swipeStartX.current = null
    swipeStartY.current = null
  }

  return (
    <div
      className={`product-card glass-panel ${holding ? 'holding-press' : ''}`}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressCancel}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onTouchCancel={handlePressCancel}
      style={{ cursor: 'pointer', position: 'relative' }}
    >
      {/* Swipeable Image Carousel */}
      <div
        className="card-image-wrap card-carousel"
        onTouchStart={handleImgTouchStart}
        onTouchMove={handleImgTouchMove}
        onTouchEnd={handleImgTouchEnd}
      >
        <div
          className="card-img-track"
          style={{ transform: `translateX(-${currentImg * 100}%)` }}
        >
          {productImages.map((imgSrc, idx) => (
            <div key={idx} className="card-img-slide">
              <img src={imgSrc} alt={`${product.name} view ${idx + 1}`} loading="lazy" />
            </div>
          ))}
        </div>

        {product.badge && <span className="badge-tag">{product.badge}</span>}
        {product.discount && <span className="discount-tag">{product.discount}</span>}

        <button
          type="button"
          className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleWishlist && onToggleWishlist(product.id)
          }}
          title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
        >
          <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Image Indicator Dots */}
      {productImages.length > 1 && (
        <div className="card-img-dots">
          {productImages.map((_, idx) => (
            <span
              key={idx}
              className={`card-img-dot ${idx === currentImg ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                setCurrentImg(idx)
              }}
            />
          ))}
        </div>
      )}

      <div className="card-details">
        <div className="card-category-row">
          <span className="card-category">{product.category}</span>
          <div className="rating-pill">
            <Star size={12} fill="currentColor" />
            <span>{product.rating}</span>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
              ({product.reviewsCount})
            </span>
          </div>
        </div>

        <h3 className="card-title">{product.name}</h3>
        <p className="card-desc">{product.description}</p>

        {product.specs && product.specs.length > 0 && (
          <div className="card-specs-tags">
            {product.specs.slice(0, 2).map((spec, idx) => (
              <span key={idx} className="spec-chip">
                {spec}
              </span>
            ))}
          </div>
        )}

        <div className="card-price-row">
          <div className="card-price-group">
            <span className="price-main">{product.price}</span>
            {product.originalPrice && (
              <span className="price-original">{product.originalPrice}</span>
            )}
          </div>
          <span
            style={{
              fontSize: '0.74rem',
              color: product.stock < 10 ? 'var(--amber)' : 'var(--emerald)',
              fontWeight: '600'
            }}
          >
            {product.stock < 10 ? `Only ${product.stock} left` : 'In Stock'}
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="card-action-btns">
        <button
          type="button"
          className="icon-btn"
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails && onViewDetails(product)
          }}
          title="View Product Specifications"
        >
          <span>View Details</span>
          <ArrowRight size={15} />
        </button>

        <button
          type="button"
          className="icon-btn primary"
          onClick={(e) => {
            e.stopPropagation()
            onAddToCart && onAddToCart(product)
          }}
        >
          <ShoppingBag size={16} />
          <span>Add</span>
        </button>
      </div>
    </div>
  )
}
