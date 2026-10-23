export const DELIVERY_GST_TREATMENTS = Object.freeze([
  { value: 'fixed', label: 'Configured delivery GST rate' },
  { value: 'product-rates', label: 'Follow product GST rates' },
  { value: 'exempt', label: 'No GST on delivery charges' },
])

export const initialInvoiceSettings = {
  business: {
    legalName: '',
    displayName: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    pan: '',
  },
  tax: {
    gstEnabled: true,
    gstin: '',
    registrationType: 'Regular',
    state: '',
    stateCode: '',
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

export const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export const normalizeGstin = (value) =>
  String(value || '').replace(/\s+/g, '').toUpperCase().slice(0, 15)

export function getGstDetailsError(details) {
  if (!String(details?.legalName || '').trim()) {
    return 'Enter the legal business name registered under GST.'
  }
  if (!GSTIN_PATTERN.test(normalizeGstin(details?.gstin))) {
    return 'Enter a valid 15-character GSTIN.'
  }
  return ''
}

export function createInvoiceNumber(settings, date = new Date()) {
  const numbering = settings?.numbering || initialInvoiceSettings.numbering
  const invoiceDate = new Date(date)
  const validDate = Number.isNaN(invoiceDate.getTime()) ? new Date() : invoiceDate
  const year = validDate.getFullYear()
  const financialYearStart = validDate.getMonth() >= 3 ? year : year - 1
  const financialYear = `${String(financialYearStart).slice(-2)}-${String(financialYearStart + 1).slice(-2)}`
  const sequence = String(Math.max(1, Number(numbering.nextNumber) || 1)).padStart(
    Math.max(1, Number(numbering.padding) || 1),
    '0',
  )
  return [
    numbering.prefix,
    numbering.includeFinancialYear ? financialYear : '',
    sequence,
    numbering.suffix,
  ]
    .filter(Boolean)
    .join('/')
}
