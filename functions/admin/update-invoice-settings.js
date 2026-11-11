const {
  FieldValue,
  db,
  HttpsError,
  onCall,
  callableOptions,
  requireAdmin,
  validateInvoiceSettings,
  cleanObject,
} = require('../shared/core')

async function updateInvoiceSettingsHandler(request) {
  await requireAdmin(request)
  let settings
  try {
    settings = validateInvoiceSettings(request.data?.settings)
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message)
  }
  const operationalAddress = String(request.data?.operationalAddress || '')
    .trim()
    .slice(0, 500)
  if (operationalAddress.length < 10) {
    throw new HttpsError(
      'invalid-argument',
      'Enter the operational and pickup address.',
    )
  }
  const publicStore = {
    name: settings.business.displayName,
    registeredTradeName: settings.business.legalName,
    proprietor: settings.business.proprietor,
    gstin: settings.tax.gstin,
    operationalAddress,
    supportEmail: settings.business.email,
    supportPhone: settings.business.phone,
  }
  const batch = db.batch()
  batch.set(db.doc('settings/invoice'), {
    ...cleanObject(settings),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true })
  batch.update(db.doc('settings/storefront'), {
    'store.name': publicStore.name,
    'store.registeredTradeName': publicStore.registeredTradeName,
    'store.proprietor': publicStore.proprietor,
    'store.gstin': publicStore.gstin,
    'store.operationalAddress': publicStore.operationalAddress,
    'store.supportEmail': publicStore.supportEmail,
    'store.supportPhone': publicStore.supportPhone,
    tax: cleanObject(settings.tax),
    updatedAt: FieldValue.serverTimestamp(),
  })
  batch.update(db.doc('settings/shipping'), {
    'pickup.address': operationalAddress,
    updatedAt: FieldValue.serverTimestamp(),
  })
  await batch.commit()
  return {
    settings,
    store: publicStore,
    pickup: { address: operationalAddress },
  }
}

const updateInvoiceSettings = onCall(
  callableOptions,
  updateInvoiceSettingsHandler,
)


module.exports = { updateInvoiceSettings, updateInvoiceSettingsHandler }

