import ProductCard from './ProductCard'

export default function ProductGrid({
  products,
  isLoggedIn,
  onAddToCart,
  onViewDetails,
  onQuickView,
  wishlist = [],
  onToggleWishlist
}) {
  return (
    <div className="product-grid">
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
  )
}
