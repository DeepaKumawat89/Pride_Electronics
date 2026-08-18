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
import CheckoutPage from './components/checkout/CheckoutPage'
import OrderSuccessPage from './components/checkout/OrderSuccessPage'
import AccountPanel, {
  LogoutConfirmation,
} from './components/profile/AccountPanel'
import { useCart } from './hooks/useCart'
import { formatCurrency, parsePrice } from './utils/currency'
import {
  matchesProductQuery,
  normalizeSearchQuery,
} from './utils/productSearch'
import { sortCatalogProducts } from './utils/catalog'
import { normalizeAddress } from './utils/address'
import { createInvoiceNumber, initialInvoiceSettings } from '../data/invoice'
import { initialAdminSettings } from '../data/adminSettings'
import {
  observeUserSession,
  saveUserProfile,
  signOutUser,
} from '../firebase/userAuth'
import {
  saveUserAccount,
  subscribeToUserAccount,
  subscribeToUserOrders,
  subscribeToUserReturns,
} from '../firebase/storeData'
import { getCustomerCouponUsage } from '../firebase/customerData'

const PRODUCT_HASH_PREFIX = '#product-'
const REVIEWS_HASH_SUFFIX = '-reviews'
const CHECKOUT_HASH = '#checkout'
const ORDER_SUCCESS_HASH = '#order-success'
const ORDER_SUCCESS_SESSION_KEY = 'pride_last_successful_order'

function formatVerifiedPaymentMethod(payment, fallback, gatewayLabel = 'Razorpay Test Mode') {
  if (!payment?.method) return fallback || 'Razorpay Test Mode'
  const labels = {
    card: 'Card',
    upi: 'UPI',
    netbanking: 'Net Banking',
    wallet: 'Wallet',
    emi: 'EMI',
    paylater: 'Pay Later',
  }
  const provider = payment.bank || payment.wallet
  const method = labels[payment.method] || payment.method
  return `${method}${provider ? ` (${provider})` : ''} via ${gatewayLabel}`
}

function formatVerifiedPaymentStatus(status) {
  if (status === 'captured') return 'Paid'
  if (status === 'authorized') return 'Authorized'
  if (!status) return 'Paid'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function getSessionItems(key, fallback) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || 'null') || fallback
  } catch {
    return fallback
  }
}

function mergeUserOrders(localOrders, sharedOrders, user) {
  if (!sharedOrders.length) return localOrders
  const sharedById = new Map(
    sharedOrders.map((order) => [String(order.id), order]),
  )
  const localIds = new Set(localOrders.map((order) => String(order.id)))
  const syncedOrders = localOrders.map((order) => {
    const sharedOrder = sharedById.get(String(order.id))
    return sharedOrder ? { ...order, ...sharedOrder } : order
  })
  if (!user) return syncedOrders

  const userEmail = String(user.email || '').trim().toLowerCase()
  const userName = String(user.name || '').trim().toLowerCase()
  const ownedOrders = sharedOrders.filter((order) => {
    if (localIds.has(String(order.id))) return false
    const orderEmail = String(order.email || '').trim().toLowerCase()
    const orderCustomer = String(order.customer || '').trim().toLowerCase()
    return (
      (userEmail && orderEmail === userEmail) ||
      (!orderEmail && userName && orderCustomer === userName)
    )
  })
  return [...ownedOrders, ...syncedOrders]
}

export default function UserApp({
  products = [],
  orders: sharedOrders = [],
  returns: sharedReturnRequests = [],
  coupons = [],
  marketingSettings,
  shippingSettings,
  invoiceSettings = initialInvoiceSettings,
  adminSettings = initialAdminSettings,
  categories = [],
  reviews = [],
  onNewOrder,
  onCreateReturnRequest,
  onCancelOrder,
  onSubmitOrderFeedback,
  onCustomerAuthenticated,
  onBeSellerClick,
}) {
  const cart = useCart(null, products)
  const hydrateCart = cart.hydrate
  const cartPersistence = cart.persistence
  const cartPersistenceRef = useRef(cartPersistence)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [sortBy, setSortBy] = useState('popular')
  const [likedIds, setLikedIds] = useState([])
  const likedIdsRef = useRef(likedIds)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutCouponCode, setCheckoutCouponCode] = useState('')
  const [successfulOrder, setSuccessfulOrder] = useState(null)
  const [orderToViewId, setOrderToViewId] = useState(null)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [pendingCart, setPendingCart] = useState(false)
  const [pendingWishlistRequest, setPendingWishlistRequest] = useState(null)
  const [accountSection, setAccountSection] = useState(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [localOrders, setOrders] = useState([])
  const [savedAddresses, setSavedAddresses] = useState([])
  const [savedPayments, setSavedPayments] = useState([])
  const [userReturns, setUserReturns] = useState([])
  const [couponUsage, setCouponUsage] = useState({})
  const [toast, setToast] = useState('')
  const toastTimer = useRef(null)
  const onCustomerAuthenticatedRef = useRef(onCustomerAuthenticated)
  const accountHydrated = useRef(false)
  const accountSaveTimer = useRef(null)
  const accountSnapshot = useRef('')
  const cartReturnSection = useRef(null)
  const cartHistoryActive = useRef(false)
  const productReturnSection = useRef(null)
  const productHistoryActive = useRef(false)
  const checkoutHistoryActive = useRef(false)
  const orderSuccessHistoryActive = useRef(false)
  const orders = useMemo(
    () => mergeUserOrders(localOrders, sharedOrders, user),
    [localOrders, sharedOrders, user],
  )
  const returnRequests = user ? userReturns : sharedReturnRequests
  const customerEmail = user?.email || ''
  const customerCoupons = useMemo(
    () =>
      coupons.map((coupon) => ({
        ...coupon,
        usageBy: customerEmail
          ? { [customerEmail.trim().toLowerCase()]: Number(couponUsage[coupon.code] || 0) }
          : {},
      })),
    [couponUsage, coupons, customerEmail],
  )

  useEffect(() => {
    cartPersistenceRef.current = cartPersistence
    likedIdsRef.current = likedIds
  }, [cartPersistence, likedIds])

  useEffect(() => {
    const handleHistoryBack = () => {
      if (window.location.hash === ORDER_SUCCESS_HASH) {
        const savedOrder = getSessionItems(ORDER_SUCCESS_SESSION_KEY, null)
        if (savedOrder) {
          orderSuccessHistoryActive.current = true
          setSuccessfulOrder(savedOrder)
          setOrders((current) =>
            current.some((order) => order.id === savedOrder.id)
              ? current
              : [savedOrder, ...current],
          )
          setCheckoutOpen(false)
          setAccountSection(null)
          window.scrollTo({ top: 0, behavior: 'auto' })
          return
        }
      }
      if (orderSuccessHistoryActive.current) {
        setSuccessfulOrder(null)
        orderSuccessHistoryActive.current = false
      }
      if (window.location.hash === CHECKOUT_HASH) {
        checkoutHistoryActive.current = true
        setCheckoutOpen(true)
        setAccountSection(null)
        window.scrollTo({ top: 0, behavior: 'auto' })
        return
      }
      if (checkoutHistoryActive.current) {
        setCheckoutOpen(false)
        checkoutHistoryActive.current = false
      }
      if (window.location.hash.startsWith(PRODUCT_HASH_PREFIX)) {
        const productPath = window.location.hash.slice(
          PRODUCT_HASH_PREFIX.length,
        )
        const isReviewsPage = productPath.endsWith(REVIEWS_HASH_SUFFIX)
        const productId = decodeURIComponent(
          isReviewsPage
            ? productPath.slice(0, -REVIEWS_HASH_SUFFIX.length)
            : productPath,
        )
        const historyProduct = products.find(
          (product) => String(product.id) === productId,
        )
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
      if (
        cartHistoryActive.current &&
        window.location.hash !== '#account-cart'
      ) {
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

  useEffect(() => {
    onCustomerAuthenticatedRef.current = onCustomerAuthenticated
  }, [onCustomerAuthenticated])

  useEffect(
    () =>
      observeUserSession(
        (authenticatedUser) => {
          setUser(authenticatedUser)
          if (authenticatedUser) {
            onCustomerAuthenticatedRef.current?.(authenticatedUser)
          }
        },
        (error) => {
          setUser(null)
          setToast(error.message)
          clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(''), 4200)
        },
      ),
    [],
  )

  useEffect(() => {
    accountHydrated.current = false
    accountSnapshot.current = ''
    if (!user?.uid) {
      return undefined
    }

    const handleError = (error) => {
      setToast(error.message || 'Unable to load your Firebase account data.')
      clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToast(''), 4200)
    }
    const unsubscribers = [
      subscribeToUserAccount(
        user.uid,
        (account) => {
          const guestCart = cartPersistenceRef.current
          const remoteCart = account.cartItems || []
          const cartByProduct = new Map(
            [...remoteCart, ...(guestCart.cartItems || [])].map((item) => [
              String(item.productId),
              item,
            ]),
          )
          const mergedCartItems = [...cartByProduct.values()]
          const savedProductIds = new Set(
            [...(account.savedCartItems || []), ...(guestCart.savedCartItems || [])]
              .map((item) => item.productId || item)
              .filter((productId) => !cartByProduct.has(String(productId)))
              .map(String),
          )
          const nextAccount = {
            wishlistIds: [...new Set([...(account.wishlistIds || []), ...likedIdsRef.current])],
            addresses: (account.addresses || []).map(normalizeAddress),
            paymentMethods: account.paymentMethods || [],
            cartItems: mergedCartItems,
            savedCartItems: [...savedProductIds].map((productId) => ({ productId })),
          }
          accountSnapshot.current = JSON.stringify({
            wishlistIds: account.wishlistIds || [],
            addresses: (account.addresses || []).map(normalizeAddress),
            paymentMethods: account.paymentMethods || [],
            cartItems: remoteCart,
            savedCartItems: account.savedCartItems || [],
          })
          setLikedIds(nextAccount.wishlistIds)
          setSavedAddresses(nextAccount.addresses)
          setSavedPayments(nextAccount.paymentMethods)
          hydrateCart(nextAccount)
          accountHydrated.current = true
        },
        handleError,
      ),
      subscribeToUserOrders(user.uid, setOrders, handleError),
      subscribeToUserReturns(user.uid, setUserReturns, handleError),
    ]
    return () => {
      accountHydrated.current = false
      clearTimeout(accountSaveTimer.current)
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [user?.uid, hydrateCart])

  useEffect(() => {
    if (!user?.uid) return undefined
    let active = true
    getCustomerCouponUsage()
      .then((usage) => {
        if (active) setCouponUsage(usage)
      })
      .catch(() => {
        if (active) setCouponUsage({})
      })
    return () => {
      active = false
    }
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid || !accountHydrated.current) return undefined
    const account = {
      wishlistIds: likedIds,
      addresses: savedAddresses,
      paymentMethods: savedPayments,
      ...cartPersistence,
    }
    const serializedAccount = JSON.stringify(account)
    if (serializedAccount === accountSnapshot.current) return undefined
    accountSnapshot.current = serializedAccount
    clearTimeout(accountSaveTimer.current)
    accountSaveTimer.current = setTimeout(() => {
      void saveUserAccount(user.uid, account).catch((error) => {
        setToast(error.message || 'Unable to save your account changes.')
      })
    }, 350)
    return () => clearTimeout(accountSaveTimer.current)
  }, [cartPersistence, likedIds, savedAddresses, savedPayments, user?.uid])

  const filteredProducts = useMemo(() => {
    const matchingProducts = products
      .filter((product) => category === 'All' || product.category === category)
      .filter((product) => matchesProductQuery(product, query))

    return sortCatalogProducts(matchingProducts, sortBy)
  }, [products, query, category, sortBy])

  const suggestedProducts = useMemo(() => {
    const normalizedQuery = normalizeSearchQuery(query)
    const queryMatches = normalizedQuery
      ? products.filter((product) => matchesProductQuery(product, query))
      : []
    const popularProducts = [...products].sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) || b.rating - a.rating,
    )

    const uniqueProducts = new Map(
      [...queryMatches, ...popularProducts].map((product) => [
        product.id,
        product,
      ]),
    )

    return [...uniqueProducts.values()].slice(0, 4)
  }, [products, query])

  const resetToStorefront = () => {
    if (window.location.hash) {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      )
    }
    orderSuccessHistoryActive.current = false
    checkoutHistoryActive.current = false
    productHistoryActive.current = false
    productReturnSection.current = null
    cartHistoryActive.current = false
    cartReturnSection.current = null
    setOrderToViewId(null)
    setSuccessfulOrder(null)
    setCheckoutOpen(false)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setAccountSection(null)
  }

  const navigateHome = () => {
    resetToStorefront()
    setQuery('')
    setCategory('All')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCategory = (nextCategory) => {
    resetToStorefront()
    setQuery('')
    setCategory(nextCategory)
    requestAnimationFrame(() =>
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }),
    )
  }

  const handleSearchSubmit = (nextQuery) => {
    resetToStorefront()
    setQuery(nextQuery)
    setCategory('All')
    requestAnimationFrame(() =>
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }),
    )
  }

  const handleLike = (productId) => {
    if (!user) {
      setPendingWishlistRequest({ productId })
      setAuthOpen(true)
      notify('Please login or sign up to save products to your wishlist')
      return
    }
    setLikedIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }

  const relatedProducts = useMemo(() => {
    if (!selectedProduct) return []
    const sameCategory = products.filter(
      (product) =>
        product.id !== selectedProduct.id &&
        product.category === selectedProduct.category,
    )
    const otherRelevant = products
      .filter(
        (product) =>
          product.id !== selectedProduct.id &&
          product.category !== selectedProduct.category,
      )
      .sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || b.rating - a.rating,
      )
    return [...sameCategory, ...otherRelevant].slice(0, 4)
  }, [products, selectedProduct])
  const selectedProductReviews = useMemo(
    () =>
      selectedProduct
        ? reviews.filter(
            (review) => String(review.productId) === String(selectedProduct.id),
          )
        : [],
    [reviews, selectedProduct],
  )

  const handleAdd = (product, quantity = 1) => {
    const added = cart.add(product, quantity)
    if (!added) {
      notify(`${product.name} is currently out of stock`)
      return
    }
    notify(
      `${quantity > 1 ? `${quantity} x ` : ''}${product.name} added to your cart`,
    )
  }

  const navigateToProduct = (product) => {
    if (!productHistoryActive.current)
      productReturnSection.current = accountSection
    productHistoryActive.current = true
    const productHash = `${PRODUCT_HASH_PREFIX}${encodeURIComponent(product.id)}`
    if (window.location.hash !== productHash)
      window.history.pushState({ prideProduct: product.id }, '', productHash)
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
    if (window.location.hash !== reviewsHash)
      window.history.pushState(
        { prideProductReviews: selectedProduct.id },
        '',
        reviewsHash,
      )
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

  const navigateToCheckout = () => {
    if (window.location.hash !== CHECKOUT_HASH)
      window.history.pushState({ prideCheckout: true }, '', CHECKOUT_HASH)
    checkoutHistoryActive.current = true
    setCheckoutOpen(true)
    setAccountSection(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeCheckout = () => {
    if (window.location.hash === CHECKOUT_HASH) {
      window.history.back()
      return
    }
    setCheckoutOpen(false)
  }

  const closeOrderSuccess = () => {
    if (window.location.hash === ORDER_SUCCESS_HASH) {
      window.history.back()
      return
    }
    setSuccessfulOrder(null)
  }

  const viewSuccessfulOrder = () => {
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
    orderSuccessHistoryActive.current = false
    checkoutHistoryActive.current = false
    productHistoryActive.current = false
    productReturnSection.current = null
    cartHistoryActive.current = false
    cartReturnSection.current = null
    setOrderToViewId(successfulOrder?.id || null)
    setSuccessfulOrder(null)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setAccountSection('orders')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBuyNow = (product, quantity) => {
    const added = cart.add(product, quantity)
    if (!added) {
      notify(`${product.name} is currently out of stock`)
      return
    }
    notify(`${product.name} is ready for checkout`)
    handleCheckout({ skipCartValidation: true })
  }

  const handleAuthSuccess = (authenticatedUser, mode) => {
    setUser(authenticatedUser)
    onCustomerAuthenticatedRef.current?.(authenticatedUser)
    notify(
      mode === 'signup'
        ? authenticatedUser.verificationEmailSent
          ? `Welcome to Pride, ${authenticatedUser.name.split(' ')[0]}! Check your email to verify your account.`
          : `Welcome to Pride, ${authenticatedUser.name.split(' ')[0]}!`
        : authenticatedUser.verificationEmailSent
          ? `Welcome back, ${authenticatedUser.name.split(' ')[0]}! Verify your email to enable mobile login.`
          : `Welcome back, ${authenticatedUser.name.split(' ')[0]}!`,
    )
    if (pendingCheckout) {
      setPendingCheckout(false)
      navigateToCheckout()
    }
    if (pendingCart) {
      setPendingCart(false)
      cartReturnSection.current = null
      cartHistoryActive.current = true
      if (window.location.hash !== '#account-cart') {
        window.history.pushState({ prideAccount: 'cart' }, '', '#account-cart')
      }
      setAccountSection('cart')
    }
    if (pendingWishlistRequest) {
      if (pendingWishlistRequest.productId != null) {
        setLikedIds((current) =>
          current.includes(pendingWishlistRequest.productId)
            ? current
            : [...current, pendingWishlistRequest.productId],
        )
      }
      setPendingWishlistRequest(null)
      setAccountSection('wishlist')
    }
  }

  const handleUpdateUser = async (updatedUser) => {
    try {
      const savedUser = await saveUserProfile(updatedUser)
      const nextUser = {
        ...savedUser,
        photo: updatedUser.photo || savedUser.photo,
      }
      setUser(nextUser)
      onCustomerAuthenticatedRef.current?.(nextUser)
      notify(
        savedUser.emailChangePending
          ? 'Profile updated. Verify the new email address before it changes.'
          : 'Profile updated successfully',
      )
    } catch (error) {
      notify(error.message || 'Unable to update your profile.')
    }
  }

  const persistAddresses = (nextAddresses) => {
    setSavedAddresses(nextAddresses)
  }

  const handleSaveAddress = (address) => {
    const normalizedAddress = normalizeAddress(address)
    const exists = savedAddresses.some((item) => item.id === normalizedAddress.id)
    let next = exists
      ? savedAddresses.map((item) =>
          item.id === normalizedAddress.id ? normalizedAddress : item,
        )
      : [
          ...savedAddresses,
          { ...normalizedAddress, id: `address-${Date.now()}` },
        ]
    const savedAddress =
      next.find((item) => item.id === normalizedAddress.id) || next[next.length - 1]
    if (savedAddress.isDefault || next.length === 1)
      next = next.map((item) => ({
        ...item,
        isDefault: item.id === savedAddress.id,
      }))
    persistAddresses(next)
    notify(
      exists ? 'Address updated successfully' : 'Address saved successfully',
    )
    return next.find((item) => item.id === savedAddress.id)
  }

  const handleDeleteAddress = (addressId) => {
    const filtered = savedAddresses.filter((item) => item.id !== addressId)
    if (filtered.length && !filtered.some((item) => item.isDefault))
      filtered[0] = { ...filtered[0], isDefault: true }
    persistAddresses(filtered)
    notify('Address deleted')
  }

  const handleDefaultAddress = (addressId) => {
    persistAddresses(
      savedAddresses.map((item) => ({
        ...item,
        isDefault: item.id === addressId,
      })),
    )
    notify('Default delivery address updated')
  }

  const persistPayments = (nextPayments) => {
    setSavedPayments(nextPayments)
  }

  const handleSavePayment = (payment) => {
    const exists = savedPayments.some((item) => item.id === payment.id)
    let next = exists
      ? savedPayments.map((item) => (item.id === payment.id ? payment : item))
      : [...savedPayments, { ...payment, id: `payment-${Date.now()}` }]
    const savedPayment =
      next.find((item) => item.id === payment.id) || next[next.length - 1]
    if (savedPayment.isDefault || next.length === 1)
      next = next.map((item) => ({
        ...item,
        isDefault: item.id === savedPayment.id,
      }))
    persistPayments(next)
    notify(exists ? 'Payment method updated' : 'Payment method saved securely')
  }

  const handleDeletePayment = (paymentId) => {
    const filtered = savedPayments.filter((item) => item.id !== paymentId)
    if (filtered.length && !filtered.some((item) => item.isDefault))
      filtered[0] = { ...filtered[0], isDefault: true }
    persistPayments(filtered)
    notify('Payment method deleted')
  }

  const handleDefaultPayment = (paymentId) => {
    persistPayments(
      savedPayments.map((item) => ({
        ...item,
        isDefault: item.id === paymentId,
      })),
    )
    notify('Default payment method updated')
  }

  const handleLogout = async () => {
    if (window.location.hash === '#account-cart') {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      )
      cartReturnSection.current = null
      cartHistoryActive.current = false
    }
    try {
      await signOutUser()
    } finally {
      accountHydrated.current = false
      accountSnapshot.current = ''
      clearTimeout(accountSaveTimer.current)
      setOrders([])
      setUserReturns([])
      setLikedIds([])
      setSavedAddresses([])
      setSavedPayments([])
      setCouponUsage({})
      hydrateCart({})
      setUser(null)
      setAccountSection(null)
      notify('You have been logged out successfully')
    }
  }

  const handleProfileSelect = (section) => {
    setOrderToViewId(null)
    if (section === 'cart') {
      navigateToCart()
      return
    }
    setAccountSection(section)
  }

  const openWishlist = () => {
    if (user) {
      setAccountSection('wishlist')
      return
    }
    setPendingWishlistRequest({ productId: null })
    setAuthOpen(true)
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
    setOrderToViewId(null)
    if (nextSection === 'cart') {
      navigateToCart()
      return
    }
    if (window.location.hash === '#account-cart') {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}`,
      )
      cartReturnSection.current = null
      cartHistoryActive.current = false
    }
    setAccountSection(nextSection)
  }

  const closeAccountPanel = () => {
    setOrderToViewId(null)
    if (window.location.hash === '#account-cart') {
      window.history.back()
      return
    }
    setAccountSection(null)
  }

  const handleAccountCheckout = (checkoutOptions) => {
    setAccountSection(null)
    handleCheckout(checkoutOptions)
  }

  const handleCheckout = ({ couponCode = '', skipCartValidation = false } = {}) => {
    setCheckoutCouponCode(couponCode)
    if (
      !skipCartValidation &&
      (
      !cart.items.length ||
      cart.issues.hasOutOfStock ||
      cart.issues.removedProductCount > 0
      )
    ) {
      notify('Review unavailable or updated cart items before checkout')
      return
    }
    if (user) {
      navigateToCheckout()
      return
    }
    setPendingCheckout(true)
    setAuthOpen(true)
    notify('Please login or sign up to continue to checkout')
  }

  const handlePlaceOrder = async (checkoutDetails = {}) => {
    const verifiedPayment = checkoutDetails.verifiedPayment
    const verifiedAmount = Number(verifiedPayment?.amount)
    const gatewayLabel = adminSettings.payment.testMode
      ? 'Razorpay Test Mode'
      : 'Razorpay'
    const selectedPaymentMethod = checkoutDetails.payment?.type
      ? `${checkoutDetails.payment.type} via ${gatewayLabel}`
      : gatewayLabel
    const order = {
      id: `${adminSettings.store.orderPrefix || 'ORD'}-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: user?.name || 'Pride customer',
      email: user?.email || '',
      date: new Date().toISOString().slice(0, 10),
      total: formatCurrency(
        Number.isFinite(verifiedAmount)
          ? verifiedAmount / 100
          : checkoutDetails.total ?? cart.subtotal,
      ),
      discount: checkoutDetails.discount || 0,
      deliveryCharges: checkoutDetails.shipping || 0,
      taxAmount: checkoutDetails.tax || 0,
      couponCode: checkoutDetails.couponCode || '',
      invoiceNumber: createInvoiceNumber(invoiceSettings, new Date()),
      itemsCount: cart.count,
      status: 'Pending',
      orderTime: new Date().toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      }),
      deliveryDate:
        checkoutDetails.delivery?.estimatedDate || 'Being scheduled',
      deliveryOption: checkoutDetails.delivery?.name || 'Standard delivery',
      paymentStatus: checkoutDetails.cod
        ? 'Pending'
        : formatVerifiedPaymentStatus(verifiedPayment?.status),
      paymentDate: verifiedPayment?.createdAt
        ? new Date(verifiedPayment.createdAt * 1000).toISOString()
        : new Date().toISOString(),
      shippingAddress: checkoutDetails.address || null,
      paymentMethod: checkoutDetails.cod
        ? 'Cash on Delivery'
        : formatVerifiedPaymentMethod(
            verifiedPayment,
            checkoutDetails.razorpay ? selectedPaymentMethod : 'Online payment',
            gatewayLabel,
          ),
      paymentEnvironment: checkoutDetails.cod
        ? 'Cash on Delivery'
        : gatewayLabel,
      razorpayPaymentId:
        verifiedPayment?.id ||
        checkoutDetails.razorpay?.razorpay_payment_id ||
        '',
      razorpayOrderId:
        verifiedPayment?.orderId ||
        checkoutDetails.razorpay?.razorpay_order_id ||
        '',
      items: cart.items.map(({ product, quantity }) => ({
        productId: product.id,
        sku: product.sku || `PE-${String(product.id).padStart(4, '0')}`,
        productName: product.name,
        variant: product.variant || product.specification || '',
        image: product.image,
        qty: quantity,
        price: product.price,
        unitPrice: product.originalPrice || product.price,
        discount:
          Math.max(
            0,
            parsePrice(product.originalPrice || product.price) -
              parsePrice(product.price),
          ) * quantity,
        taxRate: product.taxRate ?? invoiceSettings.tax.defaultRate,
      })),
    }
    const savedOrder = (await onNewOrder?.(order)) || order
    setOrders((current) =>
      current.some((item) => item.id === savedOrder.id)
        ? current
        : [savedOrder, ...current],
    )
    if (savedOrder.couponCode) {
      setCouponUsage((current) => ({
        ...current,
        [savedOrder.couponCode]: Number(current[savedOrder.couponCode] || 0) + 1,
      }))
    }
    cart.clear()
    setCheckoutOpen(false)
    checkoutHistoryActive.current = false
    sessionStorage.setItem(ORDER_SUCCESS_SESSION_KEY, JSON.stringify(savedOrder))
    orderSuccessHistoryActive.current = true
    window.history.replaceState(
      { prideOrderSuccess: savedOrder.id },
      '',
      ORDER_SUCCESS_HASH,
    )
    setSuccessfulOrder(savedOrder)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    notify(`Order ${savedOrder.id} placed successfully`)
    return savedOrder
  }

  const handleCancelUserOrder = async (orderId) => {
    const order = orders.find((item) => item.id === orderId)
    if (!order || !['Pending', 'Confirmed', 'Processing'].includes(order.status)) {
      notify('This order can no longer be cancelled')
      return false
    }
    try {
      const savedOrder = await onCancelOrder?.(orderId)
      if (savedOrder) {
        setOrders((current) =>
          current.map((item) => (item.id === orderId ? savedOrder : item)),
        )
      }
      notify(`Order ${orderId} cancelled successfully`)
      return true
    } catch (error) {
      notify(error.message || 'Unable to cancel the order')
      return false
    }
  }

  const handleSubmitFeedback = async (orderId, feedback) => {
    try {
      await onSubmitOrderFeedback?.(orderId, feedback)
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, feedback } : order,
        ),
      )
      notify('Thank you. Your feedback was submitted successfully')
    } catch (error) {
      notify(error.message || 'Unable to submit your feedback')
    }
  }

  const handleCreateReturnRequest = async (orderId, details) => {
    try {
      const request = await onCreateReturnRequest?.(orderId, details)
      if (request) {
        setUserReturns((current) =>
          current.some((item) => item.id === request.id)
            ? current
            : [request, ...current],
        )
        notify('Return request submitted successfully')
      }
      return request
    } catch (error) {
      notify(error.message || 'Unable to submit the return request')
      return null
    }
  }

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f7f8f5] pb-16 lg:pb-0">
      <AnnouncementBar shippingSettings={shippingSettings} />
      <Header
        products={products}
        categories={categories}
        searchQuery={query}
        user={user}
        cartCount={cart.count}
        wishlistCount={user ? likedIds.length : 0}
        accountSection={accountSection}
        onHome={navigateHome}
        onCartOpen={navigateToCart}
        onWishlistOpen={openWishlist}
        onSearch={setQuery}
        onSearchSubmit={handleSearchSubmit}
        onProductSelect={navigateToProduct}
        onAuthOpen={() => setAuthOpen(true)}
        onCategoryChange={handleCategory}
        onProfileSelect={handleProfileSelect}
        onLogout={() => setLogoutConfirmOpen(true)}
      />
      <main>
        {successfulOrder ? (
          <OrderSuccessPage
            order={successfulOrder}
            onContinueShopping={closeOrderSuccess}
            onViewOrders={viewSuccessfulOrder}
          />
        ) : checkoutOpen ? (
          <CheckoutPage
            key={`${savedAddresses.find((address) => address.isDefault)?.id || 'no-address'}-${savedPayments.find((payment) => payment.isDefault)?.id || 'no-payment'}`}
            items={cart.items}
            initialCouponCode={checkoutCouponCode}
            coupons={customerCoupons}
            savedAddresses={savedAddresses}
            savedPayments={savedPayments}
            user={user}
            onSaveAddress={handleSaveAddress}
            onBack={closeCheckout}
            onPlaceOrder={handlePlaceOrder}
            shippingSettings={shippingSettings}
            taxSettings={invoiceSettings.tax}
            paymentSettings={adminSettings.payment}
            storeName={adminSettings.store.name}
          />
        ) : selectedProduct && reviewsOpen ? (
          <ProductReviewsPage product={selectedProduct} reviews={selectedProductReviews} onBack={closeReviews} />
        ) : selectedProduct ? (
          <ProductDetailsPage
            key={selectedProduct.id}
            product={selectedProduct}
            relatedProducts={relatedProducts}
            deliveryAddress={
              savedAddresses.find((address) => address.isDefault) ||
              savedAddresses[0]
            }
            likedIds={user ? likedIds : []}
            onBack={closeProductDetails}
            onLike={handleLike}
            onAdd={handleAdd}
            onBuyNow={handleBuyNow}
            onViewProduct={navigateToProduct}
            onViewAllReviews={navigateToReviews}
            shippingSettings={shippingSettings}
            taxSettings={invoiceSettings.tax}
            reviews={selectedProductReviews}
          />
        ) : (
          <>
            <HeroSection
              banner={marketingSettings?.homeBanner}
              onShopNow={() =>
                document
                  .getElementById('catalog')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            />
            <CategoryStrip
              promotions={marketingSettings?.categoryPromotions}
              managedCategories={categories}
              onSelect={handleCategory}
            />
            <BenefitsStrip shippingSettings={shippingSettings} />
            <ProductCatalog
              products={filteredProducts}
              suggestedProducts={suggestedProducts}
              onSuggestedCategoryChange={handleCategory}
              activeCategory={category}
              onCategoryChange={setCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              likedIds={user ? likedIds : []}
              onLike={handleLike}
              onAdd={handleAdd}
              onBuyNow={handleBuyNow}
              onView={navigateToProduct}
              offers={marketingSettings}
              categoryNames={categories.filter((item) => item.enabled !== false).map((item) => item.name)}
            />
            <PromoBanner
              banner={marketingSettings?.promotionalBanner}
              onShopNow={() =>
                user ? setAccountSection('profile') : setAuthOpen(true)
              }
            />
          </>
        )}
      </main>
      <Footer onBeSellerClick={onBeSellerClick} />

      <AuthModal
        open={authOpen}
        onClose={() => {
          setAuthOpen(false)
          setPendingCheckout(false)
          setPendingCart(false)
          setPendingWishlistRequest(null)
        }}
        onSuccess={handleAuthSuccess}
      />
      {user && (
        <AccountPanel
          key={orderToViewId || 'account-panel'}
          section={accountSection}
          user={user}
          wishlistProducts={products.filter((product) =>
            likedIds.includes(product.id),
          )}
          orders={orders}
          returnRequests={returnRequests}
          coupons={customerCoupons}
          initialOrderId={orderToViewId}
          cartItems={cart.items}
          savedCartItems={cart.savedItems}
          cartIssues={cart.issues}
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
          onSaveCartItem={cart.saveForLater}
          onMoveSavedItemToCart={cart.moveToCart}
          onRemoveSavedItem={cart.removeSaved}
          onDismissUnavailableCartItems={cart.removeUnavailable}
          onSaveAddress={handleSaveAddress}
          onDeleteAddress={handleDeleteAddress}
          onSetDefaultAddress={handleDefaultAddress}
          onSavePayment={handleSavePayment}
          onDeletePayment={handleDeletePayment}
          onSetDefaultPayment={handleDefaultPayment}
          onCheckout={handleAccountCheckout}
          onCreateReturnRequest={handleCreateReturnRequest}
          onCancelOrder={handleCancelUserOrder}
          onSubmitOrderFeedback={handleSubmitFeedback}
          onLogout={handleLogout}
          shippingSettings={shippingSettings}
          invoiceSettings={invoiceSettings}
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

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-full bg-slate-950 px-5 py-3.5 text-xs font-bold text-white shadow-2xl">
          <CheckCircle2 size={17} className="shrink-0 text-[#8fd0a4]" />
          <span className="flex-1 truncate">{toast}</span>
          <button type="button" onClick={() => setToast('')}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
