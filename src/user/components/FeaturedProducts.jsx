import ProductCard from './ProductCard'
import { Zap } from 'lucide-react'

export default function FeaturedProducts({
  products,
  isLoggedIn,
  onAddToCart,
  onViewDetails,
  onQuickView,
  wishlist = [],
  onToggleWishlist
}) {
  return (
    <section id="featured-section" className="section-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Zap color="var(--amber)" size={24} />
        <h2>Featured Hardware & Components</h2>
      </div>
      <p>Hand-picked flagship gear with maximum performance ratings.</p>

      <div className="product-grid" style={{ marginTop: '20px' }}>
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isLoggedIn={isLoggedIn}
            onAddToCart={onAddToCart}
            onViewDetails={onViewDetails}
            onQuickView={onQuickView}
            isWishlisted={wishlist.includes(product.id)}
            onToggleWishlist={onToggleWishlist}
          />
        ))}
      </div>
    </section>
  )
}
