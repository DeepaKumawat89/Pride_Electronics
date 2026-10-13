const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const shortText = (value, maxLength) =>
  String(value || '').trim().slice(0, maxLength)

const normalizeGstin = (value) => shortText(value, 15).toUpperCase()

const isValidGstin = (value) => GSTIN_PATTERN.test(normalizeGstin(value))

module.exports = {
  GSTIN_PATTERN,
  isValidGstin,
  normalizeGstin,
}
