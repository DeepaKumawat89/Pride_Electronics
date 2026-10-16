const { isValidGstin, normalizeGstin, stateCodeFor } = require('./gst')

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100

const DEFAULT_INVOICE_SETTINGS = {
  business: {
    legalName: 'PRIDE ELECTRONICS',
    displayName: 'Pride Electronics',
    address: '42 Silicon Avenue, Hinjawadi, Pune, Maharashtra 411057',
    phone: '+91 98765 43210',
    email: 'support@prideelectronics.in',
    website: 'www.prideelectronics.in',
    pan: 'AABCP1234F',
  },
  tax: {
    gstEnabled: true,
    gstin: '27AABCP1234F1Z5',
    registrationType: 'Regular',
    state: 'Maharashtra',
    stateCode: '27',
    defaultRate: 18,
    pricesIncludeTax: false,
  },
  numbering: {
    prefix: 'PE',
    nextNumber: 1001,
    padding: 5,
    includeFinancialYear: true,
    suffix: '',
  },
}

const text = (value, maxLength) => String(value || '').trim().slice(0, maxLength)

const invoiceNumberFor = (numbering = {}, dateValue = new Date()) => {
  const date = new Date(dateValue)
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date
  const year = validDate.getFullYear()
  const financialYearStart = validDate.getMonth() >= 3 ? year : year - 1
  const financialYear = `${String(financialYearStart).slice(-2)}-${String(financialYearStart + 1).slice(-2)}`
  const sequence = String(Math.max(1, Number(numbering.nextNumber) || 1)).padStart(
    Math.min(12, Math.max(1, Number(numbering.padding) || 1)),
    '0',
  )
  return [
    text(numbering.prefix, 20),
    numbering.includeFinancialYear ? financialYear : '',
    sequence,
    text(numbering.suffix, 20),
  ].filter(Boolean).join('/')
}

const normalizeInvoiceSettings = (settings = {}) => ({
  business: { ...DEFAULT_INVOICE_SETTINGS.business, ...(settings.business || {}) },
  tax: {
    ...DEFAULT_INVOICE_SETTINGS.tax,
    ...(settings.tax || {}),
    gstEnabled: true,
    pricesIncludeTax: false,
  },
  numbering: { ...DEFAULT_INVOICE_SETTINGS.numbering, ...(settings.numbering || {}) },
})

const partyAddress = (value = {}) =>
  text(
    typeof value === 'string'
      ? value
      : [
          value.line1,
          value.line2,
          [value.city, value.state, value.pincode].filter(Boolean).join(', '),
        ].filter(Boolean).join(', '),
    500,
  )

const addressSnapshot = (value = {}) => ({
  fullName: text(value.fullName, 100),
  phone: text(value.phone, 30),
  line1: text(value.line1, 500),
  city: text(value.city, 100),
  state: text(value.state, 100),
  stateCode: stateCodeFor(value.state),
  pincode: text(value.pincode, 6),
  formatted: partyAddress(value),
})

function allocateLineTaxes(items, couponDiscount, totalTax, pricesIncludeTax) {
  const sellingSubtotal = roundMoney(
    items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0),
  )
  let allocatedDiscount = 0
  const baseLines = items.map((item, index) => {
    const gross = roundMoney(Number(item.price || 0) * Number(item.qty || 0))
    const discount = index === items.length - 1
      ? roundMoney(Math.max(0, Number(couponDiscount || 0) - allocatedDiscount))
      : roundMoney(sellingSubtotal ? Number(couponDiscount || 0) * gross / sellingSubtotal : 0)
    allocatedDiscount = roundMoney(allocatedDiscount + discount)
    const net = roundMoney(Math.max(0, gross - discount))
    const rate = Math.max(0, Math.min(100, Number(item.taxRate || 0)))
    const taxWeight = Math.max(0,
      pricesIncludeTax ? net * rate / (100 + rate || 100) : net * rate / 100,
    )
    return { item, gross, discount, net, rate, taxWeight }
  })
  const totalTaxWeight = baseLines.reduce((sum, line) => sum + line.taxWeight, 0)
  let allocatedTax = 0
  return baseLines.map(({ item, gross, discount, net, rate, taxWeight }, index) => {
    const lineTax = index === baseLines.length - 1
      ? roundMoney(Math.max(0, Number(totalTax || 0) - allocatedTax))
      : roundMoney(totalTaxWeight ? Number(totalTax || 0) * taxWeight / totalTaxWeight : 0)
    allocatedTax = roundMoney(allocatedTax + lineTax)
    return {
      productId: text(item.productId, 100),
      variantId: text(item.variantId, 100),
      productName: text(item.productName, 200) || 'Product',
      variant: text(item.variant, 200),
      sku: text(item.sku, 100),
      hsnCode: text(item.hsnCode, 8),
      quantity: Number(item.qty || 0),
      unitPrice: roundMoney(item.price),
      grossAmount: gross,
      discount,
      taxableValue: roundMoney(pricesIncludeTax ? net - lineTax : net),
      gstRate: rate,
      lineTax,
      lineTotal: roundMoney(pricesIncludeTax ? net : net + lineTax),
    }
  })
}

function createInvoiceSnapshot({
  orderId,
  invoiceSettings,
  invoiceDate,
  quote,
  customer,
  shippingAddress,
  billingAddress,
  gstProfile = null,
  payment = {},
}) {
  const settings = normalizeInvoiceSettings(invoiceSettings)
  const pricesIncludeTax = quote.pricingModel === 'gst-exclusive-v1'
    ? false
    : settings.tax.pricesIncludeTax === true
  const gstEnabled = settings.tax.gstEnabled !== false
  const sellerGstin = normalizeGstin(settings.tax.gstin)
  const sellerStateCode = text(settings.tax.stateCode || sellerGstin.slice(0, 2), 2)
  const placeOfSupplyStateCode = stateCodeFor(shippingAddress?.state)
  if (!placeOfSupplyStateCode) {
    throw new Error('Select a valid Indian delivery state for GST calculation.')
  }
  const intraState = placeOfSupplyStateCode === sellerStateCode
  const lineItems = allocateLineTaxes(
    quote.items || [],
    quote.couponDiscount,
    gstEnabled ? quote.tax : 0,
    pricesIncludeTax,
  ).map((item) => {
    const cgst = intraState ? roundMoney(item.lineTax / 2) : 0
    const sgst = intraState ? roundMoney(item.lineTax - cgst) : 0
    const igst = !intraState ? item.lineTax : 0
    return { ...item, cgst, sgst, igst }
  })
  const tax = {
    pricesIncludeTax,
    defaultRate: Math.max(0, Math.min(100, Number(settings.tax.defaultRate || 0))),
    taxableValue: roundMoney(lineItems.reduce((sum, item) => sum + item.taxableValue, 0)),
    cgst: roundMoney(lineItems.reduce((sum, item) => sum + item.cgst, 0)),
    sgst: roundMoney(lineItems.reduce((sum, item) => sum + item.sgst, 0)),
    igst: roundMoney(lineItems.reduce((sum, item) => sum + item.igst, 0)),
    totalGst: roundMoney(gstEnabled ? quote.tax : 0),
    supplyType: intraState ? 'intra-state' : 'inter-state',
    placeOfSupplyStateCode,
    reverseCharge: false,
  }
  const number = invoiceNumberFor(settings.numbering, invoiceDate)
  const snapshot = {
    schemaVersion: 4,
    generatedBy: 'server',
    invoiceNumber: number,
    invoiceDate: new Date(invoiceDate).toISOString(),
    orderId: text(orderId, 200),
    seller: {
      legalName: text(settings.business.legalName, 200),
      displayName: text(settings.business.displayName, 200),
      address: text(settings.business.address, 500),
      phone: text(settings.business.phone, 30),
      email: text(settings.business.email, 320),
      website: text(settings.business.website, 200),
      pan: text(settings.business.pan, 10).toUpperCase(),
      gstin: sellerGstin,
      registrationType: text(settings.tax.registrationType, 50),
      state: text(settings.tax.state, 100),
      stateCode: sellerStateCode,
    },
    buyer: {
      name: text(gstProfile?.legalName || customer?.name, 200) || 'Pride customer',
      email: text(customer?.email, 320),
      phone: text(billingAddress?.phone || customer?.phone, 30),
      purchaseType: gstProfile ? 'business' : 'personal',
      billingAddress: partyAddress(billingAddress),
      shippingAddress: partyAddress(shippingAddress),
      billing: addressSnapshot(billingAddress),
      shipping: addressSnapshot(shippingAddress),
      gst: gstProfile ? JSON.parse(JSON.stringify(gstProfile)) : null,
    },
    lineItems,
    amounts: {
      subtotal: roundMoney(quote.sellingSubtotal),
      couponDiscount: roundMoney(quote.couponDiscount),
      shipping: roundMoney(quote.shipping),
      taxableValue: tax.taxableValue,
      totalGst: tax.totalGst,
      total: roundMoney(quote.total),
    },
    tax,
    payment: {
      method: text(payment.method, 120),
      status: text(payment.status, 40),
      transactionId: text(payment.transactionId, 150),
      paidAt: payment.paidAt ? text(payment.paidAt, 50) : '',
    },
  }
  validateInvoiceSnapshot(snapshot, { gstRequired: Boolean(gstProfile), gstEnabled })
  return snapshot
}

function validateInvoiceSnapshot(invoice, { gstRequired = false, gstEnabled = true } = {}) {
  const schemaVersion = Number(invoice?.schemaVersion || 1)
  const historicalInvoice = schemaVersion < 3
  const amounts = invoice?.amounts || {}
  const expectedTotal = roundMoney(
    Number(amounts.subtotal || 0) -
      Number(amounts.couponDiscount || 0) +
      Number(amounts.shipping || 0) +
      (invoice?.tax?.pricesIncludeTax ? 0 : Number(amounts.totalGst || 0)),
  )
  const lineTaxTotal = roundMoney(
    (invoice?.lineItems || []).reduce((sum, item) => sum + Number(item.lineTax || 0), 0),
  )
  const splitTaxTotal = roundMoney(
    Number(invoice?.tax?.cgst || 0) +
      Number(invoice?.tax?.sgst || 0) +
      Number(invoice?.tax?.igst || 0),
  )
  if (
    invoice?.generatedBy !== 'server' ||
    !text(invoice.invoiceNumber, 100) ||
    Number.isNaN(new Date(invoice.invoiceDate).getTime()) ||
    !text(invoice.seller?.legalName, 200) ||
    !text(invoice.seller?.address, 500) ||
    (!historicalInvoice && !text(invoice.seller?.phone, 30)) ||
    (!historicalInvoice && !/^\S+@\S+\.\S+$/.test(text(invoice.seller?.email, 320))) ||
    !Array.isArray(invoice.lineItems) ||
    invoice.lineItems.length < 1 ||
    invoice.lineItems.length > 100 ||
    !Number.isFinite(Number(amounts.total)) ||
    Number(amounts.total) < 0 ||
    roundMoney(invoice.tax?.totalGst) !== roundMoney(amounts.totalGst) ||
    roundMoney(amounts.total) !== expectedTotal ||
    lineTaxTotal !== roundMoney(amounts.totalGst) ||
    (!historicalInvoice && !['intra-state', 'inter-state'].includes(invoice.tax?.supplyType)) ||
    (!historicalInvoice && splitTaxTotal !== lineTaxTotal) ||
    (!historicalInvoice && !invoice.buyer?.billing?.formatted) ||
    (!historicalInvoice && !invoice.buyer?.shipping?.formatted) ||
    (schemaVersion >= 3 &&
      invoice.lineItems.some((item) =>
        text(item.hsnCode, 8) && !/^[0-9]{8}$/.test(text(item.hsnCode, 8)),
      ))
  ) {
    throw new Error('The server could not generate valid invoice data for this order.')
  }
  if (!historicalInvoice && gstEnabled && !isValidGstin(invoice.seller.gstin)) {
    throw new Error('Configure a valid seller GSTIN before accepting GST orders.')
  }
  if (
    !historicalInvoice &&
    gstEnabled &&
    (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(invoice.seller.pan) ||
      invoice.seller.pan !== invoice.seller.gstin.slice(2, 12))
  ) {
    throw new Error('Configure a seller PAN that matches the GSTIN.')
  }
  const invalidCurrentBuyerGst = !historicalInvoice && (
    invoice.buyer?.gst?.stateCode !== invoice.buyer?.billing?.stateCode ||
    invoice.buyer?.gst?.verificationStatus !== 'format-validated'
  )
  if (
    gstRequired &&
    (!gstEnabled ||
      !isValidGstin(invoice.buyer?.gst?.gstin) ||
      !invoice.buyer?.gst?.legalName ||
      invalidCurrentBuyerGst)
  ) {
    throw new Error('The verified buyer GST details are incomplete.')
  }
  return true
}

module.exports = {
  DEFAULT_INVOICE_SETTINGS,
  createInvoiceSnapshot,
  invoiceNumberFor,
  normalizeInvoiceSettings,
  validateInvoiceSnapshot,
}
