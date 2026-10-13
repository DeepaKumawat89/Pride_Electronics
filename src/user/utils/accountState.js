import { normalizeAddress } from './address.js'
import { variantCartKey } from '../../utils/productVariants.js'

export const ACCOUNT_LIMITS = {
  wishlist: 200,
  addresses: 20,
  paymentMethods: 10,
  cart: 100,
  savedCart: 100,
}

const list = (value) => (Array.isArray(value) ? value : [])
const text = (value, max) => String(value || '').trim().slice(0, max)
const uniqueBy = (values, keyFor, limit) => [
  ...new Map(values.map((value) => [keyFor(value), value])).values(),
].slice(0, limit)

const normalizeSavedAddress = (value) => {
  const address = normalizeAddress(value)
  const houseFlat = text(address.houseFlat, 150)
  const street = text(address.street, 200)
  const area = text(address.area, 150)
  return {
    id: text(address.id, 100),
    type: ['Shipping', 'Billing'].includes(address.type)
      ? address.type
      : 'Shipping',
    label: text(address.label || 'Home', 30),
    fullName: text(address.fullName, 100),
    phone: String(address.phone || '').replace(/\D/g, '').slice(-10),
    houseFlat,
    street,
    area,
    line1: text(
      [houseFlat, street, area].filter(Boolean).join(', ') || address.line1,
      500,
    ),
    landmark: text(address.landmark, 150),
    city: text(address.city, 100),
    state: text(address.state, 100),
    pincode: text(address.pincode, 6),
    isDefault: address.isDefault === true,
  }
}

const normalizeSavedPayment = (payment) => {
  const type = ['UPI', 'Debit Card', 'Credit Card'].includes(payment.type)
    ? payment.type
    : 'UPI'
  return {
    id: text(payment.id, 100),
    type,
    holder: text(payment.holder, 100),
    last4:
      type === 'UPI'
        ? ''
        : String(payment.last4 || '').replace(/\D/g, '').slice(-4),
    expiry: type === 'UPI' ? '' : text(payment.expiry, 7),
    upiId: type === 'UPI' ? text(payment.upiId, 100) : '',
    isDefault: payment.isDefault === true,
  }
}

export const normalizeAccountState = (account = {}) => ({
  wishlistIds: uniqueBy(
    list(account.wishlistIds)
      .filter((id) => id !== null && id !== undefined)
      .map((id) => text(id, 100))
      .filter(Boolean),
    (id) => String(id),
    ACCOUNT_LIMITS.wishlist,
  ),
  addresses: uniqueBy(
    list(account.addresses)
      .filter((address) => address && typeof address === 'object')
      .map(normalizeSavedAddress)
      .filter((address) => address.id),
    (address) => String(address.id),
    ACCOUNT_LIMITS.addresses,
  ),
  paymentMethods: uniqueBy(
    list(account.paymentMethods)
      .filter((payment) => payment && typeof payment === 'object')
      .map(normalizeSavedPayment)
      .filter((payment) => payment.id),
    (payment) => String(payment.id),
    ACCOUNT_LIMITS.paymentMethods,
  ),
  cartItems: uniqueBy(
    list(account.cartItems)
      .filter((item) => item?.productId !== null && item?.productId !== undefined)
      .map((item) => ({
        productId: text(item.productId, 100),
        ...(item.variantId ? { variantId: text(item.variantId, 100) } : {}),
        quantity: Math.max(1, Math.min(100, Number(item.quantity) || 1)),
      }))
      .filter((item) => item.productId),
    (item) => variantCartKey(item.productId, item.variantId),
    ACCOUNT_LIMITS.cart,
  ),
  savedCartItems: uniqueBy(
    list(account.savedCartItems)
      .map((item) => ({
        productId: text(item?.productId ?? item, 100),
        ...(item?.variantId ? { variantId: text(item.variantId, 100) } : {}),
      }))
      .filter(
        (item) => item.productId !== null && item.productId !== undefined,
      )
      .filter((item) => item.productId),
    (item) => variantCartKey(item.productId, item.variantId),
    ACCOUNT_LIMITS.savedCart,
  ),
})

export const mergeInitialGuestAccount = (remoteAccount, guestAccount) => {
  const remote = normalizeAccountState(remoteAccount)
  const guest = normalizeAccountState(guestAccount)
  const cartItems = uniqueBy(
    [...remote.cartItems, ...guest.cartItems],
    (item) => variantCartKey(item.productId, item.variantId),
    ACCOUNT_LIMITS.cart,
  )
  const cartProductIds = new Set(
    cartItems.map((item) => variantCartKey(item.productId, item.variantId)),
  )
  return normalizeAccountState({
    ...remote,
    wishlistIds: [...remote.wishlistIds, ...guest.wishlistIds],
    cartItems,
    savedCartItems: [...remote.savedCartItems, ...guest.savedCartItems].filter(
      (item) => !cartProductIds.has(variantCartKey(item.productId, item.variantId)),
    ),
  })
}

export const emptyAccountState = () => normalizeAccountState()

export const ensureSingleDefaultAddress = (addresses = []) => {
  const normalized = normalizeAccountState({ addresses }).addresses
  const defaultIndex = normalized.findIndex((address) => address.isDefault)
  return normalized.map((address, index) => ({
    ...address,
    isDefault: index === (defaultIndex >= 0 ? defaultIndex : 0),
  }))
}

export const upsertSavedAddress = (addresses, address, newId) => {
  const savedAddress = normalizeAddress({
    ...address,
    id: address.id || newId,
  })
  const exists = addresses.some(
    (item) => String(item.id) === String(savedAddress.id),
  )
  let nextAddresses = exists
    ? addresses.map((item) =>
        String(item.id) === String(savedAddress.id) ? savedAddress : item,
      )
    : [...addresses, savedAddress]
  if (savedAddress.isDefault) {
    nextAddresses = nextAddresses.map((item) => ({
      ...item,
      isDefault: String(item.id) === String(savedAddress.id),
    }))
  }
  nextAddresses = ensureSingleDefaultAddress(nextAddresses)
  return {
    addresses: nextAddresses,
    savedAddress: nextAddresses.find(
      (item) => String(item.id) === String(savedAddress.id),
    ),
    existed: exists,
  }
}

export const removeSavedAddress = (addresses, addressId) =>
  ensureSingleDefaultAddress(
    addresses.filter((item) => String(item.id) !== String(addressId)),
  )

export const setDefaultSavedAddress = (addresses, addressId) => {
  if (!addresses.some((item) => String(item.id) === String(addressId))) {
    return ensureSingleDefaultAddress(addresses)
  }
  return ensureSingleDefaultAddress(
    addresses.map((item) => ({
      ...item,
      isDefault: String(item.id) === String(addressId),
    })),
  )
}
