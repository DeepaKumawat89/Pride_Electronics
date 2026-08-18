export const initialInvoiceSettings = {
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
    pricesIncludeTax: true,
  },
  numbering: {
    prefix: 'PE',
    nextNumber: 1001,
    padding: 5,
    includeFinancialYear: true,
    suffix: '',
  },
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
