const protectedRoutes = Object.freeze({
  '/account': { section: 'profile' },
  '/profile': { section: 'profile' },
  '/wishlist': { section: 'wishlist' },
  '/cart': { section: 'cart' },
  '/orders': { section: 'orders' },
  '/checkout': { page: 'checkout' },
  '/saved-address': { section: 'address' },
  '/saved-cards': { section: 'payment' },
  '/coupons': { section: 'coupons' },
})

const sectionPaths = Object.freeze({
  profile: '/account',
  wishlist: '/wishlist',
  cart: '/cart',
  orders: '/orders',
  address: '/saved-address',
  payment: '/saved-cards',
  coupons: '/coupons',
})

function normalizePathname(pathname = '/') {
  const path = String(pathname).split(/[?#]/, 1)[0] || '/'
  if (path === '/') return path
  return path.replace(/\/+$/, '') || '/'
}

export function getProtectedRoute(pathname) {
  const path = normalizePathname(pathname)
  const route = protectedRoutes[path]
  return route ? { path, ...route } : null
}

export function getProtectedPathForSection(section) {
  return sectionPaths[section] || null
}

export const CHECKOUT_PATH = '/checkout'
