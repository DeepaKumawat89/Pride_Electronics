const {
  db,
  HttpsError,
  onCall,
  callableOptions,
  isAdmin,
  requireUser,
  requireActiveCustomer,
  validateInvoiceSnapshot,
  cleanObject,
} = require('../shared/core')

async function getOrderInvoiceHandler(request) {
  const canManageInvoices =
    isAdmin(request.auth?.token)
  const uid = canManageInvoices
    ? requireUser(request)
    : await requireActiveCustomer(request)
  const orderId = String(request.data?.orderId || '').trim()
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(orderId)) {
    throw new HttpsError('invalid-argument', 'A valid order is required.')
  }

  const [orderDocument, invoiceDocument] = await Promise.all([
    db.doc(`orders/${orderId}`).get(),
    db.doc(`invoices/${orderId}`).get(),
  ])
  if (!orderDocument.exists) {
    throw new HttpsError('not-found', 'Order not found.')
  }

  const order = orderDocument.data()
  if (!canManageInvoices) {
    if (order.userId !== uid) {
      throw new HttpsError('permission-denied', 'This order belongs to another account.')
    }
    if (order.status !== 'Delivered') {
      throw new HttpsError(
        'failed-precondition',
        'The invoice will be available after this order is delivered.',
      )
    }
  }

  const invoiceRecord = invoiceDocument.data()
  const invoice = invoiceRecord?.invoice || order.invoice
  if (
    !invoice ||
    (invoiceRecord && (
      invoiceRecord.orderId !== orderId ||
      invoiceRecord.userId !== order.userId
    ))
  ) {
    throw new HttpsError('not-found', 'A verified invoice is not available for this order.')
  }
  try {
    validateInvoiceSnapshot(invoice, {
      gstRequired: Boolean(invoice.buyer?.gst),
      gstEnabled: Boolean(invoice.seller?.gstin),
    })
  } catch {
    throw new HttpsError('data-loss', 'The stored invoice could not be validated.')
  }

  const orderItems = Array.isArray(order.items) ? order.items : []
  const invoiceWithStoredHsn = {
    ...invoice,
    lineItems: (Array.isArray(invoice.lineItems) ? invoice.lineItems : []).map(
      (invoiceItem, index) => {
        const invoiceHsnCode = String(invoiceItem?.hsnCode || '').trim()
        if (/^[0-9]{8}$/.test(invoiceHsnCode)) {
          return { ...invoiceItem, hsnCode: invoiceHsnCode }
        }

        const indexedItem = orderItems[index]
        const matchesInvoiceItem = (orderItem) => {
          if (!orderItem) return false
          const productId = String(invoiceItem?.productId || '')
          const storedProductId = String(orderItem.productId || '')
          if (productId) {
            return (
              productId === storedProductId &&
              String(invoiceItem?.variantId || '') === String(orderItem.variantId || '')
            )
          }
          const sku = String(invoiceItem?.sku || '').trim()
          return Boolean(sku) && sku === String(orderItem.sku || '').trim()
        }
        const matchingItem =
          matchesInvoiceItem(indexedItem)
            ? indexedItem
            : orderItems.find(matchesInvoiceItem)
        const storedHsnCode = String(matchingItem?.hsnCode || '').trim()
        return {
          ...invoiceItem,
          hsnCode: /^[0-9]{8}$/.test(storedHsnCode) ? storedHsnCode : '',
        }
      },
    ),
  }

  return { invoice: cleanObject(invoiceWithStoredHsn) }
}

const getOrderInvoice = onCall(callableOptions, getOrderInvoiceHandler)


module.exports = { getOrderInvoice, getOrderInvoiceHandler }

