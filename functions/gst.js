const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const shortText = (value, maxLength) =>
  String(value || '').trim().slice(0, maxLength)

const normalizeGstin = (value) => shortText(value, 15).toUpperCase()

const isValidGstin = (value) => GSTIN_PATTERN.test(normalizeGstin(value))

const INDIAN_STATE_CODES = Object.freeze({
  'jammu and kashmir': '01', 'himachal pradesh': '02', punjab: '03', chandigarh: '04',
  uttarakhand: '05', haryana: '06', delhi: '07', rajasthan: '08', 'uttar pradesh': '09',
  bihar: '10', sikkim: '11', 'arunachal pradesh': '12', nagaland: '13', manipur: '14',
  mizoram: '15', tripura: '16', meghalaya: '17', assam: '18', 'west bengal': '19',
  jharkhand: '20', odisha: '21', chhattisgarh: '22', 'madhya pradesh': '23', gujarat: '24',
  'dadra and nagar haveli and daman and diu': '26', maharashtra: '27',
  'andhra pradesh': '37', karnataka: '29', goa: '30', lakshadweep: '31', kerala: '32',
  'tamil nadu': '33', puducherry: '34', 'andaman and nicobar islands': '35', telangana: '36',
  ladakh: '38',
})

const normalizeStateName = (value) => String(value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/[^a-z]+/g, ' ')
  .trim()

const stateCodeFor = (value) => INDIAN_STATE_CODES[normalizeStateName(value)] || ''

function normalizeGstProfile(value, billingAddress) {
  if (!value) return null
  const gstin = normalizeGstin(value.gstin)
  const legalName = shortText(value.legalName, 200)
  if (!isValidGstin(gstin) || !legalName) {
    throw new Error('Enter a valid GSTIN and registered business name.')
  }
  const billingStateCode = stateCodeFor(billingAddress?.state)
  if (!billingStateCode) {
    throw new Error('Select a valid Indian state for the GST billing address.')
  }
  if (gstin.slice(0, 2) !== billingStateCode) {
    throw new Error('The GSTIN state code must match the billing address state.')
  }
  const pan = gstin.slice(2, 12)
  if (!PAN_PATTERN.test(pan)) {
    throw new Error('The PAN embedded in the GSTIN is invalid.')
  }
  return {
    gstin,
    legalName,
    tradeName: shortText(value.tradeName, 200),
    stateCode: billingStateCode,
    pan,
    verificationStatus: 'format-validated',
  }
}

module.exports = {
  GSTIN_PATTERN,
  isValidGstin,
  normalizeGstin,
  normalizeGstProfile,
  stateCodeFor,
}
