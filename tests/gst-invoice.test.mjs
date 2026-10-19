import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const functionsRequire = createRequire(
  new URL('../functions/package.json', import.meta.url),
)
const {
  createInvoiceSnapshot,
  validateInvoiceSnapshot,
} = functionsRequire('./invoice.js')
const { normalizeGstProfile } = functionsRequire('./gst.js')

const invoiceDate = '2026-09-04T10:00:00.000Z'
const settings = {
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
    registrationType: 'Regular',
    state: 'Maharashtra',
    stateCode: '27',
    defaultRate: 18,
    pricesIncludeTax: true,
  },
  numbering: {
    prefix: 'PE',
    nextNumber: 42,
    padding: 5,
    includeFinancialYear: true,
    suffix: '',
  },
}
const quote = {
  items: [{
    productId: 'PRODUCT_1',
    productName: 'Industrial Sensor',
    sku: 'SENSOR-1',
    hsnCode: '85371000',
    qty: 1,
    price: 1000,
    baseUnitPrice: 1000,
    unitGst: 180,
    taxRate: 18,
  }],
  pricingModel: 'gst-exclusive-v1',
  sellingSubtotal: 1000,
  couponDiscount: 0,
  shipping: 0,
  tax: 180,
  total: 1180,
}
const deliveryAddress = {
  fullName: 'Pride Customer',
  phone: '9876543210',
  line1: 'Shipping address',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
}
const billingAddress = {
  fullName: 'Pride Customer',
  phone: '9876543210',
  line1: 'Billing address',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
}
const createInvoice = (overrides = {}) => createInvoiceSnapshot({
  orderId: 'ORDER_1',
  invoiceSettings: settings,
  invoiceDate,
  quote,
  customer: { name: 'Pride Customer', email: 'buyer@example.com' },
  shippingAddress: deliveryAddress,
  billingAddress,
  payment: { method: 'UPI via Razorpay', status: 'Paid', transactionId: 'pay_123456' },
  ...overrides,
})

test('server invoice snapshot keeps seller GST and exact totals for a regular buyer', () => {
  const invoice = createInvoice()

  assert.equal(invoice.generatedBy, 'server')
  assert.equal(invoice.invoiceNumber, 'PE/26-27/00042')
  assert.equal(invoice.schemaVersion, 6)
  assert.equal(invoice.lineItems[0].hsnCode, '85371000')
  assert.equal(invoice.seller.gstin, settings.tax.gstin)
  assert.equal(invoice.buyer.gst, null)
  assert.equal(invoice.buyer.purchaseType, 'personal')
  assert.equal(invoice.tax.supplyType, 'intra-state')
  assert.equal(invoice.tax.cgst, 90)
  assert.equal(invoice.tax.sgst, 90)
  assert.equal(invoice.tax.taxableValue, 1000)
  assert.equal(invoice.tax.totalGst, 180)
  assert.equal(invoice.tax.pricesIncludeTax, false)
  assert.equal(invoice.amounts.total, 1180)
  assert.equal(validateInvoiceSnapshot(invoice), true)
})

test('supports personal purchase with separate billing and delivery addresses', () => {
  const invoice = createInvoice({
    shippingAddress: { ...deliveryAddress, line1: 'Delivery address' },
    billingAddress: { ...billingAddress, line1: 'Separate billing address' },
  })
  assert.equal(invoice.buyer.billing.formatted.includes('Separate billing address'), true)
  assert.equal(invoice.buyer.shipping.formatted.includes('Delivery address'), true)
  assert.equal(invoice.buyer.purchaseType, 'personal')
})

test('supports business GST purchase with the same billing and delivery address', () => {
  const gstProfile = normalizeGstProfile({
    gstin: '27AABCP1234F1Z5',
    legalName: 'Buyer Private Limited',
    tradeName: 'Buyer Co',
  }, billingAddress)
  const invoice = createInvoice({
    shippingAddress: billingAddress,
    billingAddress,
    gstProfile,
  })
  assert.equal(invoice.buyer.purchaseType, 'business')
  assert.equal(invoice.buyer.gst.gstin, '27AABCP1234F1Z5')
  assert.equal(validateInvoiceSnapshot(invoice, { gstRequired: true }), true)
})

test('supports business GST purchase with a separate interstate delivery address', () => {
  const gstProfile = normalizeGstProfile({
    gstin: '27AABCP1234F1Z5',
    legalName: 'Buyer Private Limited',
  }, billingAddress)
  const invoice = createInvoice({
    shippingAddress: {
      ...deliveryAddress,
      line1: 'Bengaluru delivery address',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560001',
    },
    billingAddress,
    gstProfile,
  })
  assert.equal(invoice.tax.supplyType, 'inter-state')
  assert.equal(invoice.tax.igst, 180)
  assert.equal(invoice.tax.cgst, 0)
  assert.equal(invoice.tax.placeOfSupplyStateCode, '29')
})

test('rejects a GSTIN whose state code does not match the billing address', () => {
  assert.throws(() => normalizeGstProfile({
    gstin: '29AABCP1234F1Z5',
    legalName: 'Buyer Private Limited',
  }, billingAddress), /state code/i)
})

test('tampered invoice totals fail server validation', () => {
  const invoice = createInvoice()
  invoice.amounts.total = 1

  assert.throws(() => validateInvoiceSnapshot(invoice))
})

test('rejects an invalid HSN code in a current invoice snapshot', () => {
  const invoice = createInvoice()
  invoice.lineItems[0].hsnCode = '85371A00'

  assert.throws(() => validateInvoiceSnapshot(invoice), /valid invoice data/i)
})

test('keeps invoice generation compatible with legacy products that predate HSN storage', () => {
  const legacyQuote = {
    ...quote,
    items: quote.items.map(({ hsnCode: _hsnCode, ...item }) => item),
  }
  const invoice = createInvoice({ quote: legacyQuote })

  assert.equal(invoice.lineItems[0].hsnCode, '')
  assert.equal(validateInvoiceSnapshot(invoice), true)
})

test('validates existing version-1 non-GST invoice snapshots', () => {
  const invoice = createInvoice()
  invoice.schemaVersion = 1
  invoice.seller.gstin = ''
  invoice.tax.supplyType = 'unregistered'
  invoice.tax.cgst = 0
  invoice.tax.sgst = 0
  invoice.tax.igst = 0
  delete invoice.buyer.billing
  delete invoice.buyer.shipping

  assert.equal(validateInvoiceSnapshot(invoice, { gstEnabled: false }), true)
})

test('validates historical version-2 invoices with formerly optional metadata', () => {
  const invoice = createInvoice()
  invoice.schemaVersion = 2
  invoice.seller.gstin = ''
  delete invoice.seller.phone
  delete invoice.seller.email
  delete invoice.seller.pan
  invoice.tax.supplyType = 'unregistered'
  invoice.tax.cgst = 0
  invoice.tax.sgst = 0
  invoice.tax.igst = 0
  delete invoice.buyer.billing
  delete invoice.buyer.shipping

  assert.equal(validateInvoiceSnapshot(invoice, { gstEnabled: false }), true)
})

test('keeps current version-3 invoice metadata validation strict', () => {
  const invoice = createInvoice()
  delete invoice.seller.email

  assert.throws(() => validateInvoiceSnapshot(invoice), /valid invoice data/i)
})
