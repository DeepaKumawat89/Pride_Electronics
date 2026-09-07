import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'

const functionsRequire = createRequire(
  new URL('../functions/package.json', import.meta.url),
)
const {
  findReusableGstProfile,
  normalizeCashfreeGstinResponse,
  upsertGstProfiles,
} = functionsRequire('./gst.js')
const {
  createInvoiceSnapshot,
  validateInvoiceSnapshot,
} = functionsRequire('./invoice.js')

const verifiedAt = '2026-09-04T10:00:00.000Z'
const cashfreeResponse = {
  reference_id: 19,
  GSTIN: '27ABCDE1234F1Z5',
  legal_name_of_business: 'EXAMPLE INDUSTRIES PRIVATE LIMITED',
  trade_name_of_business: 'EXAMPLE INDUSTRIES',
  date_of_registration: '2018-07-01',
  constitution_of_business: 'Private Limited Company',
  taxpayer_type: 'Regular',
  gst_in_status: 'Active',
  principal_place_address: '1 Industrial Estate, Pune, Maharashtra 411001',
  principal_place_split_address: {
    city: 'Pune',
    district: 'Pune',
    state: 'Maharashtra',
    pincode: '411001',
  },
  valid: true,
}

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
    qty: 1,
    price: 1180,
    taxRate: 18,
  }],
  sellingSubtotal: 1180,
  productDiscount: 0,
  couponDiscount: 0,
  shipping: 0,
  tax: 180,
  total: 1180,
}

test('Cashfree response mapping keeps only verified provider data', () => {
  const result = normalizeCashfreeGstinResponse(
    cashfreeResponse,
    cashfreeResponse.GSTIN,
    verifiedAt,
  )
  assert.equal(result.gstin, cashfreeResponse.GSTIN)
  assert.equal(result.legalName, cashfreeResponse.legal_name_of_business)
  assert.equal(result.address, cashfreeResponse.principal_place_address)
  assert.equal(result.verificationProvider, 'cashfree')
  assert.equal(result.verificationStatus, 'verified')
  assert.equal(result.verificationReferenceId, '19')
})

test('mismatched, inactive, and incomplete provider responses are rejected', () => {
  assert.throws(
    () => normalizeCashfreeGstinResponse(cashfreeResponse, '08ABCDE1234F1Z5', verifiedAt),
    (error) => error.code === 'invalid-gstin',
  )
  assert.throws(
    () => normalizeCashfreeGstinResponse({ ...cashfreeResponse, gst_in_status: 'Cancelled' }, cashfreeResponse.GSTIN, verifiedAt),
    (error) => error.code === 'inactive-gstin',
  )
  assert.throws(
    () => normalizeCashfreeGstinResponse({
      ...cashfreeResponse,
      principal_place_address: '',
      principal_place_split_address: {},
    }, cashfreeResponse.GSTIN, verifiedAt),
    (error) => error.code === 'incomplete-gstin',
  )
})

test('saved GST registrations are deduplicated, bounded, and server-verifiable', () => {
  const verified = normalizeCashfreeGstinResponse(cashfreeResponse, cashfreeResponse.GSTIN, verifiedAt)
  const profiles = upsertGstProfiles(
    [verified, ...Array.from({ length: 12 }, (_, index) => ({ gstin: `0${index}` }))],
    { ...verified, tradeName: 'UPDATED NAME' },
  )
  assert.equal(profiles.length, 5)
  assert.equal(profiles.filter((profile) => profile.gstin === verified.gstin).length, 1)
  assert.equal(profiles[0].tradeName, 'UPDATED NAME')
  assert.equal(
    findReusableGstProfile({ gstProfiles: profiles }, verified.gstin, new Date(verifiedAt).getTime()).gstin,
    verified.gstin,
  )
  assert.throws(
    () => findReusableGstProfile({ gstProfiles: [{ ...verified, verificationProvider: 'browser' }] }, verified.gstin, new Date(verifiedAt).getTime()),
    (error) => error.code === 'gstin-not-verified',
  )
  assert.throws(
    () => findReusableGstProfile({ gstProfiles: [verified] }, verified.gstin, new Date(verifiedAt).getTime() + 31 * 86400000),
    (error) => error.code === 'gstin-verification-expired',
  )
})

test('server invoice snapshot contains intra-state GST identity and exact totals', () => {
  const gstProfile = normalizeCashfreeGstinResponse(cashfreeResponse, cashfreeResponse.GSTIN, verifiedAt)
  const invoice = createInvoiceSnapshot({
    orderId: 'ORDER_1',
    invoiceSettings: settings,
    invoiceDate: verifiedAt,
    quote,
    customer: { name: 'Browser-supplied name', email: 'buyer@example.com' },
    shippingAddress: { line1: 'Shipping address', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    billingAddress: { line1: 'Browser billing address', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
    gstProfile,
  })
  assert.equal(invoice.generatedBy, 'server')
  assert.equal(invoice.invoiceNumber, 'PE/26-27/00042')
  assert.equal(invoice.buyer.name, cashfreeResponse.legal_name_of_business)
  assert.equal(invoice.buyer.billingAddress, cashfreeResponse.principal_place_address)
  assert.equal(invoice.tax.supplyType, 'intra-state')
  assert.equal(invoice.tax.taxableValue, 1000)
  assert.equal(invoice.tax.cgst, 90)
  assert.equal(invoice.tax.sgst, 90)
  assert.equal(invoice.tax.igst, 0)
  assert.equal(invoice.amounts.total, 1180)
  assert.equal(validateInvoiceSnapshot(invoice, { gstRequired: true }), true)
})

test('inter-state invoices use IGST and tampered totals fail validation', () => {
  const response = {
    ...cashfreeResponse,
    GSTIN: '08ABCDE1234F1Z5',
    principal_place_address: '1 Industrial Area, Jaipur, Rajasthan 302001',
  }
  const gstProfile = normalizeCashfreeGstinResponse(response, response.GSTIN, verifiedAt)
  const invoice = createInvoiceSnapshot({
    orderId: 'ORDER_2',
    invoiceSettings: settings,
    invoiceDate: verifiedAt,
    quote,
    customer: { email: 'buyer@example.com' },
    shippingAddress: { line1: 'Jaipur address', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
    billingAddress: { line1: 'Jaipur address', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
    gstProfile,
  })
  assert.equal(invoice.tax.supplyType, 'inter-state')
  assert.equal(invoice.tax.igst, 180)
  assert.equal(invoice.tax.cgst, 0)
  assert.equal(invoice.tax.sgst, 0)

  const tampered = structuredClone(invoice)
  tampered.amounts.total = 1
  assert.throws(() => validateInvoiceSnapshot(tampered, { gstRequired: true }))
})
