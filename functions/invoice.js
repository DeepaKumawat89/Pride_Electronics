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
    shippingTaxTreatment: 'product-rates',
    shippingTaxRate: 18,
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

const normalizeInvoiceSettings = (settings = {}) => {
  const tax = { ...DEFAULT_INVOICE_SETTINGS.tax, ...(settings.tax || {}) }
  if (!['fixed', 'product-rates', 'exempt'].includes(tax.shippingTaxTreatment)) {
    tax.shippingTaxTreatment = 'product-rates'
  }
  const shippingTaxRate = Number(tax.shippingTaxRate ?? 18)
  tax.shippingTaxRate = Number.isFinite(shippingTaxRate)
    ? Math.max(0, Math.min(100, shippingTaxRate))
    : 18
  return {
    business: { ...DEFAULT_INVOICE_SETTINGS.business, ...(settings.business || {}) },
    tax: {
      ...tax,
      gstEnabled: true,
      pricesIncludeTax: false,
    },
    numbering: { ...DEFAULT_INVOICE_SETTINGS.numbering, ...(settings.numbering || {}) },
  }
}

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

function allocateLineTaxes(items, couponDiscount, pricesIncludeTax, legacyProductTax) {
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
    const quotedTaxableValue = Number(item.taxableValue)
    const quotedLineTax = Number(item.lineTax)
    const hasQuotedTax = Number.isFinite(quotedTaxableValue) && Number.isFinite(quotedLineTax)
    const calculatedLineTax = roundMoney(
      pricesIncludeTax
        ? net * rate / (100 + rate || 100)
        : net * rate / 100,
    )
    return {
      item,
      gross,
      discount,
      net,
      rate,
      hasQuotedTax,
      quotedLineTax,
      quotedTaxableValue,
      calculatedLineTax,
    }
  })
  const usesQuotedLineTaxes = baseLines.every((line) => line.hasQuotedTax)
  const calculatedTaxTotal = roundMoney(
    baseLines.reduce((sum, line) => sum + line.calculatedLineTax, 0),
  )
  let allocatedLegacyTax = 0
  return baseLines.map((line, index) => {
    const { item, gross, discount, net, rate } = line
    const lineTax = usesQuotedLineTaxes
      ? roundMoney(line.quotedLineTax)
      : index === baseLines.length - 1
        ? roundMoney(Math.max(0, Number(legacyProductTax || 0) - allocatedLegacyTax))
        : roundMoney(calculatedTaxTotal
            ? Number(legacyProductTax || 0) * line.calculatedLineTax / calculatedTaxTotal
            : 0)
    allocatedLegacyTax = roundMoney(allocatedLegacyTax + lineTax)
    const taxableValue = usesQuotedLineTaxes
      ? roundMoney(line.quotedTaxableValue)
      : roundMoney(pricesIncludeTax ? net - lineTax : net)
    const quantity = Number(item.qty || 0)
    return {
      productId: text(item.productId, 100),
      variantId: text(item.variantId, 100),
      productName: text(item.productName, 200) || 'Product',
      variant: text(item.variant, 200),
      sku: text(item.sku, 100),
      hsnCode: text(item.hsnCode, 8),
      quantity,
      unitPrice: roundMoney(item.price),
      grossAmount: gross,
      discount,
      unitSellingPrice: quantity > 0
        ? Number(item.unitSellingPrice ?? taxableValue / quantity)
        : 0,
      productTotal: taxableValue,
      taxableValue,
      gstRate: rate,
      quotedCgst: Number(item.cgst),
      quotedSgst: Number(item.sgst),
      quotedIgst: Number(item.igst),
      lineTax,
      lineTotal: roundMoney(pricesIncludeTax ? net : net + lineTax),
    }
  })
}

function createInvoiceSnapshot({
  orderId,
  invoiceNumber,
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
  const supplyType = intraState ? 'intra-state' : 'inter-state'
  if (quote.supplyType && quote.supplyType !== supplyType) {
    throw new Error('The checkout tax jurisdiction does not match the delivery address.')
  }
  const shippingTax = roundMoney(gstEnabled ? quote.shippingTax || 0 : 0)
  const productTax = roundMoney(gstEnabled
    ? quote.productTax ?? Math.max(0, Number(quote.tax || 0) - shippingTax)
    : 0)
  const hasLineTaxSnapshots = (quote.items || []).every(
    (item) =>
      item.taxableValue != null &&
      item.lineTax != null &&
      Number.isFinite(Number(item.taxableValue)) &&
      Number.isFinite(Number(item.lineTax)),
  )
  const allocatedLineItems = allocateLineTaxes(
    quote.items || [],
    quote.couponDiscount,
    pricesIncludeTax,
    productTax,
  )
  const hasComponentTaxSnapshots = Boolean(quote.supplyType) && allocatedLineItems.every(
    (item) =>
      Number.isFinite(item.quotedCgst) &&
      Number.isFinite(item.quotedSgst) &&
      Number.isFinite(item.quotedIgst),
  )
  const lineItems = allocatedLineItems.map((item) => {
    const cgst = hasComponentTaxSnapshots
      ? roundMoney(item.quotedCgst)
      : intraState ? roundMoney(item.lineTax / 2) : 0
    const sgst = hasComponentTaxSnapshots
      ? roundMoney(item.quotedSgst)
      : intraState ? roundMoney(item.lineTax - cgst) : 0
    const igst = hasComponentTaxSnapshots
      ? roundMoney(item.quotedIgst)
      : !intraState ? item.lineTax : 0
    delete item.quotedCgst
    delete item.quotedSgst
    delete item.quotedIgst
    return { ...item, cgst, sgst, igst }
  })
  const shippingTaxBreakdown = Array.isArray(quote.shippingTaxBreakdown)
    ? quote.shippingTaxBreakdown.map((item) => {
        const hasComponents = [item.cgst, item.sgst, item.igst]
          .every((value) => Number.isFinite(Number(value)))
        return {
          productId: text(item.productId, 100),
          variantId: text(item.variantId, 100),
          taxableValue: roundMoney(item.taxableValue),
          gstRate: Math.max(0, Math.min(100, Number(item.gstRate || 0))),
          gstAmount: roundMoney(item.gstAmount),
          ...(hasComponents
            ? {
                cgst: roundMoney(item.cgst),
                sgst: roundMoney(item.sgst),
                igst: roundMoney(item.igst),
              }
            : {}),
        }
      })
    : []
  const hasShippingComponentSnapshots = Boolean(quote.supplyType) && shippingTaxBreakdown.every(
    (item) =>
      Number.isFinite(item.cgst) &&
      Number.isFinite(item.sgst) &&
      Number.isFinite(item.igst),
  )
  const shippingCgst = hasShippingComponentSnapshots
    ? roundMoney(shippingTaxBreakdown.reduce((sum, item) => sum + item.cgst, 0))
    : intraState ? roundMoney(shippingTax / 2) : 0
  const shippingSgst = hasShippingComponentSnapshots
    ? roundMoney(shippingTaxBreakdown.reduce((sum, item) => sum + item.sgst, 0))
    : intraState ? roundMoney(shippingTax - shippingCgst) : 0
  const shippingIgst = hasShippingComponentSnapshots
    ? roundMoney(shippingTaxBreakdown.reduce((sum, item) => sum + item.igst, 0))
    : !intraState ? shippingTax : 0
  const shippingTaxableValue = roundMoney(
    shippingTaxBreakdown.length
      ? shippingTaxBreakdown.reduce((sum, item) => sum + item.taxableValue, 0)
      : shippingTax > 0
        ? Number(quote.shipping || 0)
        : 0,
  )
  const tax = {
    pricesIncludeTax,
    defaultRate: Math.max(0, Math.min(100, Number(settings.tax.defaultRate || 0))),
    taxableValue: roundMoney(
      lineItems.reduce((sum, item) => sum + item.taxableValue, 0) + shippingTaxableValue,
    ),
    cgst: roundMoney(lineItems.reduce((sum, item) => sum + item.cgst, 0) + shippingCgst),
    sgst: roundMoney(lineItems.reduce((sum, item) => sum + item.sgst, 0) + shippingSgst),
    igst: roundMoney(lineItems.reduce((sum, item) => sum + item.igst, 0) + shippingIgst),
    shippingGst: shippingTax,
    shippingTaxableValue,
    shippingCgst,
    shippingSgst,
    shippingIgst,
    shippingGstRate: Math.max(0, Math.min(100, Number(quote.shippingTaxRate || 0))),
    shippingTaxTreatment: ['fixed', 'product-rates', 'exempt'].includes(quote.shippingTaxTreatment)
      ? quote.shippingTaxTreatment
      : settings.tax.shippingTaxTreatment,
    shippingTaxBreakdown,
    totalGst: roundMoney(gstEnabled ? quote.tax : 0),
    supplyType,
    placeOfSupplyStateCode,
    reverseCharge: false,
  }
  const number = text(invoiceNumber, 100) || invoiceNumberFor(settings.numbering, invoiceDate)
  const snapshot = {
    schemaVersion: hasComponentTaxSnapshots && hasShippingComponentSnapshots
      ? 8
      : hasLineTaxSnapshots ? 7 : 6,
    generatedBy: 'server',
    invoiceNumber: number,
    invoiceDate: new Date(invoiceDate).toISOString(),
    orderId: text(orderId, 200),
    delivery: {
      id: text(quote.deliveryId, 50),
      code: text(quote.deliveryId, 50),
      method: text(quote.deliveryMethod, 100),
      details: quote.deliveryDetails && typeof quote.deliveryDetails === 'object'
        ? JSON.parse(JSON.stringify(quote.deliveryDetails))
        : {},
    },
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
      netSubtotal: roundMoney(
        lineItems.reduce((sum, item) => sum + Number(item.productTotal || 0), 0),
      ),
      couponDiscount: roundMoney(quote.couponDiscount),
      shipping: roundMoney(quote.shipping),
      shippingGst: tax.shippingGst,
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
  const lineSubtotal = roundMoney(
    (invoice?.lineItems || []).reduce(
      (sum, item) => sum + Number(item.productTotal ?? item.taxableValue ?? 0),
      0,
    ),
  )
  const shippingTaxTotal = roundMoney(Number(invoice?.tax?.shippingGst || 0))
  const expectedShippingTax = roundMoney(
    Number(amounts.shipping || 0) * Number(invoice?.tax?.shippingGstRate || 0) / 100,
  )
  const shippingTaxBreakdown = Array.isArray(invoice?.tax?.shippingTaxBreakdown)
    ? invoice.tax.shippingTaxBreakdown
    : []
  const shippingBreakdownTaxTotal = roundMoney(
    shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.gstAmount || 0), 0),
  )
  const shippingBreakdownTaxableTotal = roundMoney(
    shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.taxableValue || 0), 0),
  )
  const invalidShippingTaxLine = shippingTaxBreakdown.some(
    (item) => {
      const taxableValue = Number(item.taxableValue || 0)
      const rate = Number(item.gstRate || 0)
      if (schemaVersion < 8) {
        return roundMoney(item.gstAmount) !== roundMoney(taxableValue * rate / 100)
      }
      const expectedGst = roundMoney(taxableValue * rate / 100)
      const expectedCgst = invoice?.tax?.supplyType === 'intra-state'
        ? roundMoney(expectedGst / 2)
        : 0
      const expectedSgst = invoice?.tax?.supplyType === 'intra-state'
        ? roundMoney(expectedGst - expectedCgst)
        : 0
      const expectedIgst = invoice?.tax?.supplyType === 'inter-state'
        ? expectedGst
        : 0
      return (
        roundMoney(item.cgst) !== expectedCgst ||
        roundMoney(item.sgst) !== expectedSgst ||
        roundMoney(item.igst) !== expectedIgst ||
        roundMoney(item.gstAmount) !== roundMoney(expectedCgst + expectedSgst + expectedIgst)
      )
    },
  )
  const invalidLineTax = (invoice?.lineItems || []).some((item) => {
    const taxableValue = roundMoney(item.taxableValue)
    const lineTax = roundMoney(item.lineTax)
    const rate = Number(item.gstRate || 0)
    const expectedGst = roundMoney(taxableValue * rate / 100)
    const expectedCgst = invoice?.tax?.supplyType === 'intra-state'
      ? schemaVersion >= 8
        ? roundMoney(expectedGst / 2)
        : roundMoney(lineTax / 2)
      : 0
    const expectedSgst = invoice?.tax?.supplyType === 'intra-state'
      ? schemaVersion >= 8
        ? roundMoney(expectedGst - expectedCgst)
        : roundMoney(lineTax - expectedCgst)
      : 0
    const expectedIgst = invoice?.tax?.supplyType === 'inter-state'
      ? expectedGst
      : 0
    const expectedLineTax = expectedGst
    const expectedLineTotal = roundMoney(taxableValue + lineTax)
    return (
      lineTax !== expectedLineTax ||
      roundMoney(item.lineTotal) !== expectedLineTotal ||
      roundMoney(item.cgst) !== expectedCgst ||
      roundMoney(item.sgst) !== expectedSgst ||
      roundMoney(item.igst) !== expectedIgst
    )
  })
  const componentTaxTotal = roundMoney(lineTaxTotal + shippingTaxTotal)
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
    (schemaVersion >= 6 && (
      roundMoney(amounts.netSubtotal) !== lineSubtotal ||
      roundMoney(amounts.total) !== roundMoney(
        lineSubtotal + Number(amounts.shipping || 0) + Number(amounts.totalGst || 0),
      )
    )) ||
    componentTaxTotal !== roundMoney(amounts.totalGst) ||
    (!historicalInvoice && !['intra-state', 'inter-state'].includes(invoice.tax?.supplyType)) ||
    (!historicalInvoice && splitTaxTotal !== componentTaxTotal) ||
    (schemaVersion >= 5 && schemaVersion < 7 && (
      shippingTaxTotal < 0 ||
      shippingTaxTotal !== expectedShippingTax
    )) ||
    (schemaVersion >= 7 && (
      invalidLineTax ||
      invalidShippingTaxLine ||
      !['fixed', 'product-rates', 'exempt'].includes(invoice.tax?.shippingTaxTreatment) ||
      shippingTaxTotal !== shippingBreakdownTaxTotal ||
      roundMoney(invoice.tax?.shippingTaxableValue) !== shippingBreakdownTaxableTotal ||
      roundMoney(invoice.tax?.taxableValue) !== roundMoney(lineSubtotal + shippingBreakdownTaxableTotal) ||
      (invoice.tax?.shippingTaxTreatment === 'exempt'
        ? shippingTaxTotal !== 0 || shippingTaxBreakdown.length !== 0
        : shippingBreakdownTaxableTotal !== roundMoney(amounts.shipping)) ||
      roundMoney(invoice.tax?.shippingCgst) !== (schemaVersion >= 8
        ? roundMoney(shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.cgst || 0), 0))
        : invoice.tax?.supplyType === 'intra-state' ? roundMoney(shippingTaxTotal / 2) : 0) ||
      roundMoney(invoice.tax?.shippingSgst) !== (schemaVersion >= 8
        ? roundMoney(shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.sgst || 0), 0))
        : invoice.tax?.supplyType === 'intra-state'
          ? roundMoney(shippingTaxTotal - roundMoney(shippingTaxTotal / 2))
          : 0) ||
      roundMoney(invoice.tax?.shippingIgst) !== (schemaVersion >= 8
        ? roundMoney(shippingTaxBreakdown.reduce((sum, item) => sum + Number(item.igst || 0), 0))
        : invoice.tax?.supplyType === 'inter-state' ? shippingTaxTotal : 0)
    )) ||
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
