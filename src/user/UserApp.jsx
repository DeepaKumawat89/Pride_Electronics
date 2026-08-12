import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import AnnouncementBar from './components/layout/AnnouncementBar'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import HeroSection from './components/home/HeroSection'
import CategoryStrip from './components/home/CategoryStrip'
import BenefitsStrip from './components/home/BenefitsStrip'
import PromoBanner from './components/home/PromoBanner'
import ProductCatalog from './components/products/ProductCatalog'
import ProductDetailsPage from './components/products/ProductDetailsPage'
import ProductReviewsPage from './components/products/ProductReviewsPage'
import AuthModal from './components/auth/AuthModal'
import CheckoutModal from './components/checkout/CheckoutModal'
import AccountPanel, { LogoutConfirmation } from './components/profile/AccountPanel'
import { useCart } from './hooks/useCart'
import { formatCurrency } from './utils/currency'

const AUTH_SESSION_KEY = 'pride_authenticated_user'
const ADDRESS_SESSION_KEY = 'pride_saved_addresses'
const PAYMENT_SESSION_KEY = 'pride_saved_payments'
const PRODUCT_HASH_PREFIX = '#product-'
const REVIEWS_HASH_SUFFIX = '-reviews'

function getSessionUser() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

function getSessionItems(key, fallback) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null') || fallback
  } catch {
    return fallback
  }
}

const defaultAddresses = [{ id: 'address-home', type: 'Shipping', label: 'Home', fullName: 'Pride Customer', phone: '+91 98765 43210', line1: '42 Silicon Avenue, Hinjawadi', city: 'Pune', state: 'Maharashtra', pincode: '411057', isDefault: true }]
const defaultPayments = [{ id: 'payment-visa', type: 'Credit Card', holder: 'Pride Customer', last4: '4242', expiry: '12/28', isDefault: true }]

function createSampleOrders(products) {
  if (!products.length) return []
  const samples = [
    { id: 'ORD-84729', productIndex: 1, qty: 1, date: '2026-08-08', orderTime: '10:42 AM', deliveryDate: '2026-08-12', paymentStatus: 'Paid', status: 'Delivered' },
    { id: 'ORD-73106', productIndex: 7, qty: 1, date: '2026-07-27', orderTime: '6:18 PM', deliveryDate: '2026-08-03', paymentStatus: 'Paid', status: 'Shipped' },
    { id: 'ORD-62541', productIndex: 3, qty: 2, date: '2026-06-14', orderTime: '2:05 PM', deliveryDate: '2026-06-19', paymentStatus: 'Paid', status: 'Delivered' },
    { id: 'ORD-51983', productIndex: 9, qty: 1, date: '2026-04-22', orderTime: '9:31 AM', deliveryDate: 'Cancelled', paymentStatus: 'Refunded', status: 'Cancelled' },
  ]
  return samples.map((sample) => {
    const product = products[sample.productIndex] || products[0]
    const total = parseFloat(String(product.price).replace(/[^0-9.]/g, '')) * sample.qty
    return {
      ...sample,
      total: formatCurrency(total),
      itemsCount: sample.qty,
      items: [{ productName: product.name, image: product.image, qty: sample.qty, price: product.price }],
    }
  })
}

export default function UserApp({ products = [], onNewOrder, onBeSellerClick }) {
  const cart = useCart(products[0])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('popular')
  const [likedIds, setLikedIds] = useState([2, 8])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [pendingCart, setPendingCart] = useState(false)
  const [accountSection, setAccountSection] = useState(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [user, setUser] = useState(getSessionUser)
  const [orders, setOrders] = useState(() => createSampleOrders(products))
  const [savedAddresses, setSavedAddresses] = useState(() => getSessionItems(ADDRESS_SESSION_KEY, defaultAddresses))
  const [savedPayments, setSavedPayments] = useState(() => getSessionItems(PAYMENT_SESSION_KEY, defaultPayments))
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const cartReturnSection = useRef(null)
  const cartHistoryActive = useRef(false)
  const productReturnSection = useRef(null)
  const productHistoryActive = useRef(false)

  useEffect(() => {
    const handleHistoryBack = () => {
      if (window.location.hash.startsWith(PRODUCT_HASH_PREFIX)) {
        const productPath = window.location.hash.slice(PRODUCT_HASH_PREFIX.length)
        const isReviewsPage = productPath.endsWith(REVIEWS_HASH_SUFFIX)
        const productId = decodeURIComponent(isReviewsPage ? productPath.slice(0, -REVIEWS_HASH_SUFFIX.length) : productPath)
        const historyProduct = products.find((product) => String(product.id) === productId)
        if (historyProduct) {
          productHistoryActive.current = true
          setSelectedProduct(historyProduct)
          setReviewsOpen(isReviewsPage)
          setAccountSection(null)
          window.scrollTo({ top: 0, behavior: 'auto' })
          return
        }
      }
      if (productHistoryActive.current) {
        setSelectedProduct(null)
        setReviewsOpen(false)
        setAccountSection(productReturnSection.current)
        productReturnSection.current = null
        productHistoryActive.current = false
      }
      if (window.location.hash === '#account-cart') {
        cartHistoryActive.current = true
        setAccountSection('cart')
        return
      }
      if (cartHistoryActive.current && window.location.hash !== '#account-cart') {
        setAccountSection(cartReturnSection.current)
        cartReturnSection.current = null
        cartHistoryActive.current = false
      }
    }
    handleHistoryBack()
    window.addEventListener('popstate', handleHistoryBack)
    return () => window.removeEventListener('popstate', handleHistoryBack)
  }, [products])

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

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return []
    const sameCategory = products.filter((product) => product.id !== selectedProduct.id && product.category === selectedProduct.category)
    const otherRelevant = products
      .filter((product) => product.id !== selectedProduct.id && product.category !== selectedProduct.category)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating)
    return [...sameCategory, ...otherRelevant].slice(0, 4)
  }, [products, selectedProduct])

  const handleAdd = (product, quantity = 1) => {
    cart.add(product, quantity)
    notify(`${quantity > 1 ? `${quantity} x ` : ''}${product.name} added to your cart`)
  }

  const navigateToProduct = (product) => {
    if (!productHistoryActive.current) productReturnSection.current = accountSection
    productHistoryActive.current = true
    const productHash = `${PRODUCT_HASH_PREFIX}${encodeURIComponent(product.id)}`
    if (window.location.hash !== productHash) window.history.pushState({ prideProduct: product.id }, '', productHash)
    setSelectedProduct(product)
    setReviewsOpen(false)
    setAccountSection(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeProductDetails = () => {
    if (window.location.hash.startsWith(PRODUCT_HASH_PREFIX)) {
      window.history.back()
      return
    }
    setSelectedProduct(null)
  }

  const navigateToReviews = () => {
    if (!selectedProduct) return
    const reviewsHash = `${PRODUCT_HASH_PREFIX}${encodeURIComponent(selectedProduct.id)}${REVIEWS_HASH_SUFFIX}`
    if (window.location.hash !== reviewsHash) window.history.pushState({ prideProductReviews: selectedProduct.id }, '', reviewsHash)
    setReviewsOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeReviews = () => {
    if (window.location.hash.endsWith(REVIEWS_HASH_SUFFIX)) {
      window.history.back()
      return
    }
    setReviewsOpen(false)
  }

  const handleBuyNow = (product, quantity) => {
    cart.add(product, quantity)
    notify(`${product.name} is ready for checkout`)
    handleCheckout()
  }

  const handleAuthSuccess = (authenticatedUser, mode) => {
    sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authenticatedUser))
    setUser(authenticatedUser)
    notify(mode === 'signup' ? `Welcome to Pride, ${authenticatedUser.name.split(' ')[0]}!` : `Welcome back, ${authenticatedUser.name.split(' ')[0]}!`)
    if (pendingCheckout) {
      setPendingCheckout(false)
      setCheckoutOpen(true)
    }
    if (pendingCart) {
      setPendingCart(false)
      cartReturnSection.current = null
      cartHistoryActive.current = true
      window.history.pushState({ prideAccount: 'cart' }, '', '#account-cart')
      setAccountSection('cart')
    }
  }

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser)
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(updatedUser))
    } catch {
      notify('Profile updated, but the photo is too large to persist after refresh')
    }
  }

  const persistAddresses = (nextAddresses) => {
    setSavedAddresses(nextAddresses)
    sessionStorage.setItem(ADDRESS_SESSION_KEY, JSON.stringify(nextAddresses))
  }

  const handleSaveAddress = (address) => {
    const exists = savedAddresses.some((item) => item.id === address.id)
    let next = exists ? savedAddresses.map((item) => item.id === address.id ? address : item) : [...savedAddresses, { ...address, id: `address-${Date.now()}` }]
    const savedAddress = next.find((item) => item.id === address.id) || next[next.length - 1]
    if (savedAddress.isDefault || next.length === 1) next = next.map((item) => ({ ...item, isDefault: item.id === savedAddress.id }))
    persistAddresses(next)
    notify(exists ? 'Address updated successfully' : 'Address saved successfully')
  }

  const handleDeleteAddress = (addressId) => {
    const filtered = savedAddresses.filter((item) => item.id !== addressId)
    if (filtered.length && !filtered.some((item) => item.isDefault)) filtered[0] = { ...filtered[0], isDefault: true }
    persistAddresses(filtered)
    notify('Address deleted')
  }

  const handleDefaultAddress = (addressId) => {
    persistAddresses(savedAddresses.map((item) => ({ ...item, isDefault: item.id === addressId })))
    notify('Default delivery address updated')
  }

  const persistPayments = (nextPayments) => {
    setSavedPayments(nextPayments)
    sessionStorage.setItem(PAYMENT_SESSION_KEY, JSON.stringify(nextPayments))
  }

  const handleSavePayment = (payment) => {
    const exists = savedPayments.some((item) => item.id === payment.id)
    let next = exists ? savedPayments.map((item) => item.id === payment.id ? payment : item) : [...savedPayments, { ...payment, id: `payment-${Date.now()}` }]
    const savedPayment = next.find((item) => item.id === payment.id) || next[next.length - 1]
    if (savedPayment.isDefault || next.length === 1) next = next.map((item) => ({ ...item, isDefault: item.id === savedPayment.id }))
    persistPayments(next)
    notify(exists ? 'Payment method updated' : 'Payment method saved securely')
  }

  const handleDeletePayment = (paymentId) => {
    const filtered = savedPayments.filter((item) => item.id !== paymentId)
    if (filtered.length && !filtered.some((item) => item.isDefault)) filtered[0] = { ...filtered[0], isDefault: true }
    persistPayments(filtered)
    notify('Payment method deleted')
  }

  const handleDefaultPayment = (paymentId) => {
    persistPayments(savedPayments.map((item) => ({ ...item, isDefault: item.id === paymentId })))
    notify('Default payment method updated')
  }

  const handleLogout = () => {
    if (window.location.hash === '#account-cart') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      cartReturnSection.current = null
      cartHistoryActive.current = false
    }
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    setUser(null)
    setAccountSection(null)
    notify('You have been logged out successfully')
  }

  const handleProfileSelect = (section) => {
    if (section === 'cart') {
      navigateToCart()
      return
    }
    setAccountSection(section)
  }

  const navigateToCart = () => {
    if (!user) {
      setPendingCart(true)
      setAuthOpen(true)
      return
    }
    if (window.location.hash !== '#account-cart') {
      cartReturnSection.current = accountSection
      cartHistoryActive.current = true
      window.history.pushState({ prideAccount: 'cart' }, '', '#account-cart')
    }
    setAccountSection('cart')
  }

  const handleAccountSectionChange = (nextSection) => {
    if (nextSection === 'cart') {
      navigateToCart()
      return
    }
    if (window.location.hash === '#account-cart') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      cartReturnSection.current = null
      cartHistoryActive.current = false
    }
    setAccountSection(nextSection)
  }

  const closeAccountPanel = () => {
    if (window.location.hash === '#account-cart') {
      window.history.back()
      return
    }
    setAccountSection(null)
  }

  const handleAccountCheckout = () => {
    if (window.location.hash === '#account-cart') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
      cartReturnSection.current = null
      cartHistoryActive.current = false
    }
    setAccountSection(null)
    handleCheckout()
  }

  const handleCheckout = () => {
    if (user) {
      setCheckoutOpen(true)
      return
    }
    setPendingCheckout(true)
    setAuthOpen(true)
    notify('Please login or sign up to continue to checkout')
  }

  const handlePlaceOrder = (checkoutDetails = {}) => {
    const order = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: user?.name || 'Pride customer',
      email: user?.email || '',
      date: new Date().toISOString().slice(0, 10),
      total: formatCurrency(cart.subtotal),
      itemsCount: cart.count,
      status: 'Pending',
      orderTime: new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }),
      deliveryDate: 'Being scheduled',
      paymentStatus: 'Paid',
      shippingAddress: checkoutDetails.address || null,
      paymentMethod: checkoutDetails.payment?.type || 'Online payment',
      items: cart.items.map(({ product, quantity }) => ({ productName: product.name, image: product.image, qty: quantity, price: product.price })),
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
      <Header user={user} defaultAddress={savedAddresses.find((address) => address.isDefault) || savedAddresses[0]} cartCount={cart.count} wishlistCount={likedIds.length} onCartOpen={navigateToCart} onSearch={setQuery} onAuthOpen={() => setAuthOpen(true)} onCategoryChange={handleCategory} onProfileSelect={handleProfileSelect} onLogout={() => setLogoutConfirmOpen(true)} />
      <main>
        {selectedProduct && reviewsOpen ? (
          <ProductReviewsPage product={selectedProduct} onBack={closeReviews} />
        ) : selectedProduct ? (
          <ProductDetailsPage
            key={selectedProduct.id}
            product={selectedProduct}
            relatedProducts={relatedProducts}
            likedIds={likedIds}
            onBack={closeProductDetails}
            onLike={handleLike}
            onAdd={handleAdd}
            onBuyNow={handleBuyNow}
            onViewProduct={navigateToProduct}
            onViewAllReviews={navigateToReviews}
          />
        ) : (
          <>
            <HeroSection onShopNow={() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })} />
            <CategoryStrip onSelect={handleCategory} />
            <BenefitsStrip />
            <ProductCatalog products={filteredProducts} activeCategory={category} onCategoryChange={setCategory} sortBy={sortBy} onSortChange={setSortBy} likedIds={likedIds} onLike={handleLike} onAdd={handleAdd} onView={navigateToProduct} />
            <PromoBanner onShopNow={() => user ? setAccountSection('profile') : setAuthOpen(true)} />
          </>
        )}
      </main>
      <Footer onBeSellerClick={onBeSellerClick} />

      <AuthModal open={authOpen} onClose={() => { setAuthOpen(false); setPendingCheckout(false); setPendingCart(false) }} onSuccess={handleAuthSuccess} />
      <CheckoutModal key={`${savedAddresses.find((address) => address.isDefault)?.id || 'no-address'}-${savedPayments.find((payment) => payment.isDefault)?.id || 'no-payment'}`} open={checkoutOpen} subtotal={cart.subtotal} savedAddresses={savedAddresses} savedPayments={savedPayments} onClose={() => setCheckoutOpen(false)} onPlaceOrder={handlePlaceOrder} />
      {user && (
        <AccountPanel
          section={accountSection}
          user={user}
          wishlistProducts={products.filter((product) => likedIds.includes(product.id))}
          orders={orders}
          cartItems={cart.items}
          cartSubtotal={cart.subtotal}
          savedAddresses={savedAddresses}
          savedPayments={savedPayments}
          onSectionChange={handleAccountSectionChange}
          onClose={closeAccountPanel}
          onUpdateUser={handleUpdateUser}
          onRemoveWishlist={handleLike}
          onViewProduct={navigateToProduct}
          onAddToCart={handleAdd}
          onChangeQuantity={cart.changeQuantity}
          onRemoveCartItem={cart.remove}
          onSaveAddress={handleSaveAddress}
          onDeleteAddress={handleDeleteAddress}
          onSetDefaultAddress={handleDefaultAddress}
          onSavePayment={handleSavePayment}
          onDeletePayment={handleDeletePayment}
          onSetDefaultPayment={handleDefaultPayment}
          onCheckout={handleAccountCheckout}
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
