import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import AnnouncementBar from './components/layout/AnnouncementBar'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import HeroSection from './components/home/HeroSection'
import CategoryStrip from './components/home/CategoryStrip'
import BenefitsStrip from './components/home/BenefitsStrip'
import PromoBanner from './components/home/PromoBanner'
import HomeScrollReveal from './components/home/HomeScrollReveal'
import ProductCatalog from './components/products/ProductCatalog'
import ProductDetailsPage from './components/products/ProductDetailsPage'
import ProductReviewsPage from './components/products/ProductReviewsPage'
import ProductsPage from './components/products/ProductsPage'
import ContactUs from './components/pages/ContactUs'
import PrivacyPolicy from './components/pages/PrivacyPolicy'
import RefundAndCancellationPolicy from './components/pages/RefundAndCancellationPolicy'
import ShippingAndDeliveryPolicy from './components/pages/ShippingAndDeliveryPolicy'
import TermsAndConditions from './components/pages/TermsAndConditions'
import AuthModal from './components/auth/AuthModal'
import PasswordResetModal from './components/auth/PasswordResetModal'
import CheckoutPage from './components/checkout/CheckoutPage'
import OrderSuccessPage from './components/checkout/OrderSuccessPage'
import AccountPanel, {
  LogoutConfirmation,
} from './components/profile/AccountPanel'
import { useCart } from './hooks/useCart'
import { formatCurrency, hasValidPrice } from './utils/currency'
import {
  matchesProductQuery,
  normalizeSearchQuery,
} from './utils/productSearch'
import { sortCatalogProducts } from './utils/catalog'
import { normalizeAddress } from './utils/address'
import { getOrderDisplayId } from '../utils/orderIdentifiers'
import {
  emptyAccountState,
  removeSavedAddress,
  mergeInitialGuestAccount,
  normalizeAccountState,
  setDefaultSavedAddress,
  upsertSavedAddress,
} from './utils/accountState'
import {
  CHECKOUT_PATH,
  getProtectedPathForSection,
  getProtectedRoute,
} from './utils/protectedRoutes'
import { transitionAccountSession } from './utils/accountSession'
import { initialInvoiceSettings } from '../data/invoice'
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
import {
  productHasVariants,
  variantCartKey,
} from '../utils/productVariants'
import {
  checkoutItemRequest,
  createBuyNowSelection,
  normalizeCheckoutSelection,
  removePurchasedItems,
  resolveCheckoutSelection,
} from './utils/checkoutSelection'

const PRODUCT_HASH_PREFIX = '#product-'
const PRODUCTS_HASH_PREFIX = '#products'
const REVIEWS_HASH_SUFFIX = '-reviews'
const CHECKOUT_HASH = '#checkout'
const ORDER_SUCCESS_HASH = '#order-success'
const ORDER_SUCCESS_SESSION_KEY = 'pride_last_successful_order'
const INTENDED_ROUTE_SESSION_KEY = 'pride_intended_protected_route'
const CHECKOUT_SELECTION_SESSION_KEY = 'pride_checkout_selection'
const CONTENT_PAGE_HASHES = {
  privacy: '#privacy-policy',
  terms: '#terms-and-conditions',
  refunds: '#refund-and-cancellation-policy',
  shipping: '#shipping-and-delivery-policy',
  contact: '#contact-us',
}
const CONTENT_PAGE_COMPONENTS = {
  privacy: PrivacyPolicy,
  terms: TermsAndConditions,
  refunds: RefundAndCancellationPolicy,
  shipping: ShippingAndDeliveryPolicy,
  contact: ContactUs,
}

function getContentPageFromHash(hash) {
  return Object.keys(CONTENT_PAGE_HASHES).find(
    (page) => CONTENT_PAGE_HASHES[page] === hash,
  )
}

function createProductsHash(category = 'All', query = '') {
  const params = new URLSearchParams()
  if (category && category !== 'All') params.set('category', category)
  if (query.trim()) params.set('query', query.trim())
  const search = params.toString()
  return `${PRODUCTS_HASH_PREFIX}${search ? `?${search}` : ''}`
}

function parseProductsHash(hash) {
  if (hash !== PRODUCTS_HASH_PREFIX && !hash.startsWith(`${PRODUCTS_HASH_PREFIX}?`)) {
    return null
  }
  const queryString = hash.slice(PRODUCTS_HASH_PREFIX.length + 1)
  const params = new URLSearchParams(queryString)
  return {
    category: params.get('category') || 'All',
    query: params.get('query') || '',
  }
}

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

export default function UserApp({
  products = [],
  productsLoading = false,
  productsError = '',
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
  const [productsOpen, setProductsOpen] = useState(false)
  const [contentPage, setContentPage] = useState(null)
  const [likedIds, setLikedIds] = useState([])
  const likedIdsRef = useRef(likedIds)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authInitialMode, setAuthInitialMode] = useState('login')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutSelection, setCheckoutSelection] = useState(() =>
    normalizeCheckoutSelection(
      getSessionItems(CHECKOUT_SELECTION_SESSION_KEY, null),
    ),
  )
  const [checkoutCouponCode, setCheckoutCouponCode] = useState('')
  const [successfulOrder, setSuccessfulOrder] = useState(null)
  const [orderToViewId, setOrderToViewId] = useState(null)
  const [pendingCheckout, setPendingCheckout] = useState(false)
  const [pendingCart, setPendingCart] = useState(false)
  const [pendingWishlistRequest, setPendingWishlistRequest] = useState(null)
  const [accountSection, setAccountSection] = useState(null)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [authStatus, setAuthStatus] = useState('loading')
  const [accountReady, setAccountReady] = useState(false)
  const [accountError, setAccountError] = useState('')
  const [accountLoadAttempt, setAccountLoadAttempt] = useState(0)
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
  const accountStateRef = useRef(emptyAccountState())
  const remoteAccountRef = useRef(emptyAccountState())
  const pendingAccountSnapshot = useRef('')
  const accountSaveQueue = useRef(Promise.resolve())
  const accountSaveRevision = useRef(0)
  const cartReturnSection = useRef(null)
  const cartHistoryActive = useRef(false)
  const productReturnSection = useRef(null)
  const productHistoryActive = useRef(false)
  const productsHistoryActive = useRef(false)
  const productsReturnCatalog = useRef(null)
  const contentPageHistoryActive = useRef(false)
  const checkoutHistoryActive = useRef(false)
  const orderSuccessHistoryActive = useRef(false)
  const activeUserUid = useRef(null)
  const historyRouteSynced = useRef(false)

  const rememberIntendedRoute = (path) => {
    const route = getProtectedRoute(path)
    if (route) sessionStorage.setItem(INTENDED_ROUTE_SESSION_KEY, route.path)
  }

  const clearAuthenticatedState = useCallback(() => {
    accountHydrated.current = false
    accountSnapshot.current = ''
    clearTimeout(accountSaveTimer.current)
    cartPersistenceRef.current = emptyAccountState()
    likedIdsRef.current = []
    accountStateRef.current = emptyAccountState()
    remoteAccountRef.current = emptyAccountState()
    pendingAccountSnapshot.current = ''
    accountSaveRevision.current += 1
    activeUserUid.current = null
    sessionStorage.removeItem(ORDER_SUCCESS_SESSION_KEY)
    sessionStorage.removeItem(CHECKOUT_SELECTION_SESSION_KEY)
    setOrders([])
    setUserReturns([])
    setLikedIds([])
    setSavedAddresses([])
    setSavedPayments([])
    setCouponUsage({})
    setSuccessfulOrder(null)
    setOrderToViewId(null)
    setCheckoutOpen(false)
    setCheckoutSelection(null)
    setAccountSection(null)
    setLogoutConfirmOpen(false)
    setPendingCheckout(false)
    setPendingCart(false)
    setPendingWishlistRequest(null)
    hydrateCart({})
    setUser(null)
    setAccountReady(false)
    setAccountError('')
  }, [hydrateCart])
  const orders = localOrders
  const returnRequests = userReturns
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
  const activeCheckoutItems = useMemo(
    () =>
      checkoutSelection
        ? resolveCheckoutSelection(checkoutSelection, products)
        : cart.items,
    [cart.items, checkoutSelection, products],
  )

  useEffect(() => {
    cartPersistenceRef.current = cartPersistence
    likedIdsRef.current = likedIds
    accountStateRef.current = normalizeAccountState({
      wishlistIds: likedIds,
      addresses: savedAddresses,
      paymentMethods: savedPayments,
      ...cartPersistence,
    })
  }, [cartPersistence, likedIds, savedAddresses, savedPayments])

  useEffect(() => {
    const handleHistoryBack = (event) => {
      const shouldResetScroll =
        event?.type === 'popstate' || !historyRouteSynced.current
      historyRouteSynced.current = true
      const resetScroll = () => {
        if (shouldResetScroll) window.scrollTo({ top: 0, behavior: 'auto' })
      }
      const protectedRoute = getProtectedRoute(window.location.pathname)
      if (protectedRoute && authStatus === 'loading') return
      if (protectedRoute && authStatus === 'unauthenticated') {
        rememberIntendedRoute(protectedRoute.path)
        window.history.replaceState(
          { prideProtectedRedirect: protectedRoute.path },
          '',
          '/',
        )
        checkoutHistoryActive.current = false
        cartHistoryActive.current = false
        setCheckoutOpen(false)
        setSuccessfulOrder(null)
        setAccountSection(null)
        setAuthOpen(true)
        return
      }
      if (protectedRoute && authStatus === 'authenticated') {
        setSuccessfulOrder(null)
        setSelectedProduct(null)
        setReviewsOpen(false)
        setProductsOpen(false)
        setContentPage(null)
        if (protectedRoute.page === 'checkout') {
          checkoutHistoryActive.current = true
          setCheckoutOpen(true)
          setAccountSection(null)
        } else {
          checkoutHistoryActive.current = false
          setCheckoutOpen(false)
          setOrderToViewId(null)
          setAccountSection(protectedRoute.section)
        }
        resetScroll()
        return
      }
      const protectedHash = [
        CHECKOUT_HASH,
        ORDER_SUCCESS_HASH,
        '#account-cart',
      ].includes(window.location.hash)
      if (protectedHash && authStatus === 'loading') return
      if (protectedHash && authStatus === 'unauthenticated') {
        const intendedPath =
          window.location.hash === CHECKOUT_HASH
            ? CHECKOUT_PATH
            : window.location.hash === ORDER_SUCCESS_HASH
              ? '/orders'
              : '/cart'
        rememberIntendedRoute(intendedPath)
        window.history.replaceState(
          { prideProtectedRedirect: intendedPath },
          '',
          '/',
        )
        checkoutHistoryActive.current = false
        orderSuccessHistoryActive.current = false
        cartHistoryActive.current = false
        setCheckoutOpen(false)
        setSuccessfulOrder(null)
        setAccountSection(null)
        setAuthOpen(true)
        return
      }
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
          resetScroll()
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
        resetScroll()
        return
      }
      if (checkoutHistoryActive.current) {
        setCheckoutOpen(false)
        checkoutHistoryActive.current = false
      }
      const nextContentPage = getContentPageFromHash(window.location.hash)
      if (nextContentPage) {
        contentPageHistoryActive.current = true
        productHistoryActive.current = false
        productReturnSection.current = null
        setContentPage(nextContentPage)
        setProductsOpen(false)
        setSelectedProduct(null)
        setReviewsOpen(false)
        setAccountSection(null)
        resetScroll()
        return
      }
      if (contentPageHistoryActive.current) {
        setContentPage(null)
        contentPageHistoryActive.current = false
      }
      const productsRoute = parseProductsHash(window.location.hash)
      if (productsRoute) {
        const availableCategoryNames = categories
          .filter((item) => item.enabled !== false)
          .map((item) => item.name)
        productsHistoryActive.current = true
        productHistoryActive.current = false
        productReturnSection.current = null
        setProductsOpen(true)
        setCategory(
          availableCategoryNames.includes(productsRoute.category)
            ? productsRoute.category
            : 'All',
        )
        setQuery(productsRoute.query)
        setSelectedProduct(null)
        setReviewsOpen(false)
        setAccountSection(null)
        resetScroll()
        return
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
          resetScroll()
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
      if (productsHistoryActive.current) {
        setProductsOpen(false)
        productsHistoryActive.current = false
        if (productsReturnCatalog.current) {
          setQuery(productsReturnCatalog.current.query)
          setCategory(productsReturnCatalog.current.category)
          productsReturnCatalog.current = null
        }
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
  }, [authStatus, categories, products])

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
          if (authenticatedUser) {
            const session = transitionAccountSession(
              activeUserUid,
              authenticatedUser.uid,
            )
            if (session.shouldClearPreviousUser) {
              clearAuthenticatedState()
              // clearAuthenticatedState also clears the active UID.
              activeUserUid.current = authenticatedUser.uid
            }
            if (session.userChanged) {
              setAccountReady(false)
              setAccountError('')
            }
            setUser(authenticatedUser)
            setAuthStatus('authenticated')
            onCustomerAuthenticatedRef.current?.(authenticatedUser)
          } else {
            const previousUid = activeUserUid.current
            if (previousUid) clearAuthenticatedState()
            else setUser(null)
            activeUserUid.current = null
            setAuthStatus('unauthenticated')
          }
        },
        (error, { terminal = true } = {}) => {
          if (terminal) {
            clearAuthenticatedState()
            setAuthStatus('unauthenticated')
          }
          setToast(error.message)
          clearTimeout(toastTimer.current)
          toastTimer.current = setTimeout(() => setToast(''), 4200)
        },
      ),
    [clearAuthenticatedState],
  )

  useEffect(() => {
    accountHydrated.current = false
    accountSnapshot.current = ''
    if (!user?.uid) {
      return undefined
    }

    const handleError = () => {
      setToast('Unable to load your account data. Check your connection and try again.')
      clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setToast(''), 4200)
    }
    const handleAccountError = (error) => {
      if (error?.code === 'permission-denied') {
        clearAuthenticatedState()
        setAuthStatus('unauthenticated')
        setToast('This account has been disabled. Please contact support.')
        clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(''), 4200)
        void signOutUser().catch(() => undefined)
        return
      }
      setAccountError(
        'Unable to load your saved cart and account data. Check your connection and try again.',
      )
      handleError()
    }
    const unsubscribers = [
      subscribeToUserAccount(
        user.uid,
        (account) => {
          if (['disabled', 'suspended'].includes(
            String(account.status || '').trim().toLowerCase(),
          )) {
            clearAuthenticatedState()
            setAuthStatus('unauthenticated')
            setToast('This account has been disabled. Please contact support.')
            clearTimeout(toastTimer.current)
            toastTimer.current = setTimeout(() => setToast(''), 4200)
            void signOutUser().catch(() => undefined)
            return
          }
          setUser((current) => current?.uid === user.uid
            ? {
                ...current,
                gstDetails: account.gstDetails || null,
                gstProfiles: Array.isArray(account.gstProfiles) ? account.gstProfiles : [],
              }
            : current)
          const remoteAccount = normalizeAccountState(account)
          const remoteSnapshot = JSON.stringify(remoteAccount)
          remoteAccountRef.current = remoteAccount
          const keepPendingAccount =
            pendingAccountSnapshot.current &&
            pendingAccountSnapshot.current !== remoteSnapshot
          if (pendingAccountSnapshot.current === remoteSnapshot) {
            pendingAccountSnapshot.current = ''
          }
          const synchronizedAccount = keepPendingAccount
            ? accountStateRef.current
            : remoteAccount
          const nextAccount = accountHydrated.current
            ? synchronizedAccount
            : mergeInitialGuestAccount(synchronizedAccount, {
                wishlistIds: likedIdsRef.current,
                ...cartPersistenceRef.current,
              })
          accountSnapshot.current = JSON.stringify(
            accountHydrated.current ? nextAccount : remoteAccount,
          )
          accountStateRef.current = nextAccount
          setLikedIds(nextAccount.wishlistIds)
          setSavedAddresses(nextAccount.addresses)
          setSavedPayments(nextAccount.paymentMethods)
          hydrateCart(nextAccount)
          accountHydrated.current = true
          setAccountReady(true)
          setAccountError('')
        },
        handleAccountError,
      ),
      subscribeToUserOrders(user.uid, setOrders, handleError),
      subscribeToUserReturns(user.uid, setUserReturns, handleError),
    ]
    return () => {
      accountHydrated.current = false
      clearTimeout(accountSaveTimer.current)
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [user?.uid, hydrateCart, accountLoadAttempt, clearAuthenticatedState])

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
    pendingAccountSnapshot.current = serializedAccount
    const revision = ++accountSaveRevision.current
    const uid = user.uid
    clearTimeout(accountSaveTimer.current)
    accountSaveTimer.current = setTimeout(() => {
      const save = accountSaveQueue.current
        .catch(() => undefined)
        .then(() => saveUserAccount(uid, account))
      accountSaveQueue.current = save
      void save.catch((error) => {
        if (
          revision !== accountSaveRevision.current ||
          activeUserUid.current !== uid
        ) return
        pendingAccountSnapshot.current = ''
        const rollbackAccount = remoteAccountRef.current
        accountStateRef.current = rollbackAccount
        accountSnapshot.current = JSON.stringify(rollbackAccount)
        setLikedIds(rollbackAccount.wishlistIds)
        setSavedAddresses(rollbackAccount.addresses)
        setSavedPayments(rollbackAccount.paymentMethods)
        hydrateCart(rollbackAccount)
        setToast(error.message)
      })
    }, 350)
    return () => clearTimeout(accountSaveTimer.current)
  }, [cartPersistence, hydrateCart, likedIds, savedAddresses, savedPayments, user?.uid])

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
    if (window.location.hash || getProtectedRoute(window.location.pathname)) {
      window.history.replaceState(
        null,
        '',
        '/',
      )
    }
    orderSuccessHistoryActive.current = false
    checkoutHistoryActive.current = false
    productHistoryActive.current = false
    productReturnSection.current = null
    productsHistoryActive.current = false
    productsReturnCatalog.current = null
    contentPageHistoryActive.current = false
    cartHistoryActive.current = false
    cartReturnSection.current = null
    setOrderToViewId(null)
    setSuccessfulOrder(null)
    setCheckoutOpen(false)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setProductsOpen(false)
    setContentPage(null)
    setAccountSection(null)
  }

  const navigateHome = () => {
    resetToStorefront()
    setQuery('')
    setCategory('All')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateToContentPage = (page) => {
    const pageHash = CONTENT_PAGE_HASHES[page]
    if (!pageHash) return
    if (window.location.hash !== pageHash) {
      window.history.pushState(
        { prideContentPage: page, prideContentPageReturn: true },
        '',
        `/${pageHash}`,
      )
    }
    contentPageHistoryActive.current = true
    setSuccessfulOrder(null)
    setCheckoutOpen(false)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setProductsOpen(false)
    setAccountSection(null)
    setContentPage(page)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeContentPage = () => {
    if (
      getContentPageFromHash(window.location.hash) &&
      window.history.state?.prideContentPageReturn
    ) {
      window.history.back()
      return
    }
    navigateHome()
  }

  const navigateToProducts = (nextCategory = 'All', nextQuery = '') => {
    const productsHash = createProductsHash(nextCategory, nextQuery)
    if (!productsOpen) {
      productsReturnCatalog.current = { query, category }
    }
    if (window.location.hash !== productsHash) {
      window.history.pushState(
        {
          prideProducts: true,
          prideProductsReturn: true,
          category: nextCategory,
        },
        '',
        `/${productsHash}`,
      )
    }
    productsHistoryActive.current = true
    setSuccessfulOrder(null)
    setCheckoutOpen(false)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setContentPage(null)
    setAccountSection(null)
    setQuery(nextQuery)
    setCategory(nextCategory)
    setProductsOpen(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeProducts = () => {
    if (
      parseProductsHash(window.location.hash) &&
      window.history.state?.prideProductsReturn
    ) {
      window.history.back()
      return
    }
    setProductsOpen(false)
    navigateHome()
  }

  const handleHomeCategory = (nextCategory) => {
    setQuery('')
    setCategory(nextCategory)
    requestAnimationFrame(() =>
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }),
    )
  }

  const handleProductsCategory = (nextCategory) => {
    setCategory(nextCategory)
    const productsHash = createProductsHash(nextCategory, query)
    window.history.replaceState(
      {
        ...window.history.state,
        prideProducts: true,
        category: nextCategory,
      },
      '',
      `/${productsHash}`,
    )
    requestAnimationFrame(() =>
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }),
    )
  }

  const handleProductsSearch = (nextQuery) => {
    setQuery(nextQuery)
    window.history.replaceState(
      { ...window.history.state, prideProducts: true, category },
      '',
      `/${createProductsHash(category, nextQuery)}`,
    )
    requestAnimationFrame(() =>
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }),
    )
  }

  const handleSearchSubmit = (nextQuery) => {
    if (parseProductsHash(window.location.hash)) {
      setCategory('All')
      setQuery(nextQuery)
      window.history.replaceState(
        {
          ...window.history.state,
          prideProducts: true,
          category: 'All',
        },
        '',
        `/${createProductsHash('All', nextQuery)}`,
      )
      requestAnimationFrame(() =>
        document
          .getElementById('catalog')
          ?.scrollIntoView({ behavior: 'smooth' }),
      )
      return
    }
    navigateToProducts('All', nextQuery)
  }

  const handleLike = (productId) => {
    if (!user) {
      setPendingWishlistRequest({ productId })
      rememberIntendedRoute('/wishlist')
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

  const liveSelectedProduct = useMemo(
    () =>
      selectedProduct
        ? products.find(
            (product) => String(product.id) === String(selectedProduct.id),
          ) || selectedProduct
        : null,
    [products, selectedProduct],
  )
  const relatedProducts = useMemo(() => {
    if (!liveSelectedProduct) return []
    const sameCategory = products.filter(
      (product) =>
        product.id !== liveSelectedProduct.id &&
        product.category === liveSelectedProduct.category,
    )
    const otherRelevant = products
      .filter(
        (product) =>
          product.id !== liveSelectedProduct.id &&
          product.category !== liveSelectedProduct.category,
      )
      .sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) || b.rating - a.rating,
      )
    return [...sameCategory, ...otherRelevant].slice(0, 4)
  }, [products, liveSelectedProduct])
  const selectedProductReviews = useMemo(
    () =>
      liveSelectedProduct
        ? reviews.filter(
            (review) => String(review.productId) === String(liveSelectedProduct.id),
          )
        : [],
    [reviews, liveSelectedProduct],
  )

  const handleAdd = (product, quantity = 1) => {
    if (productHasVariants(product) && !product.selectedVariantId) {
      navigateToProduct(product)
      notify(`Select a variant for ${product.name} before adding it to your cart`)
      return
    }
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
      window.history.pushState({ prideProduct: product.id }, '', `/${productHash}`)
    setSelectedProduct(product)
    setReviewsOpen(false)
    setAccountSection(null)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeProductDetails = () => {
    if (window.location.hash.startsWith(PRODUCT_HASH_PREFIX)) {
      window.history.back()
      return
    }
    setSelectedProduct(null)
  }

  const navigateToReviews = () => {
    if (!liveSelectedProduct) return
    const reviewsHash = `${PRODUCT_HASH_PREFIX}${encodeURIComponent(liveSelectedProduct.id)}${REVIEWS_HASH_SUFFIX}`
    if (window.location.hash !== reviewsHash)
      window.history.pushState(
        { prideProductReviews: liveSelectedProduct.id },
        '',
        `/${reviewsHash}`,
      )
    setReviewsOpen(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeReviews = () => {
    if (window.location.hash.endsWith(REVIEWS_HASH_SUFFIX)) {
      window.history.back()
      return
    }
    setReviewsOpen(false)
  }

  const navigateToProtectedPath = (
    path,
    { replace = false, authenticated = false } = {},
  ) => {
    const route = getProtectedRoute(path)
    if (!route) return false
    if (!authenticated && (authStatus !== 'authenticated' || !user)) {
      rememberIntendedRoute(route.path)
      if (window.location.pathname !== '/') {
        window.history.replaceState(
          { prideProtectedRedirect: route.path },
          '',
          '/',
        )
      }
      setAuthOpen(true)
      return false
    }

    sessionStorage.removeItem(INTENDED_ROUTE_SESSION_KEY)
    const historyMethod = replace ? 'replaceState' : 'pushState'
    if (window.location.pathname !== route.path || window.location.hash) {
      window.history[historyMethod](
        { prideProtectedRoute: route.path, prideProtectedReturn: !replace },
        '',
        route.path,
      )
    }
    setSuccessfulOrder(null)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setProductsOpen(false)
    setContentPage(null)
    if (route.page === 'checkout') {
      checkoutHistoryActive.current = true
      setCheckoutOpen(true)
      setAccountSection(null)
    } else {
      checkoutHistoryActive.current = false
      setCheckoutOpen(false)
      setOrderToViewId(null)
      setAccountSection(route.section)
    }
    window.scrollTo({ top: 0, behavior: 'auto' })
    return true
  }

  const navigateToCheckout = (options) => {
    if (!navigateToProtectedPath(CHECKOUT_PATH, options)) return
    checkoutHistoryActive.current = true
    setCheckoutOpen(true)
    setAccountSection(null)
  }

  const closeCheckout = () => {
    sessionStorage.removeItem(CHECKOUT_SELECTION_SESSION_KEY)
    setCheckoutSelection(null)
    if (
      window.location.pathname === CHECKOUT_PATH &&
      window.history.state?.prideProtectedReturn
    ) {
      window.history.back()
      return
    }
    if (window.location.pathname === CHECKOUT_PATH) {
      window.history.replaceState(null, '', '/')
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
    navigateToProtectedPath('/orders', { replace: true })
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
    if (productHasVariants(product) && !product.selectedVariantId) {
      navigateToProduct(product)
      notify(`Select a variant for ${product.name} before buying`)
      return
    }
    const selection = createBuyNowSelection(product, quantity)
    const [checkoutItem] = resolveCheckoutSelection(selection, products)
    if (
      !selection ||
      !checkoutItem ||
      !hasValidPrice(checkoutItem.product.price) ||
      Number(checkoutItem.product.stock) < checkoutItem.quantity
    ) {
      notify('Unable to prepare this product for checkout')
      return
    }
    notify(`${product.name} is ready for checkout`)
    handleCheckout({ skipCartValidation: true, selection })
  }

  const handleAuthSuccess = (authenticatedUser, mode) => {
    const session = transitionAccountSession(
      activeUserUid,
      authenticatedUser.uid,
    )
    if (session.shouldClearPreviousUser) {
      clearAuthenticatedState()
      activeUserUid.current = authenticatedUser.uid
    }
    if (session.userChanged) {
      setAccountReady(false)
      setAccountError('')
    }
    setUser(authenticatedUser)
    setAuthStatus('authenticated')
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
    const intendedRoute = getProtectedRoute(
      sessionStorage.getItem(INTENDED_ROUTE_SESSION_KEY),
    )
    if (intendedRoute) {
      if (pendingWishlistRequest?.productId != null) {
        setLikedIds((current) =>
          current.includes(pendingWishlistRequest.productId)
            ? current
            : [...current, pendingWishlistRequest.productId],
        )
      }
      setPendingCheckout(false)
      setPendingCart(false)
      setPendingWishlistRequest(null)
      navigateToProtectedPath(intendedRoute.path, { authenticated: true })
      return
    }
    if (pendingCheckout) {
      setPendingCheckout(false)
      navigateToCheckout({ authenticated: true })
    }
    if (pendingCart) {
      setPendingCart(false)
      cartReturnSection.current = null
      cartHistoryActive.current = true
      navigateToProtectedPath('/cart', { authenticated: true })
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
      navigateToProtectedPath('/wishlist', { authenticated: true })
    }
  }

  const handleUpdateUser = async (updatedUser) => {
    try {
      const savedUser = await saveUserProfile(updatedUser)
      const nextUser = savedUser
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

  const persistAddresses = (nextAddresses, successMessage) => {
    const nextAccount = normalizeAccountState({
      ...accountStateRef.current,
      addresses: nextAddresses,
    })
    const serializedAccount = JSON.stringify(nextAccount)
    const revision = ++accountSaveRevision.current
    const uid = user?.uid
    clearTimeout(accountSaveTimer.current)
    pendingAccountSnapshot.current = serializedAccount
    accountStateRef.current = nextAccount
    accountSnapshot.current = serializedAccount
    setSavedAddresses(nextAccount.addresses)

    if (!uid) return nextAccount.addresses
    const save = accountSaveQueue.current
      .catch(() => undefined)
      .then(() => saveUserAccount(uid, nextAccount))
    accountSaveQueue.current = save
    void save
      .then(() => {
        if (
          revision === accountSaveRevision.current &&
          activeUserUid.current === uid
        ) notify(successMessage)
      })
      .catch((error) => {
        if (
          revision === accountSaveRevision.current &&
          activeUserUid.current === uid
        ) {
          pendingAccountSnapshot.current = ''
          const rollbackAccount = remoteAccountRef.current
          accountStateRef.current = rollbackAccount
          accountSnapshot.current = JSON.stringify(rollbackAccount)
          setLikedIds(rollbackAccount.wishlistIds)
          setSavedAddresses(rollbackAccount.addresses)
          setSavedPayments(rollbackAccount.paymentMethods)
          hydrateCart(rollbackAccount)
          notify(error.message || 'Unable to save the address.')
        }
      })
    return nextAccount.addresses
  }

  const handleSaveAddress = (address) => {
    const normalizedAddress = normalizeAddress(address)
    const result = upsertSavedAddress(
      accountStateRef.current.addresses,
      normalizedAddress,
      globalThis.crypto?.randomUUID?.() || `address-${Date.now()}`,
    )
    persistAddresses(
      result.addresses,
      result.existed ? 'Address updated successfully' : 'Address saved successfully',
    )
    return result.savedAddress
  }

  const handleDeleteAddress = (addressId) => {
    const currentAddresses = accountStateRef.current.addresses
    if (!currentAddresses.some((item) => String(item.id) === String(addressId))) return
    persistAddresses(
      removeSavedAddress(currentAddresses, addressId),
      'Address deleted',
    )
  }

  const handleDefaultAddress = (addressId) => {
    const currentAddresses = accountStateRef.current.addresses
    if (!currentAddresses.some((item) => String(item.id) === String(addressId))) return
    persistAddresses(
      setDefaultSavedAddress(currentAddresses, addressId),
      'Default delivery address updated',
    )
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
    if (
      getProtectedRoute(window.location.pathname) ||
      window.location.hash === '#account-cart'
    ) {
      window.history.replaceState(
        null,
        '',
        '/',
      )
      cartReturnSection.current = null
      cartHistoryActive.current = false
    }
    try {
      clearTimeout(accountSaveTimer.current)
      if (user?.uid && accountHydrated.current) {
        await Promise.race([
          saveUserAccount(user.uid, accountStateRef.current).catch(() => undefined),
          new Promise((resolve) => window.setTimeout(resolve, 800)),
        ])
      }
      await signOutUser()
      if ([CHECKOUT_HASH, ORDER_SUCCESS_HASH].includes(window.location.hash)) {
        window.history.replaceState(
          null,
          '',
          `${window.location.pathname}${window.location.search}`,
        )
      }
      clearAuthenticatedState()
      setAuthStatus('unauthenticated')
      notify('You have been logged out successfully')
    } catch (error) {
      notify(error.message || 'Unable to log out. Please try again.')
    }
  }

  const handleProfileSelect = (section) => {
    setOrderToViewId(null)
    const path = getProtectedPathForSection(section)
    if (path) navigateToProtectedPath(path)
  }

  const openWishlist = () => {
    if (!user) setPendingWishlistRequest({ productId: null })
    navigateToProtectedPath('/wishlist')
  }

  const navigateToCart = () => {
    if (!user) {
      setPendingCart(true)
    }
    navigateToProtectedPath('/cart')
  }

  const handleRemoveCartItem = (itemKey) => {
    const target = (cartPersistenceRef.current.cartItems || []).find(
      (item) => variantCartKey(item.productId, item.variantId) === itemKey,
    )
    if (!target) return
    cart.remove(itemKey)
  }

  const handleCheckoutUpdateQuantity = (itemKey, delta) => {
    if (checkoutSelection?.mode === 'buy-now') {
      setCheckoutSelection((current) => {
        if (!current?.items) return current
        const nextItems = current.items
          .map((item) => {
            const key = variantCartKey(item.productId, item.variantId)
            if (key !== itemKey) return item
            const nextQty = item.quantity + delta
            return nextQty > 0 ? { ...item, quantity: nextQty } : item
          })
          .filter((item) => item.quantity > 0)
        if (!nextItems.length) {
          closeCheckout()
          return null
        }
        const nextSelection = { ...current, items: nextItems }
        sessionStorage.setItem(
          CHECKOUT_SELECTION_SESSION_KEY,
          JSON.stringify(nextSelection),
        )
        return nextSelection
      })
    } else {
      cart.changeQuantity(itemKey, delta)
    }
  }

  const handleCheckoutRemoveItem = (itemKey) => {
    if (checkoutSelection?.mode === 'buy-now') {
      setCheckoutSelection((current) => {
        if (!current?.items) return current
        const nextItems = current.items.filter(
          (item) => variantCartKey(item.productId, item.variantId) !== itemKey,
        )
        if (!nextItems.length) {
          closeCheckout()
          return null
        }
        const nextSelection = { ...current, items: nextItems }
        sessionStorage.setItem(
          CHECKOUT_SELECTION_SESSION_KEY,
          JSON.stringify(nextSelection),
        )
        return nextSelection
      })
    } else {
      cart.remove(itemKey)
    }
  }

  const handleOpenPolicy = (policyKey) => {
    const hash = CONTENT_PAGE_HASHES[policyKey]
    if (hash) {
      window.open(`/${hash}`, '_blank')
    }
  }

  const handleAccountSectionChange = (nextSection) => {
    setOrderToViewId(null)
    const path = getProtectedPathForSection(nextSection)
    if (path) navigateToProtectedPath(path, { replace: true })
  }

  const closeAccountPanel = () => {
    setOrderToViewId(null)
    if (
      getProtectedRoute(window.location.pathname) &&
      window.history.state?.prideProtectedReturn
    ) {
      window.history.back()
      return
    }
    if (getProtectedRoute(window.location.pathname)) {
      window.history.replaceState(null, '', '/')
    }
    setAccountSection(null)
  }

  const retryAccountData = () => {
    setAccountReady(false)
    setAccountError('')
    setAccountLoadAttempt((attempt) => attempt + 1)
  }

  const handleAccountCheckout = (checkoutOptions) => {
    setAccountSection(null)
    handleCheckout({ ...checkoutOptions, selection: null })
  }

  const handleCheckout = ({
    couponCode = '',
    skipCartValidation = false,
    selection = null,
  } = {}) => {
    const normalizedSelection = normalizeCheckoutSelection(selection)
    const checkoutItems = normalizedSelection
      ? resolveCheckoutSelection(normalizedSelection, products)
      : cart.items
    const checkoutHasUnavailableItems = checkoutItems.some(
      ({ product, quantity }) =>
        !hasValidPrice(product.price) ||
        Number(product.stock) <= 0 ||
        quantity > Number(product.stock),
    )
    setCheckoutCouponCode(couponCode)
    if (
      !checkoutItems.length ||
      checkoutHasUnavailableItems ||
      (!skipCartValidation && cart.issues.removedProductCount > 0)
    ) {
      notify('Review unavailable or updated cart items before checkout')
      return
    }
    setCheckoutSelection(normalizedSelection)
    if (normalizedSelection) {
      sessionStorage.setItem(
        CHECKOUT_SELECTION_SESSION_KEY,
        JSON.stringify(normalizedSelection),
      )
    } else {
      sessionStorage.removeItem(CHECKOUT_SELECTION_SESSION_KEY)
    }
    if (user) {
      navigateToCheckout()
      return
    }
    setPendingCheckout(true)
    setAuthOpen(true)
    notify('Please login or sign up to continue to checkout')
  }

  const flushPendingAccountChanges = async () => {
    if (!user?.uid) return
    clearTimeout(accountSaveTimer.current)
    if (!pendingAccountSnapshot.current) {
      await accountSaveQueue.current.catch(() => undefined)
      return
    }
    const account = accountStateRef.current
    const uid = user.uid
    const save = accountSaveQueue.current
      .catch(() => undefined)
      .then(() => saveUserAccount(uid, account))
    accountSaveQueue.current = save
    await save
    if (pendingAccountSnapshot.current === JSON.stringify(account)) {
      pendingAccountSnapshot.current = ''
    }
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
      clientRequestId: checkoutDetails.requestId,
      checkoutMode:
        checkoutSelection?.mode === 'buy-now' ? 'buy-now' : 'cart',
      expectedTotalPaise: checkoutDetails.expectedTotalPaise,
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
      itemsCount: activeCheckoutItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      status: checkoutDetails.cod ? 'Pending' : 'Confirmed',
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
      billingAddress:
        checkoutDetails.billingAddress || checkoutDetails.address || null,
      gstProfile: checkoutDetails.gstProfile || null,
      deliveryId: checkoutDetails.delivery?.id || 'standard',
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
      items: activeCheckoutItems.map(checkoutItemRequest),
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
    const placedCheckoutMode =
      savedOrder.checkoutMode || order.checkoutMode
    if (placedCheckoutMode === 'cart') {
      const remainingCartItems = removePurchasedItems(
        cartPersistenceRef.current.cartItems,
        savedOrder.items,
      )
      const updatedAccount = normalizeAccountState({
        ...accountStateRef.current,
        cartItems: remainingCartItems,
      })
      clearTimeout(accountSaveTimer.current)
      cartPersistenceRef.current = {
        ...cartPersistenceRef.current,
        cartItems: remainingCartItems,
      }
      accountStateRef.current = updatedAccount
      accountSnapshot.current = JSON.stringify(updatedAccount)
      cart.removeMany(
        savedOrder.items.map((item) =>
          variantCartKey(item.productId, item.variantId),
        ),
      )
    }
    sessionStorage.setItem(ORDER_SUCCESS_SESSION_KEY, JSON.stringify(savedOrder))
    orderSuccessHistoryActive.current = true
    window.history.replaceState(
      { prideOrderSuccess: savedOrder.id },
      '',
      `/${ORDER_SUCCESS_HASH}`,
    )
    setSuccessfulOrder(savedOrder)
    setCheckoutOpen(false)
    setCheckoutSelection(null)
    sessionStorage.removeItem(CHECKOUT_SELECTION_SESSION_KEY)
    checkoutHistoryActive.current = false
    window.scrollTo({ top: 0, behavior: 'auto' })
    notify(`Order ${getOrderDisplayId(savedOrder)} placed successfully`)
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
      notify(`Order ${getOrderDisplayId(savedOrder || order)} cancelled successfully`)
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

  const ContentPage = contentPage
    ? CONTENT_PAGE_COMPONENTS[contentPage]
    : null
  const passwordActionParams = new URLSearchParams(window.location.search)
  const passwordResetActionRequested =
    passwordActionParams.get('mode') === 'resetPassword'
  const passwordResetActionCode = passwordActionParams.get('oobCode') || ''
  const protectedAuthPending =
    authStatus === 'loading' &&
    Boolean(
      getProtectedRoute(window.location.pathname) ||
        [CHECKOUT_HASH, ORDER_SUCCESS_HASH, '#account-cart'].includes(
          window.location.hash,
        ),
    )
  const protectedAccountDataOpen = checkoutOpen || Boolean(accountSection)
  const catalogDataRequired =
    checkoutOpen || ['cart', 'wishlist'].includes(accountSection)
  const protectedDataPending =
    protectedAccountDataOpen &&
    authStatus === 'authenticated' &&
    !accountError &&
    (!accountReady || (catalogDataRequired && productsLoading))
  const protectedDataError =
    protectedAccountDataOpen &&
    (accountError || (catalogDataRequired ? productsError : ''))

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f7f8f5] pb-20 sm:pb-16 lg:pb-0">
      <AnnouncementBar shippingSettings={shippingSettings} />
      <Header
        products={products}
        searchQuery={query}
        user={user}
        authStatus={authStatus}
        cartCount={cart.count}
        wishlistCount={user ? likedIds.length : 0}
        accountSection={accountSection}
        productsOpen={productsOpen}
        contentPageOpen={Boolean(ContentPage)}
        onHome={navigateHome}
        onProductsOpen={() => navigateToProducts('All')}
        onCartOpen={navigateToCart}
        onWishlistOpen={openWishlist}
        onSearch={setQuery}
        onSearchSubmit={handleSearchSubmit}
        onProductSelect={navigateToProduct}
        onAuthOpen={() => setAuthOpen(true)}
        onProfileSelect={handleProfileSelect}
        onLogout={() => setLogoutConfirmOpen(true)}
      />
      <main>
        {protectedAuthPending || protectedDataPending ? (
          <section
            className="grid min-h-[55vh] place-items-center px-6 text-center"
            aria-live="polite"
            aria-busy="true"
          >
            <div>
              <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#75916f]/25 border-t-[#536a50]" />
              <p className="mt-4 text-sm font-bold text-[#425443]">
                {protectedDataPending
                  ? 'Loading your latest saved data from Firebase…'
                  : 'Checking your account…'}
              </p>
            </div>
          </section>
        ) : protectedDataError ? (
          <section className="grid min-h-[55vh] place-items-center px-6 text-center">
            <div className="max-w-md rounded-[28px] bg-white p-8 shadow-sm">
              <h1 className="text-lg font-extrabold text-slate-900">
                Account data is unavailable
              </h1>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                {protectedDataError}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {accountError && (
                  <button type="button" onClick={retryAccountData} className="rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white">
                    Retry loading
                  </button>
                )}
                <button type="button" onClick={checkoutOpen ? closeCheckout : closeAccountPanel} className="rounded-full border border-slate-200 bg-white px-5 py-3 text-xs font-extrabold text-slate-700">
                  Back to store
                </button>
              </div>
            </div>
          </section>
        ) : successfulOrder && authStatus === 'authenticated' && user ? (
          <OrderSuccessPage
            order={successfulOrder}
            onContinueShopping={closeOrderSuccess}
            onViewOrders={viewSuccessfulOrder}
          />
        ) : checkoutOpen && authStatus === 'authenticated' && user ? (
          <CheckoutPage
            key={`${checkoutSelection?.mode || 'cart'}-${checkoutSelection?.items?.map((item) => variantCartKey(item.productId, item.variantId)).join('-') || 'all'}`}
            items={activeCheckoutItems}
            initialCouponCode={checkoutCouponCode}
            coupons={customerCoupons}
            savedAddresses={savedAddresses}
            savedPayments={savedPayments}
            user={user}
            onSaveAddress={handleSaveAddress}
            onPrepareCheckout={flushPendingAccountChanges}
            onBack={closeCheckout}
            onPlaceOrder={handlePlaceOrder}
            onUpdateQuantity={handleCheckoutUpdateQuantity}
            onRemoveItem={handleCheckoutRemoveItem}
            onOpenPolicy={handleOpenPolicy}
            checkoutMode={
              checkoutSelection?.mode === 'buy-now' ? 'buy-now' : 'cart'
            }
            shippingSettings={shippingSettings}
            taxSettings={invoiceSettings.tax}
            paymentSettings={adminSettings.payment}
            storeName={adminSettings.store.name}
          />
        ) : liveSelectedProduct && reviewsOpen ? (
          <ProductReviewsPage product={liveSelectedProduct} reviews={selectedProductReviews} onBack={closeReviews} />
        ) : liveSelectedProduct ? (
        <ProductDetailsPage
            key={liveSelectedProduct.id}
            product={liveSelectedProduct}
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
        ) : ContentPage ? (
          <ContentPage onBack={closeContentPage} />
        ) : productsOpen ? (
          <ProductsPage
            products={products}
            filteredProducts={filteredProducts}
            suggestedProducts={suggestedProducts}
            categories={categories}
            query={query}
            activeCategory={category}
            sortBy={sortBy}
            likedIds={user ? likedIds : []}
            onBack={closeProducts}
            onQueryChange={setQuery}
            onSearchSubmit={handleProductsSearch}
            onCategoryChange={handleProductsCategory}
            onSortChange={setSortBy}
            onProductSelect={navigateToProduct}
            onLike={handleLike}
            onAdd={handleAdd}
            onBuyNow={handleBuyNow}
          />
        ) : (
          <HomeScrollReveal>
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
              onSelect={(nextCategory) => navigateToProducts(nextCategory)}
            />
            <BenefitsStrip shippingSettings={shippingSettings} />
            <ProductCatalog
              products={filteredProducts}
              suggestedProducts={suggestedProducts}
              onSuggestedCategoryChange={handleHomeCategory}
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
                navigateToProtectedPath('/account')
              }
            />
          </HomeScrollReveal>
        )}
      </main>
      {!checkoutOpen && (
        <Footer
          onBeSellerClick={onBeSellerClick}
          onPageOpen={navigateToContentPage}
        />
      )}

      <AuthModal
        key={authInitialMode}
        initialMode={authInitialMode}
        open={authOpen && !passwordResetActionRequested}
        onClose={() => {
          setAuthOpen(false)
          setAuthInitialMode('login')
          sessionStorage.removeItem(INTENDED_ROUTE_SESSION_KEY)
          setPendingCheckout(false)
          setPendingCart(false)
          setPendingWishlistRequest(null)
        }}
        onSuccess={handleAuthSuccess}
      />
      {passwordResetActionRequested && (
        <PasswordResetModal
          key={passwordResetActionCode || 'invalid-reset-code'}
          actionCode={passwordResetActionCode}
          onComplete={() => {
            window.history.replaceState(null, '', '/')
            setAuthInitialMode('login')
            setAuthOpen(true)
          }}
          onRequestNewLink={() => {
            window.history.replaceState(null, '', '/')
            setAuthInitialMode('forgot')
            setAuthOpen(true)
          }}
        />
      )}
      {authStatus === 'authenticated' && user && accountReady && !protectedDataPending && !protectedDataError && (
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
          onRemoveCartItem={handleRemoveCartItem}
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
        <div className="fixed bottom-20 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-full bg-slate-950 px-5 py-3.5 text-xs font-bold text-white shadow-2xl sm:bottom-5">
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
