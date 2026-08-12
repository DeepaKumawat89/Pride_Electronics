import { useState, useRef } from 'react'
import { ArrowLeft, Star, ShoppingBag, ShieldCheck, Truck, RotateCcw, CheckCircle2, Award, Heart } from 'lucide-react'
import ProductCard from './ProductCard'

export default function ProductDetailsView({
  product,
  relatedProducts = [],
  isLoggedIn,
  onAddToCart,
  onViewDetails,
  onQuickView,
  onBack,
  wishlist = [],
  onToggleWishlist
}) {
  const [quantity, setQuantity] = useState(1)
  const [mainImgIdx, setMainImgIdx] = useState(0)
  const isWishlisted = wishlist.includes(product.id)

  // Derive the image array from product data
  const productImages =
    product.images && product.images.length > 0 ? product.images : [product.image]

  // Swipe state for main image
  const swipeStartX = useRef(null)
  const swipeStartY = useRef(null)

  const handleImgTouchStart = (e) => {
    swipeStartX.current = e.touches[0].clientX
    swipeStartY.current = e.touches[0].clientY
  }

  const handleImgTouchEnd = (e) => {
    if (swipeStartX.current === null) return
    const dx = e.changedTouches[0].clientX - swipeStartX.current
    const dy = e.changedTouches[0].clientY - swipeStartY.current
    swipeStartX.current = null
    swipeStartY.current = null
    // Only register as horizontal swipe
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      if (dx < 0) {
        setMainImgIdx((prev) => Math.min(prev + 1, productImages.length - 1))
      } else {
        setMainImgIdx((prev) => Math.max(prev - 1, 0))
      }
    }
  }

  const handleAddMultiple = () => {
    for (let i = 0; i < quantity; i++) {
      onAddToCart(product)
    }
  }

  const numericPrice = Number(product.price.replace(/[^0-9.]/g, '')) || 0
  const totalPriceFormatted = (numericPrice * quantity).toLocaleString('en-IN')

  return (
    <div className="details-view">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button className="back-link-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>Back to Hardware Catalog</span>
        </button>

        <button
          className={`wishlist-btn-pill ${isWishlisted ? 'active' : ''}`}
          onClick={() => onToggleWishlist && onToggleWishlist(product.id)}
        >
          <Heart size={16} fill={isWishlisted ? 'currentColor' : 'none'} />
          <span>{isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
        </button>
      </div>

      <div className="details-card-container glass-panel">
        {/* Left Column: Product Image Gallery */}
        <div className="details-image-box">
          {/* Swipeable Main Image */}
          <div
            className="details-main-img-wrap"
            onTouchStart={handleImgTouchStart}
            onTouchEnd={handleImgTouchEnd}
          >
            <div
              className="details-main-img-track"
              style={{ transform: `translateX(-${mainImgIdx * 100}%)` }}
            >
              {productImages.map((imgSrc, i) => (
                <div key={i} className="details-main-img-slide">
                  <img src={imgSrc} alt={`${product.name} view ${i + 1}`} />
                </div>
              ))}
            </div>

            {product.badge && <span className="details-badge-tag">{product.badge}</span>}

            <div className="details-image-overlay-badge">
              <Award size={16} color="#34d399" />
              <span>Direct Manufacturer Warranty</span>
            </div>
          </div>

          {/* Indicator Dots */}
          {productImages.length > 1 && (
            <div className="details-img-dots">
              {productImages.map((_, i) => (
                <span
                  key={i}
                  className={`details-img-dot ${i === mainImgIdx ? 'active' : ''}`}
                  onClick={() => setMainImgIdx(i)}
                />
              ))}
            </div>
          )}

          {/* Thumbnail Strip */}
          {productImages.length > 1 && (
            <div className="details-thumbnails-row">
              {productImages.map((imgSrc, i) => (
                <img
                  key={i}
                  src={imgSrc}
                  alt={`Thumbnail ${i + 1}`}
                  className={`details-thumb-img ${i === mainImgIdx ? 'active' : ''}`}
                  onClick={() => setMainImgIdx(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Structured Details & Buy Box */}
        <div className="details-body">
          {/* Header Box */}
          <div className="details-header-box">
            <div className="details-meta-row">
              <span className="card-category">{product.category}</span>
              <span className={`stock-status-pill ${product.stock < 10 ? 'low' : 'in-stock'}`}>
                {product.stock < 10 ? `Only ${product.stock} Left` : 'In Stock'}
              </span>
            </div>

            <h1 className="details-product-title">{product.name}</h1>

            <div className="details-rating-row">
              <div className="rating-pill">
                <Star size={14} fill="currentColor" />
                <span>{product.rating}</span>
              </div>
              <span className="reviews-count">
                ({product.reviewsCount} customer reviews)
              </span>
              <span className="verified-chip">
                ✓ Authentic Silicon
              </span>
            </div>
          </div>

          {/* Pricing & Add to Cart Buy Box */}
          <div className="details-buy-box">
            <div className="details-price-row">
              <span className="price-main-large">{product.price}</span>
              {product.originalPrice && (
                <span className="price-original-large">{product.originalPrice}</span>
              )}
              {product.discount && (
                <span className="discount-badge-chip">{product.discount}</span>
              )}
            </div>

            <p className="details-description">
              {product.description}
            </p>

            <div className="details-actions-row">
              <div className="qty-counter-large">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <span className="qty-value">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>

              <button
                className="icon-btn primary btn-large add-to-cart-glow"
                onClick={handleAddMultiple}
              >
                <ShoppingBag size={20} />
                <span>Add to Cart • ₹{totalPriceFormatted}</span>
              </button>
            </div>
          </div>

          {/* Key Specifications Card */}
          {product.specs && (
            <div className="details-specs-table">
              <h3>Key Specifications</h3>
              <div className="specs-grid-layout">
                {product.specs.map((spec, index) => (
                  <div key={index} className="spec-grid-card">
                    <CheckCircle2 size={16} color="var(--emerald)" />
                    <span>{spec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Store Guarantees Row */}
          <div className="details-guarantees-grid">
            <div className="guarantee-chip">
              <ShieldCheck size={18} color="var(--blue)" />
              <div>
                <strong>2-Year Warranty</strong>
                <span>Full repair or replace</span>
              </div>
            </div>
            <div className="guarantee-chip">
              <Truck size={18} color="var(--emerald)" />
              <div>
                <strong>Express Delivery</strong>
                <span>Dispatch within 24h</span>
              </div>
            </div>
            <div className="guarantee-chip">
              <RotateCcw size={18} color="var(--amber)" />
              <div>
                <strong>30-Day Guarantee</strong>
                <span>Hassle-free returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section className="related-products-section">
          <div className="section-header" style={{ marginTop: '0', marginBottom: '20px' }}>
            <h2>Related {product.category} Hardware</h2>
            <p>Explore complementary components frequently paired with this item.</p>
          </div>

          <div className="product-grid">
            {relatedProducts.map((relProduct) => (
              <ProductCard
                key={relProduct.id}
                product={relProduct}
                isLoggedIn={isLoggedIn}
                onAddToCart={onAddToCart}
                onViewDetails={onViewDetails}
                onQuickView={onQuickView}
                isWishlisted={wishlist.includes(relProduct.id)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
