export const getOrderDisplayId = (order = {}) =>
  String(order.orderNumber || order.id || '')

