import { formatCurrency, parsePrice } from '../../user/utils/currency.js'

const normalized = (value) => String(value || '').trim().toLowerCase()

const matchesCustomer = (customer, order) =>
  (customer.email && normalized(customer.email) === normalized(order.email)) ||
  (!order.email && normalized(customer.name) === normalized(order.customer))

export function buildCustomerProfile(
  customer,
  orders = [],
) {
  const customerOrders = orders
    .filter((order) => matchesCustomer(customer, order))
    .sort((a, b) => new Date(b.date) - new Date(a.date))
  const orderSpend = customerOrders.reduce(
    (sum, order) => sum + parsePrice(order.total),
    0,
  )
  return {
    ...customer,
    phone:
      customer.phone ||
      customer.mobile || '',
    registrationDate: customer.registrationDate || customer.joinedDate,
    totalOrders: Math.max(
      Number(customer.ordersCount || 0),
      customerOrders.length,
    ),
    totalSpending: customer.totalSpent || formatCurrency(orderSpend),
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
