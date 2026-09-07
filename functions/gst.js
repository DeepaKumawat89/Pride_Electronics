const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const GST_PROFILE_LIMIT = 5
const GST_VERIFICATION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

const shortText = (value, maxLength) =>
  String(value || '').trim().slice(0, maxLength)

const normalizeGstin = (value) => shortText(value, 15).toUpperCase()

const isValidGstin = (value) => GSTIN_PATTERN.test(normalizeGstin(value))

const addressTextFrom = (source = {}) => {
  if (typeof source === 'string') return shortText(source, 500)
  return shortText(
    source.address ||
      [
        source.flat_number,
        source.building_number,
        source.building_name,
        source.street,
        source.location,
        source.city,
        source.district,
        source.state,
        source.pincode,
      ].filter(Boolean).join(', '),
    500,
  )
}

function normalizeCashfreeGstinResponse(rawResult, requestedGstin, verifiedAt) {
  const result = rawResult?.data && typeof rawResult.data === 'object'
    ? rawResult.data
    : rawResult || {}
  const gstin = normalizeGstin(result.GSTIN || result.gstin || requestedGstin)
  const valid = result.valid === true || String(rawResult?.status || '').toUpperCase() === 'SUCCESS'
  const status = shortText(
    result.gst_in_status || result.registration_status || result.gstin_status || result.status,
    30,
  )
  const addressSource =
    result.principal_place_address ||
    result.registered_address ||
    result.principal_place_split_address ||
    result.address ||
    {}
  const splitAddress =
    result.principal_place_split_address ||
    (typeof result.registered_address === 'object' ? result.registered_address : {}) ||
    {}

  if (!valid || !isValidGstin(gstin) || gstin !== normalizeGstin(requestedGstin)) {
    const error = new Error(shortText(rawResult?.message || result.message, 200) || 'GSTIN verification failed.')
    error.code = 'invalid-gstin'
    throw error
  }
  if (status && status.toLowerCase() !== 'active') {
    const error = new Error(`This GSTIN is ${status} and cannot be used for an invoice.`)
    error.code = 'inactive-gstin'
    throw error
  }

  const legalName = shortText(
    result.legal_name_of_business || result.legal_name || result.registered_name || result.name,
    200,
  )
  const address = addressTextFrom(addressSource)
  if (!legalName || !address) {
    const error = new Error('The verification provider returned incomplete GST registration details.')
    error.code = 'incomplete-gstin'
    throw error
  }

  return {
    gstin,
    legalName,
    tradeName: shortText(result.trade_name_of_business || result.trade_name, 200),
    status: status || 'Active',
    taxpayerType: shortText(result.taxpayer_type, 50) || 'Regular',
    businessType: shortText(
      result.constitution_of_business || result.business_type,
      100,
    ),
    registrationDate: shortText(
      result.date_of_registration || result.registration_date,
      30,
    ),
    address,
    addressDetails: {
      city: shortText(splitAddress.city, 100),
      district: shortText(splitAddress.district, 100),
      state: shortText(splitAddress.state, 100),
      pincode: shortText(splitAddress.pincode, 10),
    },
    verifiedAt: new Date(verifiedAt || Date.now()).toISOString(),
    verificationProvider: 'cashfree',
    verificationReferenceId: shortText(
      result.reference_id || rawResult?.reference_id,
      100,
    ),
    verificationStatus: 'verified',
  }
}

const upsertGstProfiles = (profiles, verifiedProfile) => [
  verifiedProfile,
  ...(Array.isArray(profiles) ? profiles : []).filter(
    (profile) => normalizeGstin(profile?.gstin) !== verifiedProfile.gstin,
  ),
].slice(0, GST_PROFILE_LIMIT)

function findReusableGstProfile(userProfile, requestedGstin, now = Date.now()) {
  const gstin = normalizeGstin(requestedGstin)
  if (!gstin) return null
  if (!isValidGstin(gstin)) {
    const error = new Error('The selected GSTIN is invalid.')
    error.code = 'invalid-gstin'
    throw error
  }
  const profiles = [
    ...(Array.isArray(userProfile?.gstProfiles) ? userProfile.gstProfiles : []),
    ...(userProfile?.gstDetails ? [userProfile.gstDetails] : []),
  ]
  const profile = profiles.find((item) => normalizeGstin(item?.gstin) === gstin)
  if (
    !profile ||
    profile.verificationProvider !== 'cashfree' ||
    profile.verificationStatus !== 'verified'
  ) {
    const error = new Error('Verify this GSTIN before placing the order.')
    error.code = 'gstin-not-verified'
    throw error
  }
  const verifiedAt = new Date(profile.verifiedAt || 0).getTime()
  if (!Number.isFinite(verifiedAt) || Number(now) - verifiedAt > GST_VERIFICATION_MAX_AGE_MS) {
    const error = new Error('This saved GSTIN verification has expired. Verify it again to continue.')
    error.code = 'gstin-verification-expired'
    throw error
  }
  if (String(profile.status || '').toLowerCase() !== 'active') {
    const error = new Error('This saved GSTIN is not active.')
    error.code = 'inactive-gstin'
    throw error
  }
  return JSON.parse(JSON.stringify(profile))
}

module.exports = {
  GSTIN_PATTERN,
  GST_PROFILE_LIMIT,
  GST_VERIFICATION_MAX_AGE_MS,
  findReusableGstProfile,
  isValidGstin,
  normalizeCashfreeGstinResponse,
  normalizeGstin,
  upsertGstProfiles,
}
