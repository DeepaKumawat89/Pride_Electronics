import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import HeroSection from './components/home/HeroSection'
import CategoryStrip from './components/home/CategoryStrip'
import HomeScrollReveal from './components/home/HomeScrollReveal'
import HomepageProductSections from './components/home/HomepageProductSections'
import ProductSeo from './components/seo/ProductSeo'
import HomeSeo from './components/seo/HomeSeo'
import CatalogSeo from './components/seo/CatalogSeo'
import CategoriesSeo from './components/seo/CategoriesSeo'
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
import {
  getCustomerCouponUsage,
  verifyCustomerCashfreePayment,
} from '../firebase/customerData'
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
import { createOrderMoment } from '../utils/orderTimestamps'
import { getProductMinimumOrderQuantity } from '../utils/productMoq'
import { getProductPath, slugify } from '../utils/slugify'
import { buildTaxonomyRoutes } from '../utils/catalogRoutes'
import { getProductBySlugOrId } from '../firebase/products'

const AllCategoriesPage = lazy(() => import('./components/categories/AllCategoriesPage'))
const ProductDetailsPage = lazy(() => import('./components/products/ProductDetailsPage'))
const ProductReviewsPage = lazy(() => import('./components/products/ProductReviewsPage'))
const ProductsPage = lazy(() => import('./components/products/ProductsPage'))
const AboutUs = lazy(() => import('./components/pages/AboutUs'))
const ContactUs = lazy(() => import('./components/pages/ContactUs'))
const PrivacyPolicy = lazy(() => import('./components/pages/PrivacyPolicy'))
const RefundAndCancellationPolicy = lazy(() => import('./components/pages/RefundAndCancellationPolicy'))
const ShippingAndDeliveryPolicy = lazy(() => import('./components/pages/ShippingAndDeliveryPolicy'))
const TermsAndConditions = lazy(() => import('./components/pages/TermsAndConditions'))
const AuthModal = lazy(() => import('./components/auth/AuthModal'))
const PasswordResetModal = lazy(() => import('./components/auth/PasswordResetModal'))
const CheckoutPage = lazy(() => import('./components/checkout/CheckoutPage'))
const OrderSuccessPage = lazy(() => import('./components/checkout/OrderSuccessPage'))
const AccountPanel = lazy(() => import('./components/profile/AccountPanel'))
const LogoutConfirmation = lazy(() =>
  import('./components/profile/AccountPanel').then((module) => ({
    default: module.LogoutConfirmation,
  })),
)

let cashfreeScriptPromise
const loadCashfreeScript = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cashfree requires a browser.'))
  }
  if (typeof window.Cashfree === 'function') return Promise.resolve(window.Cashfree)
  if (cashfreeScriptPromise) return cashfreeScriptPromise

  cashfreeScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-cashfree-sdk]')
    const script = existingScript || document.createElement('script')
    const handleLoad = () => {
      if (typeof window.Cashfree === 'function') resolve(window.Cashfree)
      else reject(new Error('Cashfree checkout could not be loaded.'))
    }
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('Cashfree checkout could not be loaded.')),
      { once: true },
    )
    if (!existingScript) {
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
      script.async = true
      script.dataset.cashfreeSdk = 'true'
      document.head.appendChild(script)
    }
  })
  return cashfreeScriptPromise
}

const LEGACY_PRODUCT_HASH_PREFIX = '#product-'
const LEGACY_PRODUCTS_HASH_PREFIX = '#products'
const LEGACY_PRODUCT_REVIEWS_SUFFIX = '-reviews'
const ORDER_SUCCESS_SESSION_KEY = 'pride_last_successful_order'
const INTENDED_ROUTE_SESSION_KEY = 'pride_intended_protected_route'
const CHECKOUT_SELECTION_SESSION_KEY = 'pride_checkout_selection'
const CONTENT_PAGE_PATHS = {
  about: '/about-us',
  privacy: '/privacy-policy',
  terms: '/terms-and-conditions',
  refunds: '/refund-and-cancellation-policy',
  shipping: '/shipping-and-delivery-policy',
  contact: '/contact-us',
}
const LEGACY_CONTENT_PAGE_HASHES = {
  '#about-us': 'about',
  '#contact-us': 'contact',
  '#privacy-policy': 'privacy',
  '#terms-and-conditions': 'terms',
  '#refund-and-cancellation-policy': 'refunds',
  '#shipping-and-delivery-policy': 'shipping',
}
const CONTENT_PAGE_COMPONENTS = {
  about: AboutUs,
  privacy: PrivacyPolicy,
  terms: TermsAndConditions,
  refunds: RefundAndCancellationPolicy,
  shipping: ShippingAndDeliveryPolicy,
  contact: ContactUs,
}
const CONTENT_PAGE_SEO = {
  about: ['About Pride Circuit | Pride Circuit', 'Learn about Pride Circuit and our selection of electronics and automation products.'],
  contact: ['Contact Pride Circuit | Pride Circuit', 'Contact Pride Circuit for help with electronics, orders, delivery, and support.'],
  privacy: ['Privacy Policy | Pride Circuit', 'Read the Pride Circuit privacy policy and learn how customer information is handled.'],
  terms: ['Terms & Conditions | Pride Circuit', 'Review the terms and conditions that apply to Pride Circuit website purchases and services.'],
  refunds: ['Refund & Cancellation Policy | Pride Circuit', 'Review Pride Circuit order cancellation, return, and refund terms.'],
  shipping: ['Shipping & Delivery Policy | Pride Circuit', 'Review delivery methods, timelines, charges, and support information for Pride Circuit orders.'],
}

function getContentPageFromPath(pathname) {
  return Object.keys(CONTENT_PAGE_PATHS).find((page) => CONTENT_PAGE_PATHS[page] === pathname)
}

function createProductsPath(category = 'All', query = '') {
  const params = new URLSearchParams()
  if (category && category !== 'All') params.set('category', category)
  if (query.trim()) params.set('query', query.trim())
  const search = params.toString()
  return `/products${search ? `?${search}` : ''}`
}

function parseLegacyProductsHash(hash) {
  if (hash !== LEGACY_PRODUCTS_HASH_PREFIX && !hash.startsWith(`${LEGACY_PRODUCTS_HASH_PREFIX}?`)) {
    return null
  }
  const queryString = hash.slice(LEGACY_PRODUCTS_HASH_PREFIX.length + 1)
  const params = new URLSearchParams(queryString)
  return {
    category: params.get('category') || 'All',
    query: params.get('query') || '',
  }
}

// Keep a single entry point for previously shared hash URLs. New navigation uses paths.
function replaceLegacyHashRoute(products, taxonomyRoutes) {
  const hash = window.location.hash
  const legacyProducts = parseLegacyProductsHash(hash)
  if (legacyProducts) {
    const categoryMatches = taxonomyRoutes.categories.filter(
      (category) => category.name.trim().toLowerCase() === legacyProducts.category.trim().toLowerCase(),
    )
    const category = categoryMatches.length === 1 ? categoryMatches[0] : null
    const extraParams = new URLSearchParams(window.location.search)
    extraParams.delete('category')
    if (legacyProducts.query) extraParams.set('query', legacyProducts.query)
    const targetPath = category?.path || createProductsPath(legacyProducts.category, legacyProducts.query)
    const target = new URL(targetPath, window.location.origin)
    extraParams.forEach((value, key) => {
      if (!target.searchParams.has(key)) target.searchParams.append(key, value)
    })
    window.history.replaceState({ prideProducts: true }, '', `${target.pathname}${target.search}`)
    return true
  }
  const legacyContentPage = LEGACY_CONTENT_PAGE_HASHES[hash]
  if (legacyContentPage) {
    window.history.replaceState({ prideContentPage: legacyContentPage }, '', CONTENT_PAGE_PATHS[legacyContentPage])
    return true
  }
  if (hash === '#checkout' || hash === '#account-cart' || hash === '#order-success') {
    const path = hash === '#checkout' ? CHECKOUT_PATH : hash === '#account-cart' ? '/cart' : '/order-success'
    window.history.replaceState({ prideProtectedRedirect: path }, '', path)
    return true
  }
  if (hash === '#reviews' && window.location.pathname.startsWith('/product/')) {
    const productPath = window.location.pathname.replace(/\/+$/, '')
    window.history.replaceState(
      window.history.state,
      '',
      `${productPath}/reviews${window.location.search}`,
    )
    return true
  }
  if (hash.startsWith(LEGACY_PRODUCT_HASH_PREFIX)) {
    const legacyProduct = hash.slice(LEGACY_PRODUCT_HASH_PREFIX.length)
    const isReviewsPage = legacyProduct.endsWith(LEGACY_PRODUCT_REVIEWS_SUFFIX)
    const identifier = decodeURIComponent(isReviewsPage ? legacyProduct.slice(0, -LEGACY_PRODUCT_REVIEWS_SUFFIX.length) : legacyProduct)
    const product = products.find((item) => String(item.id) === identifier || String(item.slug || '') === identifier)
    if (product) {
      window.history.replaceState(
        { prideProduct: product.id },
        '',
        `${getProductPath(product)}${isReviewsPage ? '/reviews' : ''}${window.location.search}`,
      )
      return true
    }
  }
  return false
}

const publicSlug = slugify

function parsePublicPath(pathname) {
  const path = String(pathname || '').replace(/\/+$/, '') || '/'
  if (path === '/categories') return { type: 'categories' }
  if (path === '/products') return { type: 'products', categorySlug: '' }
  const contentPage = getContentPageFromPath(path)
  if (contentPage) return { type: 'content', contentPage }
  if (path.startsWith('/product-category/') || path.startsWith('/category/')) {
    const legacy = path.startsWith('/category/')
    const prefix = legacy ? '/category/' : '/product-category/'
    const segments = path.slice(prefix.length).split('/').map(decodeURIComponent)
    return {
      type: 'category',
      categorySlug: segments[0],
      subcategorySlug: segments[1] || '',
      legacy,
    }
  }
  if (path.startsWith('/product/')) {
    if (path.endsWith('/reviews')) {
      const productPath = path.slice(0, -'/reviews'.length)
      const productId = productPath.startsWith('/product/id/')
        ? productPath.slice('/product/id/'.length)
        : productPath.slice('/product/'.length)
      return { type: 'product', productId: decodeURIComponent(productId), reviews: true }
    }
    if (path.startsWith('/product/id/')) {
      return {
        type: 'product',
        productId: decodeURIComponent(path.slice('/product/id/'.length)),
      }
    }
    return {
      type: 'product',
      productId: decodeURIComponent(path.slice('/product/'.length)),
    }
  }
  return null
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
  onRetryProducts,
  coupons = [],
  marketingSettings,
  shippingSettings,
  invoiceSettings = initialInvoiceSettings,
  adminSettings = initialAdminSettings,
  categories = [],
  subcategories = [],
  reviews = [],
  onNewOrder,
  onCreateReturnRequest,
  onCancelOrder,
  onSubmitOrderFeedback,
  onCustomerAuthenticated,
  onBeSellerClick,
}) {
  const cart = useCart(null, products)
  const taxonomyRoutes = useMemo(
    () => buildTaxonomyRoutes(categories, subcategories),
    [categories, subcategories],
  )
  const hydrateCart = cart.hydrate
  const cartPersistence = cart.persistence
  const cartPersistenceRef = useRef(cartPersistence)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [categoryId, setCategoryId] = useState('')
  const [categoryRoutePath, setCategoryRoutePath] = useState('')
  const [subcategory, setSubcategory] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [subcategoryRoutePath, setSubcategoryRoutePath] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [productsOpen, setProductsOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [contentPage, setContentPage] = useState(null)
  const [likedIds, setLikedIds] = useState([])
  const likedIdsRef = useRef(likedIds)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [productRouteStatus, setProductRouteStatus] = useState(() =>
    parsePublicPath(window.location.pathname)?.type === 'product'
      ? 'pending'
      : '',
  )
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
  const productReturnSection = useRef(null)
  const finalizedPaidOrderIds = useRef(new Set())
  const finalizePaidOrderLocallyRef = useRef(null)
  const productHistoryActive = useRef(false)
  const productsHistoryActive = useRef(false)
  const productsReturnCatalog = useRef(null)
  const checkoutHistoryActive = useRef(false)
  const orderSuccessHistoryActive = useRef(false)
  const activeUserUid = useRef(null)
  const historyRouteSynced = useRef(false)

  useEffect(() => {
    if (!contentPage) return
    const [title, description] = CONTENT_PAGE_SEO[contentPage] || []
    if (!title || !description) return
    document.title = title
    const setMeta = (selector, attribute, key, value) => {
      let element = document.head.querySelector(selector)
      if (!element) {
        element = document.createElement('meta')
        element.setAttribute(attribute, key)
        document.head.appendChild(element)
      }
      element.setAttribute('content', value)
    }
    const canonicalUrl = `https://pridecircuit.in${CONTENT_PAGE_PATHS[contentPage]}`
    setMeta('meta[name="description"]', 'name', 'description', description)
    setMeta('meta[property="og:title"]', 'property', 'og:title', title)
    setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl)
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website')
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Pride Circuit')
    setMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary')
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description)
    setMeta('meta[name="twitter:url"]', 'name', 'twitter:url', canonicalUrl)
    let canonical = document.head.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl
  }, [contentPage])

  const finalizePaidOrderLocally = (order) => {
    if (!order?.id || !['paid', 'successful', 'captured'].includes(
      String(order.paymentStatus || '').toLowerCase(),
    ) || finalizedPaidOrderIds.current.has(order.id)) return
    finalizedPaidOrderIds.current.add(order.id)
    if (order.couponCode) {
      setCouponUsage((current) => ({
        ...current,
        [order.couponCode]: Number(current[order.couponCode] || 0) + 1,
      }))
    }
    if ((order.checkoutMode || 'cart') !== 'cart') return
    const remainingCartItems = removePurchasedItems(
      cartPersistenceRef.current.cartItems,
      order.items,
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
    cart.removeMany(order.items.map((item) =>
      variantCartKey(item.productId, item.variantId),
    ))
  }
  finalizePaidOrderLocallyRef.current = finalizePaidOrderLocally

  useEffect(() => {
    if (!successfulOrder?.id) return
    const latestOrder = localOrders.find((order) => order.id === successfulOrder.id)
    if (!latestOrder) return
    finalizePaidOrderLocallyRef.current?.(latestOrder)
    if (JSON.stringify(latestOrder) === JSON.stringify(successfulOrder)) return
    setSuccessfulOrder(latestOrder)
    sessionStorage.setItem(ORDER_SUCCESS_SESSION_KEY, JSON.stringify(latestOrder))
  }, [localOrders, successfulOrder])

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
    let active = true
    const handleHistoryBack = async (event) => {
      replaceLegacyHashRoute(products, taxonomyRoutes)
      const shouldResetScroll =
        event?.type === 'popstate' || !historyRouteSynced.current
      historyRouteSynced.current = true
      const resetScroll = () => {
        if (shouldResetScroll && !window.location.hash) {
          window.scrollTo({ top: 0, behavior: 'auto' })
        }
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
        setCheckoutOpen(false)
        setSuccessfulOrder(null)
        setAccountSection(null)
        setCategoriesOpen(false)
        setAuthOpen(true)
        return
      }
      if (protectedRoute && authStatus === 'authenticated') {
        orderSuccessHistoryActive.current = false
        checkoutHistoryActive.current = false
        setSuccessfulOrder(null)
        setSelectedProduct(null)
        setReviewsOpen(false)
        setProductsOpen(false)
        setCategoriesOpen(false)
        setContentPage(null)
        if (protectedRoute.page === 'order-success') {
          const savedOrder = getSessionItems(ORDER_SUCCESS_SESSION_KEY, null)
          orderSuccessHistoryActive.current = Boolean(savedOrder)
          checkoutHistoryActive.current = false
          setSuccessfulOrder(savedOrder)
          setCheckoutOpen(false)
          setAccountSection(savedOrder ? null : 'orders')
        } else if (protectedRoute.page === 'checkout') {
          checkoutHistoryActive.current = true
          setCheckoutOpen(true)
          setAccountSection(null)
        } else {
          setCheckoutOpen(false)
          setOrderToViewId(null)
          setAccountSection(protectedRoute.section)
        }
        resetScroll()
        return
      }
      if (orderSuccessHistoryActive.current && window.location.pathname !== '/order-success') {
        setSuccessfulOrder(null)
        orderSuccessHistoryActive.current = false
      }
      if (checkoutHistoryActive.current && window.location.pathname !== CHECKOUT_PATH) {
        setCheckoutOpen(false)
        checkoutHistoryActive.current = false
      }
      const publicPath = parsePublicPath(window.location.pathname)
      if (publicPath?.type === 'content') {
        setContentPage(publicPath.contentPage)
        setProductsOpen(false)
        setCategoriesOpen(false)
        setSelectedProduct(null)
        setReviewsOpen(false)
        setCheckoutOpen(false)
        setSuccessfulOrder(null)
        setAccountSection(null)
        resetScroll()
        return
      }
      if (publicPath?.type !== 'product') {
        setProductRouteStatus('')
      }
      if (publicPath?.type === 'categories') {
        setCategoriesOpen(true)
        setSuccessfulOrder(null)
        setCheckoutOpen(false)
        setSelectedProduct(null)
        setReviewsOpen(false)
        setProductsOpen(false)
        setContentPage(null)
        setAccountSection(null)
        resetScroll()
        return
      }
      setCategoriesOpen(false)
      if (publicPath?.type === 'product') {
        const pathProductBySlug = products.find(
          (product) => String(product.slug || '') === publicPath.productId,
        )
        const pathProductById = !pathProductBySlug
          ? products.find((product) => String(product.id) === publicPath.productId)
          : null
        let resolvedProduct = pathProductBySlug || pathProductById
        if (!resolvedProduct) {
          if (productsLoading) {
            setProductRouteStatus('pending')
            return
          }
          setProductRouteStatus('pending')
          try {
            resolvedProduct = await getProductBySlugOrId(publicPath.productId)
          } catch {
            if (active) setProductRouteStatus('error')
            return
          }
          if (!active) return
        }
        if (!resolvedProduct) {
          setProductRouteStatus('not-found')
          productHistoryActive.current = false
          setSelectedProduct(null)
          setReviewsOpen(false)
          setProductsOpen(false)
          setContentPage(null)
          setAccountSection(null)
          resetScroll()
          return
        }
        const legacyIdRoute = Boolean(
          resolvedProduct.slug &&
            (window.location.pathname.startsWith('/product/id/') ||
              String(resolvedProduct.id) === publicPath.productId),
        )
        if (window.location.pathname.startsWith('/product/id/') ||
          (legacyIdRoute && resolvedProduct.slug !== publicPath.productId)) {
          window.history.replaceState(
            { prideProduct: resolvedProduct.id },
            '',
            `${getProductPath(resolvedProduct)}${publicPath.reviews ? '/reviews' : ''}${window.location.search}`,
          )
        }
        setProductRouteStatus('ready')
        productHistoryActive.current = true
        setSelectedProduct(resolvedProduct)
        setReviewsOpen(Boolean(publicPath.reviews))
        setProductsOpen(false)
        setContentPage(null)
        setAccountSection(null)
        resetScroll()
        return
      }
      if (publicPath?.type === 'products' || publicPath?.type === 'category') {
        const routeParams = new URLSearchParams(window.location.search)
        let selectedCategoryRoute = null
        let selectedSubcategoryRoute = null
        if (publicPath.type === 'category') {
          const categoryMatches = publicPath.legacy
            ? taxonomyRoutes.categories.filter((item) => publicSlug(item.name) === publicPath.categorySlug)
            : taxonomyRoutes.categories.filter((item) => item.slug === publicPath.categorySlug)
          if (categoryMatches.length === 1) selectedCategoryRoute = categoryMatches[0]
          if (selectedCategoryRoute && publicPath.subcategorySlug) {
            const subcategoryMatches = taxonomyRoutes.subcategories.filter((item) =>
              String(item.categoryId) === String(selectedCategoryRoute.id) &&
              (publicPath.legacy
                ? publicSlug(item.name) === publicPath.subcategorySlug
                : item.slug === publicPath.subcategorySlug),
            )
            if (subcategoryMatches.length === 1) selectedSubcategoryRoute = subcategoryMatches[0]
          }
          if (selectedCategoryRoute && (publicPath.legacy || !publicPath.subcategorySlug || selectedSubcategoryRoute)) {
            const cleanPath = selectedSubcategoryRoute?.path || selectedCategoryRoute.path
            const cleanUrl = new URL(cleanPath, window.location.origin)
            routeParams.forEach((value, key) => cleanUrl.searchParams.append(key, value))
            if (publicPath.legacy || window.location.pathname.replace(/\/$/, '') !== cleanPath.replace(/\/$/, '')) {
              window.history.replaceState(window.history.state, '', `${cleanUrl.pathname}${cleanUrl.search}`)
            }
          }
        } else {
          const requestedCategory = routeParams.get('category') || ''
          if (requestedCategory && requestedCategory !== 'All') {
            const categoryMatches = taxonomyRoutes.categories.filter(
              (item) => item.name.trim().toLowerCase() === requestedCategory.trim().toLowerCase(),
            )
            if (categoryMatches.length === 1) {
              selectedCategoryRoute = categoryMatches[0]
              const cleanUrl = new URL(selectedCategoryRoute.path, window.location.origin)
              routeParams.forEach((value, key) => {
                if (key !== 'category') cleanUrl.searchParams.append(key, value)
              })
              window.history.replaceState(window.history.state, '', `${cleanUrl.pathname}${cleanUrl.search}`)
            }
          }
        }
        const requestedCategory = selectedCategoryRoute?.name || routeParams.get('category') || ''
        productsHistoryActive.current = true
        productHistoryActive.current = false
        productReturnSection.current = null
        setProductsOpen(true)
        setSelectedProduct(null)
        setReviewsOpen(false)
        setAccountSection(null)
        setCategory(requestedCategory || 'All')
        setCategoryId(selectedCategoryRoute?.id || '')
        setCategoryRoutePath(selectedCategoryRoute?.path || '')
        setSubcategory(selectedSubcategoryRoute?.name || '')
        setSubcategoryId(selectedSubcategoryRoute?.id || '')
        setSubcategoryRoutePath(selectedSubcategoryRoute?.path || '')
        setQuery(routeParams.get('query') || '')
        resetScroll()
        return
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
      if (window.location.pathname === '/') {
        setAccountSection(null)
        setContentPage(null)
      }
    }
    handleHistoryBack()
    window.addEventListener('popstate', handleHistoryBack)
    return () => {
      active = false
      window.removeEventListener('popstate', handleHistoryBack)
    }
  }, [authStatus, categories, products, productsLoading, subcategories, taxonomyRoutes])

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
      .filter((product) => category === 'All' || (categoryId && product.categoryId ? String(product.categoryId) === String(categoryId) : product.category === category))
      .filter((product) => !subcategory || (subcategoryId && product.subcategoryId ? String(product.subcategoryId) === String(subcategoryId) : product.subcategory === subcategory))
      .filter((product) => matchesProductQuery(product, query))

    return sortCatalogProducts(matchingProducts, sortBy)
  }, [products, query, category, categoryId, subcategory, subcategoryId, sortBy])

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
    if (
      window.location.pathname !== '/' ||
      getProtectedRoute(window.location.pathname)
    ) {
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
    setOrderToViewId(null)
    setSuccessfulOrder(null)
    setCheckoutOpen(false)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setProductsOpen(false)
    setCategoriesOpen(false)
    setContentPage(null)
    setAccountSection(null)
  }

  const navigateHome = () => {
    resetToStorefront()
    setQuery('')
    setCategory('All')
    setCategoryId('')
    setCategoryRoutePath('')
    setSubcategory('')
    setSubcategoryId('')
    setSubcategoryRoutePath('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateToContentPage = (page) => {
    const pagePath = CONTENT_PAGE_PATHS[page]
    if (!pagePath) return
    if (window.location.pathname !== pagePath) {
      window.history.pushState(
        { prideContentPage: page, prideContentPageReturn: true },
        '',
        pagePath,
      )
    }
    setSuccessfulOrder(null)
    setCheckoutOpen(false)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setProductsOpen(false)
    setCategoriesOpen(false)
    setAccountSection(null)
    setContentPage(page)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeContentPage = () => {
    if (
      getContentPageFromPath(window.location.pathname) &&
      window.history.state?.prideContentPageReturn
    ) {
      window.history.back()
      return
    }
    navigateHome()
  }

  const navigateToProducts = (nextCategory = 'All', nextQuery = '') => {
    const productsPath = createProductsPath(nextCategory, nextQuery)
    if (!productsOpen) {
      productsReturnCatalog.current = { query, category }
    }
    if (`${window.location.pathname}${window.location.search}` !== productsPath) {
      window.history.pushState(
        {
          prideProducts: true,
          prideProductsReturn: true,
          category: nextCategory,
        },
        '',
        productsPath,
      )
    }
    productsHistoryActive.current = true
    setSuccessfulOrder(null)
    setCheckoutOpen(false)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setContentPage(null)
    setCategoriesOpen(false)
    setAccountSection(null)
    setQuery(nextQuery)
    setCategory(nextCategory)
    setCategoryId('')
    setCategoryRoutePath('')
    setSubcategory('')
    setSubcategoryId('')
    setSubcategoryRoutePath('')
    setProductsOpen(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const navigateToCategory = (selectedCategory) => {
    const nextCategory = selectedCategory?.name || String(selectedCategory || '')
    if (!nextCategory) return
    const categoryRoute = selectedCategory?.id
      ? taxonomyRoutes.categories.find((item) => String(item.id) === String(selectedCategory.id))
      : taxonomyRoutes.categories.find((item) => item.name.trim().toLowerCase() === nextCategory.trim().toLowerCase())
    if (!categoryRoute) return
    if (!productsOpen) {
      productsReturnCatalog.current = { query, category }
    }
    window.history.pushState(
      {
        prideProducts: true,
        prideProductsReturn: true,
        category: nextCategory,
      },
      '',
      categoryRoute.path,
    )
    productsHistoryActive.current = true
    setSuccessfulOrder(null)
    setCheckoutOpen(false)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setContentPage(null)
    setCategoriesOpen(false)
    setAccountSection(null)
    setQuery('')
    setCategory(nextCategory)
    setCategoryId(categoryRoute.id)
    setCategoryRoutePath(categoryRoute.path)
    setSubcategory('')
    setSubcategoryId('')
    setSubcategoryRoutePath('')
    setProductsOpen(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const navigateToCategories = () => {
    if (window.location.pathname !== '/categories') {
      window.history.pushState(
        { prideCategories: true, prideCategoriesReturn: true },
        '',
        '/categories',
      )
    }
    setSuccessfulOrder(null)
    setCheckoutOpen(false)
    setSelectedProduct(null)
    setReviewsOpen(false)
    setProductsOpen(false)
    setContentPage(null)
    setAccountSection(null)
    setCategoriesOpen(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeCategories = () => {
    if (window.history.state?.prideCategoriesReturn) {
      window.history.back()
      return
    }
    navigateHome()
  }

  const closeProducts = () => {
    const currentPublicPath = parsePublicPath(window.location.pathname)
    if (
      (window.location.pathname === '/products' ||
        currentPublicPath?.type === 'products' ||
        currentPublicPath?.type === 'category') &&
      window.history.state?.prideProductsReturn
    ) {
      window.history.back()
      return
    }
    setProductsOpen(false)
    navigateHome()
  }

  const handleProductsCategory = (nextCategory, selectedCategoryRecord) => {
    const categoryName = typeof nextCategory === 'object' ? nextCategory.name : nextCategory
    const categoryRoute = categoryName === 'All'
      ? null
      : selectedCategoryRecord?.id || (typeof nextCategory === 'object' && nextCategory.id)
        ? taxonomyRoutes.categories.find((item) => String(item.id) === String(selectedCategoryRecord?.id || nextCategory.id))
        : taxonomyRoutes.categories.find((item) => item.name.trim().toLowerCase() === String(categoryName).trim().toLowerCase())
    if (categoryName !== 'All' && !categoryRoute) return
    const nextPath = categoryRoute?.path || createProductsPath('All', query)
    const nextUrl = new URL(nextPath, window.location.origin)
    if (query.trim()) nextUrl.searchParams.set('query', query.trim())
    setSubcategory('')
    setSubcategoryRoutePath('')
    window.history.replaceState(
      {
        ...window.history.state,
        prideProducts: true,
        category: categoryName,
      },
      '',
      `${nextUrl.pathname}${nextUrl.search}`,
    )
    setCategory(categoryName)
    setCategoryId(categoryRoute?.id || '')
    setCategoryRoutePath(categoryRoute?.path || '')
    setSubcategoryId('')
    requestAnimationFrame(() =>
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }),
    )
  }

  const handleProductsSubcategory = (categoryName, nextSubcategory, categoryRecord, subcategoryRecord) => {
    const selectedCategoryRoute = categoryRecord?.id
      ? taxonomyRoutes.categories.find((item) => String(item.id) === String(categoryRecord.id))
      : taxonomyRoutes.categories.find((item) => item.name.trim().toLowerCase() === String(categoryName).trim().toLowerCase())
    const selectedSubcategoryRoute = subcategoryRecord?.id
      ? taxonomyRoutes.subcategories.find((item) => String(item.id) === String(subcategoryRecord.id))
      : taxonomyRoutes.subcategories.find((item) =>
          String(item.categoryId) === String(selectedCategoryRoute?.id) &&
          item.name.trim().toLowerCase() === String(nextSubcategory).trim().toLowerCase(),
        )
    if (!selectedCategoryRoute || !selectedSubcategoryRoute) return
    const nextUrl = new URL(selectedSubcategoryRoute.path, window.location.origin)
    if (query.trim()) nextUrl.searchParams.set('query', query.trim())
    window.history.replaceState(
      { ...window.history.state, prideProducts: true, category: categoryName, subcategory: nextSubcategory },
      '',
      `${nextUrl.pathname}${nextUrl.search}`,
    )
    setCategory(categoryName)
    setCategoryId(selectedCategoryRoute.id)
    setCategoryRoutePath(selectedCategoryRoute.path)
    setSubcategory(nextSubcategory)
    setSubcategoryId(selectedSubcategoryRoute.id)
    setSubcategoryRoutePath(selectedSubcategoryRoute.path)
  }

  const handleProductsSearch = (nextQuery) => {
    setQuery(nextQuery)
    const nextUrl = new URL(categoryRoutePath || createProductsPath('All'), window.location.origin)
    if (nextQuery.trim()) nextUrl.searchParams.set('query', nextQuery.trim())
    else nextUrl.searchParams.delete('query')
    window.history.replaceState(
      { ...window.history.state, prideProducts: true, category },
      '',
      `${nextUrl.pathname}${nextUrl.search}`,
    )
    requestAnimationFrame(() =>
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }),
    )
  }

  const handleSearchSubmit = (nextQuery) => {
    if (window.location.pathname === '/products') {
      setCategory('All')
      setQuery(nextQuery)
      window.history.replaceState(
        {
          ...window.history.state,
          prideProducts: true,
          category: 'All',
        },
        '',
        createProductsPath('All', nextQuery),
      )
      requestAnimationFrame(() =>
        document
          .getElementById('catalog')
          ?.scrollIntoView({ behavior: 'smooth' }),
      )
      return
    }
    if (window.location.pathname.startsWith('/product-category/')) {
      handleProductsSearch(nextQuery)
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
    const minimumOrderQuantity = getProductMinimumOrderQuantity(product)
    const minimumApplied = (Number(quantity) || 1) < minimumOrderQuantity
    notify(
      `${product.name} added to your cart${minimumApplied ? ` · MOQ ${minimumOrderQuantity} applied` : ''}`,
    )
  }

  const navigateToProduct = (product) => {
    if (!productHistoryActive.current)
      productReturnSection.current = accountSection
    productHistoryActive.current = true
    const productPath = getProductPath(product)
    if (window.location.pathname !== productPath)
      window.history.pushState({ prideProduct: product.id }, '', productPath)
    setSelectedProduct(product)
    setReviewsOpen(false)
    setCategoriesOpen(false)
    setAccountSection(null)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeProductDetails = () => {
    if (
      window.location.pathname.startsWith('/product/')
    ) {
      if (!window.history.state?.prideProduct && window.location.pathname.startsWith('/product/')) {
        navigateHome()
        return
      }
      window.history.back()
      return
    }
    setSelectedProduct(null)
  }

  const navigateToReviews = () => {
    if (!liveSelectedProduct) return
    const productPath = getProductPath(liveSelectedProduct)
    const reviewsPath = `${productPath}/reviews`
    if (window.location.pathname !== reviewsPath)
      window.history.pushState(
        { prideProductReviews: liveSelectedProduct.id },
        '',
        reviewsPath,
      )
    setReviewsOpen(true)
    window.scrollTo({ top: 0, behavior: 'auto' })
  }

  const closeReviews = () => {
    if (
      window.location.pathname.endsWith('/reviews')
    ) {
      if (window.history.state?.prideProductReviews) {
        window.history.back()
      } else if (liveSelectedProduct) {
        window.history.replaceState(
          { prideProduct: liveSelectedProduct.id },
          '',
          getProductPath(liveSelectedProduct),
        )
        setReviewsOpen(false)
      }
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
    if (window.location.pathname !== route.path) {
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
    setCategoriesOpen(false)
    setContentPage(null)
    if (route.page === 'order-success') {
      const savedOrder = getSessionItems(ORDER_SUCCESS_SESSION_KEY, null)
      orderSuccessHistoryActive.current = Boolean(savedOrder)
      setSuccessfulOrder(savedOrder)
      setCheckoutOpen(false)
      setAccountSection(savedOrder ? null : 'orders')
    } else if (route.page === 'checkout') {
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
    if (window.location.pathname === '/order-success') {
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
      getProtectedRoute(window.location.pathname)
    ) {
      window.history.replaceState(
        null,
        '',
        '/',
      )
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
    const path = CONTENT_PAGE_PATHS[policyKey]
    if (path) {
      window.open(path, '_blank')
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
    await loadCashfreeScript()
    const placedMoment = createOrderMoment()
    const order = {
      clientRequestId: checkoutDetails.requestId,
      checkoutMode:
        checkoutSelection?.mode === 'buy-now' ? 'buy-now' : 'cart',
      expectedTotalPaise: checkoutDetails.expectedTotalPaise,
      customer: user?.name || 'Pride customer',
      email: user?.email || '',
      date: placedMoment.date,
      total: formatCurrency(checkoutDetails.total ?? cart.subtotal),
      discount: checkoutDetails.discount || 0,
      deliveryCharges: checkoutDetails.shipping || 0,
      taxAmount: checkoutDetails.tax || 0,
      couponCode: checkoutDetails.couponCode || '',
      itemsCount: activeCheckoutItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      status: 'Pending',
      orderTime: placedMoment.time,
      deliveryDate:
        checkoutDetails.delivery?.estimatedDate || 'Being scheduled',
      deliveryOption: checkoutDetails.delivery?.name || 'Standard delivery',
      paymentStatus: 'Pending',
      paymentDate: null,
      shippingAddress: checkoutDetails.address || null,
      billingAddress:
        checkoutDetails.billingAddress || checkoutDetails.address || null,
      gstProfile: checkoutDetails.gstProfile || null,
      deliveryId: checkoutDetails.delivery?.id || 'standard',
      paymentMethod: 'Cashfree',
      paymentEnvironment: 'Cashfree Production',
      items: activeCheckoutItems.map(checkoutItemRequest),
    }
    const placedResult = (await onNewOrder?.(order)) || { order }
    const savedOrder = placedResult.order || placedResult
    sessionStorage.setItem(ORDER_SUCCESS_SESSION_KEY, JSON.stringify(savedOrder))
    if (!placedResult.paymentSessionId || typeof window.Cashfree !== 'function') {
      throw new Error('Cashfree checkout could not be loaded. Please try again.')
    }
    const cashfree = window.Cashfree({ mode: 'production' })
    await cashfree.checkout({
      paymentSessionId: placedResult.paymentSessionId,
      redirectTarget: '_modal',
    })
    const verification = await verifyCustomerCashfreePayment(savedOrder.id)
    if (verification.order) Object.assign(savedOrder, verification.order)
    finalizePaidOrderLocally(savedOrder)
    setOrders((current) =>
      current.some((item) => item.id === savedOrder.id)
        ? current
        : [savedOrder, ...current],
    )
    sessionStorage.setItem(ORDER_SUCCESS_SESSION_KEY, JSON.stringify(savedOrder))
    orderSuccessHistoryActive.current = true
    window.history.replaceState(
      { prideOrderSuccess: savedOrder.id },
      '',
      '/order-success',
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

  const handleVerifyCashfreeOrder = async () => {
    if (!successfulOrder?.id) return
    try {
      const result = await verifyCustomerCashfreePayment(successfulOrder.id)
      const verifiedOrder = result.order
      if (!verifiedOrder) return
      finalizePaidOrderLocally(verifiedOrder)
      setSuccessfulOrder(verifiedOrder)
      setOrders((current) => current.map((order) =>
        order.id === verifiedOrder.id ? verifiedOrder : order,
      ))
      sessionStorage.setItem(ORDER_SUCCESS_SESSION_KEY, JSON.stringify(verifiedOrder))
    } catch (error) {
      notify(error.message || 'Payment status is still being confirmed.')
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
      getProtectedRoute(window.location.pathname),
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
  const requestedPublicRoute = parsePublicPath(window.location.pathname)
  const isProductRoute = requestedPublicRoute?.type === 'product'
  const publicProductPending =
    isProductRoute &&
    !liveSelectedProduct &&
    (productsLoading || productRouteStatus === 'pending')
  const publicProductNotFound =
    isProductRoute &&
    !liveSelectedProduct &&
    productRouteStatus === 'not-found'
  const publicProductError =
    isProductRoute &&
    !liveSelectedProduct &&
    !productsLoading &&
    (productsError || productRouteStatus === 'error')

  useEffect(() => {
    const destinationReady = isProductRoute
      ? Boolean(liveSelectedProduct) || publicProductNotFound || publicProductError
      : !productsLoading
    if (destinationReady) {
      document.documentElement.dataset.prideAppReady = 'true'
    }
  }, [isProductRoute, liveSelectedProduct, productsLoading, publicProductError, publicProductNotFound])

  return (
    <div className="customer-shell min-h-screen overflow-x-clip bg-[#f7f8f5] pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-16 lg:pb-0">
      {!isProductRoute && !liveSelectedProduct && !ContentPage && !productsOpen && !categoriesOpen && !checkoutOpen && !successfulOrder && !accountSection && <HomeSeo />}
      {!isProductRoute && categoriesOpen && <CategoriesSeo />}
      {isProductRoute && liveSelectedProduct && <ProductSeo product={liveSelectedProduct} />}
      {isProductRoute && publicProductNotFound && <ProductSeo product={null} notFound />}
      {!isProductRoute && !liveSelectedProduct && productsOpen && (
        <CatalogSeo
          category={category}
          subcategory={subcategory}
          routePath={subcategoryRoutePath || categoryRoutePath}
          products={filteredProducts}
        />
      )}
      <Header
        products={products}
        searchQuery={query}
        user={user}
        authStatus={authStatus}
        cartCount={cart.count}
        wishlistCount={user ? likedIds.length : 0}
        accountSection={accountSection}
        productsOpen={productsOpen}
        contentPageOpen={Boolean(ContentPage) || categoriesOpen}
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
        hidePhoneNavigation={authOpen && !passwordResetActionRequested}
      />
      <Suspense
        fallback={
          <section className="grid min-h-[55vh] place-items-center px-6 text-center" aria-live="polite" aria-busy="true">
            <div>
              <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#75916f]/25 border-t-[#536a50]" />
              <p className="mt-4 text-sm font-bold text-[#425443]">Loading page…</p>
            </div>
          </section>
        }
      >
      <main>
        {publicProductPending ? (
          <section className="grid min-h-[55vh] place-items-center px-6 text-center" aria-live="polite" aria-busy="true">
            <div>
              <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#75916f]/25 border-t-[#536a50]" />
              <p className="mt-4 text-sm font-bold text-[#425443]">Loading product details…</p>
            </div>
          </section>
        ) : publicProductNotFound ? (
          <section className="grid min-h-[55vh] place-items-center px-6 text-center">
            <div className="max-w-md rounded-[28px] bg-white p-8 shadow-sm">
              <h1 className="text-lg font-extrabold text-slate-900">Product not found</h1>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">This product is not available from Pride Circuit.</p>
              <button type="button" onClick={() => navigateToProducts('All')} className="mt-5 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white">Browse products</button>
            </div>
          </section>
        ) : publicProductError ? (
          <section className="grid min-h-[55vh] place-items-center px-6 text-center">
            <div className="max-w-md rounded-[28px] bg-white p-8 shadow-sm">
              <h1 className="text-lg font-extrabold text-slate-900">Product details are temporarily unavailable</h1>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">We could not load the public catalog. Please retry in a moment.</p>
              <button type="button" onClick={onRetryProducts} className="mt-5 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white">Retry loading</button>
            </div>
          </section>
        ) : protectedAuthPending || protectedDataPending ? (
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
            onVerifyPayment={handleVerifyCashfreeOrder}
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
        ) : categoriesOpen ? (
          <AllCategoriesPage
            categories={categories}
            products={products}
            onBack={closeCategories}
            onSelect={navigateToCategory}
          />
        ) : ContentPage ? (
          <ContentPage onBack={closeContentPage} />
        ) : productsOpen ? (
          <ProductsPage
            products={products}
            filteredProducts={filteredProducts}
            suggestedProducts={suggestedProducts}
            categories={categories}
            subcategories={subcategories}
            query={query}
            activeCategory={category}
            activeCategoryId={categoryId}
            activeSubcategory={subcategory}
            sortBy={sortBy}
            likedIds={user ? likedIds : []}
            loading={productsLoading}
            error={productsError}
            onRetry={onRetryProducts}
            onBack={closeProducts}
            onQueryChange={setQuery}
            onSearchSubmit={handleProductsSearch}
            onCategoryChange={handleProductsCategory}
            onSubcategoryChange={handleProductsSubcategory}
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
              categories={categories}
              products={products}
              promotions={marketingSettings?.categoryPromotions}
              onSelect={navigateToCategory}
              onViewAll={navigateToCategories}
            />
            <HomepageProductSections
              products={products}
              categories={categories}
              featuredProductIds={marketingSettings?.featuredProductIds || []}
              likedIds={user ? likedIds : []}
              onLike={handleLike}
              onAdd={handleAdd}
              onBuyNow={handleBuyNow}
              onView={navigateToProduct}
            />
          </HomeScrollReveal>
        )}
      </main>
      </Suspense>
      {!checkoutOpen && (
        <Footer
          onBeSellerClick={onBeSellerClick}
          onPageOpen={navigateToContentPage}
        />
      )}

      {authOpen && !passwordResetActionRequested && (
        <Suspense fallback={null}>
          <AuthModal
            key={authInitialMode}
            initialMode={authInitialMode}
            open
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
        </Suspense>
      )}
      {passwordResetActionRequested && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      {authStatus === 'authenticated' && user && accountReady && !protectedDataPending && !protectedDataError && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      {logoutConfirmOpen && (
        <Suspense fallback={null}>
          <LogoutConfirmation
            onCancel={() => setLogoutConfirmOpen(false)}
            onConfirm={() => {
              setLogoutConfirmOpen(false)
              handleLogout()
            }}
          />
        </Suspense>
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
