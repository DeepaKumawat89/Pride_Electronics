import { formatCurrency, parsePrice } from '../../user/utils/currency.js'

const normalizedText = (value) => String(value || '').trim().toLowerCase()

export const getPaymentTransactionId = (order) =>
  order.razorpayPaymentId ||
  order.transactionId ||
  order.paymentId ||
  `PAY-${String(order.id || 'UNKNOWN').replace(/^ORD-?/i, '')}`

export function getPaymentStatus(order, refund) {
  if (refund || normalizedText(order.paymentStatus) === 'refunded') {
    return 'Refunded'
  }
  const paymentStatus = normalizedText(order.paymentStatus)
  if (['failed', 'declined', 'cancelled'].includes(paymentStatus)) {
    return 'Failed'
  }
  if (
    ['paid', 'captured', 'authorized', 'verified', 'successful'].includes(
      paymentStatus,
    )
  ) {
    return 'Successful'
  }
  if (/cash|cod|pay on delivery/i.test(order.paymentMethod || '')) {
    return order.status === 'Delivered' ? 'Successful' : 'Pending'
  }
  return ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(
    order.status,
  )
    ? 'Successful'
    : 'Pending'
}

export function createPaymentRecords(orders, refunds = []) {
  const refundByOrder = new Map(
    refunds.map((refund) => [String(refund.orderId), refund]),
  )
  return orders.map((order) => {
    const refund = refundByOrder.get(String(order.id))
    return {
      id: getPaymentTransactionId(order),
      orderId: order.id,
      customer: order.customer || 'Customer not available',
      email: order.email || '',
      amount: formatCurrency(parsePrice(order.total)),
      method: order.paymentMethod || 'Online payment',
      status: getPaymentStatus(order, refund),
      date: order.paymentDate || order.date,
      orderStatus: order.status,
      refund,
    }
  })
}

export function createRefundRecord(order, timestamp = new Date()) {
  const refundDate = timestamp instanceof Date ? timestamp : new Date(timestamp)
  return {
    id: `RFND-${refundDate.getTime()}-${String(order.id).replace(/^ORD-?/i, '')}`,
    orderId: order.id,
    paymentId: getPaymentTransactionId(order),
    customer: order.customer || 'Customer not available',
    amount: formatCurrency(parsePrice(order.total)),
    status: 'Refunded',
    date: refundDate.toISOString(),
  }
}

export function initializeRefundRecords(orders) {
  return orders
    .filter(
      (order) =>
        order.status === 'Refunded' ||
        normalizedText(order.paymentStatus) === 'refunded',
    )
    .map((order) =>
      createRefundRecord(order, new Date(`${order.date}T12:00:00`)),
    )
}
