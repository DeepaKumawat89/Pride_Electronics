import { createPaymentRecords } from './payments.js'
import { formatCurrency, parsePrice } from '../../user/utils/currency.js'

const normalized = (value) => String(value || '').trim().toLowerCase()

const matchesCustomer = (customer, order) =>
  (customer.email && normalized(customer.email) === normalized(order.email)) ||
  (!order.email && normalized(customer.name) === normalized(order.customer))

const uniqueAddresses = (addresses) => {
  const seen = new Set()
  return addresses.filter((address) => {
    if (!address) return false
    const key =
      typeof address === 'string'
        ? normalized(address)
        : normalized(
            [address.line1, address.city, address.state, address.pincode].join(
              '|',
            ),
          )
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildCustomerProfile(
  customer,
  orders = [],
  refunds = [],
  returnRequests = [],
) {
  const customerOrders = orders
    .filter((order) => matchesCustomer(customer, order))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const linkedRefunds = refunds.filter((refund) =>
    customerOrders.some((order) => order.id === refund.orderId),
  )
  const linkedReturns = returnRequests.filter((request) =>
    customerOrders.some((order) => order.id === request.orderId),
  )
  const orderSpend = customerOrders.reduce(
    (sum, order) => sum + parsePrice(order.total),
    0,
  )
  const addresses = uniqueAddresses([
    ...(customer.addresses || []),
    ...customerOrders.map((order) => order.shippingAddress),
  ])

  return {
    ...customer,
    phone:
      customer.phone ||
      customer.mobile ||
      addresses.find((address) => typeof address !== 'string')?.phone ||
      '',
    registrationDate: customer.registrationDate || customer.joinedDate,
    totalOrders: Math.max(
      Number(customer.ordersCount || 0),
      customerOrders.length,
    ),
    totalSpending: customer.totalSpent || formatCurrency(orderSpend),
    lastOrder: customerOrders[0] || null,
    orders: customerOrders,
    wishlist: customer.wishlist || customer.wishlistProducts || [],
    addresses,
    reviews: customer.reviews || [],
    returns:
      linkedReturns.length > 0
        ? linkedReturns
        : customerOrders.filter(
            (order) =>
              ['Returned', 'Refunded'].includes(order.status) ||
              order.returnDisposition,
          ),
    payments: createPaymentRecords(customerOrders, linkedRefunds),
  }
}

export function createCustomerFromUser(user, date = new Date()) {
  return {
    id: `USR-${date.getTime()}`,
    name: user.name || 'Pride Customer',
    email: normalized(user.email),
    phone: user.phone || user.mobile || '',
    role: 'Customer',
    ordersCount: 0,
    totalSpent: formatCurrency(0),
    status: 'Active',
    joinedDate: date.toISOString().slice(0, 10),
  }
}
