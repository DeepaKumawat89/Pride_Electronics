import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import AnnouncementBar from './components/layout/AnnouncementBar'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import HeroSection from './components/home/HeroSection'
import CategoryStrip from './components/home/CategoryStrip'
import BenefitsStrip from './components/home/BenefitsStrip'
import PromoBanner from './components/home/PromoBanner'
import ProductCatalog from './components/products/ProductCatalog'
import ProductModal from './components/products/ProductModal'
import CartDrawer from './components/cart/CartDrawer'
import AuthModal from './components/auth/AuthModal'
import CheckoutModal from './components/checkout/CheckoutModal'
import AccountPanel, { LogoutConfirmation } from './components/profile/AccountPanel'
import { useCart } from './hooks/useCart'
import { formatCurrency } from './utils/currency'

const AUTH_SESSION_KEY = 'pride_authenticated_user'

function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

export default function UserApp({ products = [], onNewOrder, onBeSellerClick }) {
  const cart = useCart(products[0])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('popular')
  const [likedIds, setLikedIds] = useState([2, 8])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [accountSection, setAccountSection] = useState(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [user, setUser] = useState(getSessionUser)
  const [orders, setOrders] = useState([])
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)

  const notify = (message) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return products
      .filter((product) => category === 'All' || product.category === category)
      .filter((product) => !normalizedQuery || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        const priceA = Number(String(a.price).replace(/[^0-9.]/g, ''))
        const priceB = Number(String(b.price).replace(/[^0-9.]/g, ''))
        if (sortBy === 'price-low') return priceA - priceB
        if (sortBy === 'price-high') return priceB - priceA
        if (sortBy === 'rating') return b.rating - a.rating
        return b.reviewsCount - a.reviewsCount
      })
  }, [products, query, category, sortBy])

  const handleCategory = (nextCategory) => {
    setCategory(nextCategory)
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleLike = (productId) => {
    setLikedIds((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId])
  }

  const handleAdd = (product) => {
    cart.add(product)
    notify(`${product.name} added to your cart`)
  }

  const handleAuthSuccess = (authenticatedUser, mode) => {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authenticatedUser))
    setUser(authenticatedUser)
    notify(mode === 'signup' ? `Welcome to Pride, ${authenticatedUser.name.split(' ')[0]}!` : `Welcome back, ${authenticatedUser.name.split(' ')[0]}!`)
    if (pendingCheckout) {
      setPendingCheckout(false)
      setCheckoutOpen(true)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    setUser(null)
    setAccountSection(null)
    notify('You have been logged out successfully')
  }

  const handleProfileSelect = (section) => {
    if (section === 'cart') {
      setCartOpen(true)
      return
    }
    setAccountSection(section)
  }

  const handleCheckout = () => {
    setCartOpen(false)
    if (user) {
      setCheckoutOpen(true)
      return
    }
    setPendingCheckout(true)
    setAuthOpen(true)
    notify('Please login or sign up to continue to checkout')
  }

  const handlePlaceOrder = () => {
    const order = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: user?.name || 'Pride customer',
      email: user?.email || '',
      date: new Date().toISOString().slice(0, 10),
      total: formatCurrency(cart.subtotal),
      itemsCount: cart.count,
      status: 'Pending',
      items: cart.items.map(({ product, quantity }) => ({ productName: product.name, qty: quantity, price: product.price })),
    }
    onNewOrder?.(order)
    setOrders((current) => [order, ...current])
    cart.clear()
    setCheckoutOpen(false)
    notify(`Order ${order.id} placed successfully`)
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f8f5]">
      <AnnouncementBar />
      <Header user={user} cartCount={cart.count} wishlistCount={likedIds.length} onCartOpen={() => setCartOpen(true)} onSearch={setQuery} onAuthOpen={() => setAuthOpen(true)} onCategoryChange={handleCategory} onProfileSelect={handleProfileSelect} onLogout={() => setLogoutConfirmOpen(true)} />
      <main>
        <HeroSection onShopNow={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })} />
        <CategoryStrip onSelect={handleCategory} />
        <BenefitsStrip />
        <ProductCatalog products={filteredProducts} activeCategory={category} onCategoryChange={setCategory} sortBy={sortBy} onSortChange={setSortBy} likedIds={likedIds} onLike={handleLike} onAdd={handleAdd} onView={setSelectedProduct} />
        <PromoBanner onShopNow={() => user ? setAccountSection('profile') : setAuthOpen(true)} />
      </main>
      <Footer onBeSellerClick={onBeSellerClick} />

      <ProductModal product={selectedProduct} liked={selectedProduct ? likedIds.includes(selectedProduct.id) : false} onClose={() => setSelectedProduct(null)} onLike={handleLike} onAdd={handleAdd} />
      <CartDrawer open={cartOpen} items={cart.items} subtotal={cart.subtotal} onClose={() => setCartOpen(false)} onChangeQuantity={cart.changeQuantity} onRemove={cart.remove} onCheckout={handleCheckout} />
      <AuthModal open={authOpen} onClose={() => { setAuthOpen(false); setPendingCheckout(false) }} onSuccess={handleAuthSuccess} />
      <CheckoutModal open={checkoutOpen} subtotal={cart.subtotal} onClose={() => setCheckoutOpen(false)} onPlaceOrder={handlePlaceOrder} />
      {user && (
        <AccountPanel
          section={accountSection}
          user={user}
          wishlistProducts={products.filter((product) => likedIds.includes(product.id))}
          orders={orders}
          cartItems={cart.items}
          cartSubtotal={cart.subtotal}
          onSectionChange={setAccountSection}
          onClose={() => setAccountSection(null)}
          onAddToCart={handleAdd}
          onChangeQuantity={cart.changeQuantity}
          onRemoveCartItem={cart.remove}
          onCheckout={() => { setAccountSection(null); handleCheckout() }}
          onLogout={handleLogout}
        />
      )}
      {logoutConfirmOpen && (
        <LogoutConfirmation
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={() => {
            setLogoutConfirmOpen(false)
            handleLogout()
          }}
        />
      )}

      {toast && <div className="fixed bottom-5 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-full bg-slate-950 px-5 py-3.5 text-xs font-bold text-white shadow-2xl"><CheckCircle2 size={17} className="shrink-0 text-[#8fd0a4]"/><span className="flex-1 truncate">{toast}</span><button type="button" onClick={() => setToast('')}><X size={15}/></button></div>}
    </div>
  )
}
