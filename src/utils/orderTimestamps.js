export const ORDER_TIME_ZONE = 'Asia/Kolkata'

const asDate = (value) => {
  if (!value) return null
  const candidate = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(candidate.getTime()) ? null : candidate
}

export const formatOrderDate = (value, fallback = '') => {
  const date = asDate(value)
  return date
    ? date.toLocaleDateString('en-IN', {
        timeZone: ORDER_TIME_ZONE,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : fallback
}

export const formatOrderTime = (value, fallback = '') => {
  const date = asDate(value)
  return date
    ? date.toLocaleTimeString('en-IN', {
        timeZone: ORDER_TIME_ZONE,
        hour: 'numeric',
        minute: '2-digit',
      })
    : fallback
}

export const createOrderMoment = (value = new Date()) => {
  const date = asDate(value) || new Date()
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: ORDER_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
  return {
    timestamp: date.toISOString(),
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: formatOrderTime(date),
  }
}

export const getOrderPlacedMoment = (order = {}) => {
  const placedEvent = (order.statusHistory || [])[0]
  const timestamp = placedEvent?.timestamp || order.createdAt || order.invoiceDate
  return {
    date: formatOrderDate(timestamp, placedEvent?.date || order.date || 'Not recorded'),
    time: formatOrderTime(timestamp, placedEvent?.time || order.orderTime || ''),
  }
}

export const getStatusMoment = (event = {}, fallbackDate = '', fallbackTime = '') => ({
  date: formatOrderDate(event.timestamp, event.date || fallbackDate),
  time: formatOrderTime(event.timestamp, event.time || fallbackTime),
})
