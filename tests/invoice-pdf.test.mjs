import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import {
  createInvoiceDownloadName,
  createInvoicePdfDocument,
} from '../src/user/components/profile/InvoicePdf.js'

const functionsRequire = createRequire(new URL('../functions/package.json', import.meta.url))
const { createInvoiceSnapshot } = functionsRequire('./invoice.js')

test('server invoice snapshot produces a downloadable PDF document', async () => {
  const invoice = createInvoiceSnapshot({
    orderId: 'PDF_ORDER_1',
    invoiceDate: '2026-10-14T08:00:00.000Z',
    invoiceSettings: {
      business: {
        legalName: 'PRIDE ELECTRONICS',
        displayName: 'Pride Electronics',
        address: '42 Silicon Avenue, Pune, Maharashtra 411057',
        phone: '+91 98765 43210',
        email: 'support@example.com',
        website: 'example.com',
        pan: 'AABCP1234F',
      },
      tax: {
        gstEnabled: true,
        gstin: '27AABCP1234F1Z5',
        state: 'Maharashtra',
        stateCode: '27',
        defaultRate: 18,
        pricesIncludeTax: true,
      },
      numbering: { prefix: 'PE', nextNumber: 7, padding: 5 },
    },
    quote: {
      items: [{
        productId: 'PRODUCT_1', productName: 'Industrial Sensor', sku: 'SENSOR-1',
        hsnCode: '85371000', qty: 1, price: 1180, taxRate: 18,
      }],
      sellingSubtotal: 1180,
      productDiscount: 0,
      couponDiscount: 0,
      shipping: 0,
      tax: 180,
      total: 1180,
    },
    customer: { name: 'Pride Customer', email: 'buyer@example.com' },
    shippingAddress: {
      fullName: 'Pride Customer', phone: '9876543210', line1: 'Delivery address',
      city: 'Pune', state: 'Maharashtra', pincode: '411001',
    },
    billingAddress: {
      fullName: 'Pride Customer', phone: '9876543210', line1: 'Billing address',
      city: 'Pune', state: 'Maharashtra', pincode: '411001',
    },
    payment: { method: 'UPI via Razorpay', status: 'Paid', transactionId: 'pay_123456' },
  })

  const { pdf, invoiceNumber } = await createInvoicePdfDocument({
    id: 'PDF_ORDER_1',
    date: '2026-10-14',
    invoice,
  })
  const bytes = new Uint8Array(pdf.output('arraybuffer'))

  assert.equal(invoiceNumber, 'PE/26-27/00007')
  assert.match(pdf.internal.pages.flat().join('\n'), /85371000/)
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), '%PDF')
  assert.ok(bytes.byteLength > 5_000)
})

test('creates a filesystem-safe PDF name from the invoice number', () => {
  assert.equal(createInvoiceDownloadName('PE/26-27/00007'), 'PE-26-27-00007.pdf')
})
