import { normalizeAddress } from './address.js'

export const ACCOUNT_LIMITS = {
  wishlist: 200,
  addresses: 20,
  paymentMethods: 10,
  cart: 100,
  savedCart: 100,
}

const list = (value) => (Array.isArray(value) ? value : [])
const uniqueBy = (values, keyFor, limit) => [
  ...new Map(values.map((value) => [keyFor(value), value])).values(),
].slice(0, limit)

export const normalizeAccountState = (account = {}) => ({
  wishlistIds: uniqueBy(
    list(account.wishlistIds).filter((id) => id !== null && id !== undefined),
    (id) => String(id),
    ACCOUNT_LIMITS.wishlist,
  ),
  addresses: uniqueBy(
    list(account.addresses)
      .filter((address) => address && typeof address === 'object')
      .map(normalizeAddress),
    (address) => String(address.id),
    ACCOUNT_LIMITS.addresses,
  ),
  paymentMethods: uniqueBy(
    list(account.paymentMethods).filter(
      (payment) => payment && typeof payment === 'object',
    ),
    (payment) => String(payment.id),
    ACCOUNT_LIMITS.paymentMethods,
  ),
  cartItems: uniqueBy(
    list(account.cartItems)
      .filter((item) => item?.productId !== null && item?.productId !== undefined)
      .map((item) => ({
        productId: item.productId,
        quantity: Math.max(1, Math.min(100, Number(item.quantity) || 1)),
      })),
    (item) => String(item.productId),
    ACCOUNT_LIMITS.cart,
  ),
  savedCartItems: uniqueBy(
    list(account.savedCartItems)
      .map((item) => ({ productId: item?.productId ?? item }))
      .filter(
        (item) => item.productId !== null && item.productId !== undefined,
      ),
    (item) => String(item.productId),
    ACCOUNT_LIMITS.savedCart,
  ),
})

export const mergeInitialGuestAccount = (remoteAccount, guestAccount) => {
  const remote = normalizeAccountState(remoteAccount)
  const guest = normalizeAccountState(guestAccount)
  const cartItems = uniqueBy(
    [...remote.cartItems, ...guest.cartItems],
    (item) => String(item.productId),
    ACCOUNT_LIMITS.cart,
  )
  const cartProductIds = new Set(cartItems.map((item) => String(item.productId)))
  return normalizeAccountState({
    ...remote,
    wishlistIds: [...remote.wishlistIds, ...guest.wishlistIds],
    cartItems,
    savedCartItems: [...remote.savedCartItems, ...guest.savedCartItems].filter(
      (item) => !cartProductIds.has(String(item.productId)),
    ),
  })
}

export const emptyAccountState = () => normalizeAccountState()
