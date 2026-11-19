import { formatCurrency, parsePrice } from '../../user/utils/currency.js'

const normalizedText = (value) => String(value || '').trim().toLowerCase()

export const getPaymentTransactionId = (order) =>
  order.transactionId ||
  order.paymentId ||
  `PAY-${String(order.id || 'UNKNOWN').replace(/^ORD-?/i, '')}`

export function getPaymentStatus(order, refund) {
  const refundState = normalizedText(refund?.providerStatus || refund?.status)
  if (refundState === 'success' || normalizedText(order.paymentStatus) === 'refunded') {
    return 'Refunded'
  }
  if (['pending', 'pending_approval', 'onhold', 'processing'].includes(refundState) || normalizedText(order.paymentStatus) === 'refund pending') return 'Refund Pending'
  if (['failed', 'cancelled', 'rejected', 'request_failed', 'action required'].includes(refundState) ||
      ['refund failed', 'refund action required'].includes(normalizedText(order.paymentStatus))) return 'Refund Action Required'
  const paymentStatus = normalizedText(order.paymentStatus)
  if (paymentStatus === 'cancelled') return 'Cancelled'
  if (['failed', 'declined'].includes(paymentStatus)) {
    return 'Failed'
  }
  if (
    ['paid', 'captured', 'authorized', 'verified', 'successful'].includes(
      paymentStatus,
    )
  ) {
    return 'Successful'
  }
  return ['Confirmed', 'Processing', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered'].includes(
    order.status,
  )
    ? 'Successful'
    : 'Pending'
}

export function createPaymentRecords(orders, refunds = []) {
  const refundsByOrder = new Map()
  refunds.forEach((refund) => {
    const key = String(refund.orderId)
    refundsByOrder.set(key, [...(refundsByOrder.get(key) || []), refund])
  })
  return orders.map((order) => {
    const candidates = refundsByOrder.get(String(order.id)) || []
    const refund = candidates.find((record) =>
      ['PENDING', 'PENDING_APPROVAL', 'ONHOLD', 'PROCESSING', 'FAILED', 'CANCELLED', 'REJECTED', 'REQUEST_FAILED'].includes(String(record.providerStatus || '').toUpperCase()),
    ) || candidates.find((record) => String(record.providerStatus || '').toUpperCase() === 'SUCCESS')
    return {
      id: getPaymentTransactionId(order),
      orderId: order.orderNumber || order.id,
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
