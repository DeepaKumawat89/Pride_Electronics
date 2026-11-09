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
  await db.doc('settings/invoice').set({
    ...cleanObject(settings),
    updatedAt: FieldValue.serverTimestamp(),
  })
  return { settings }
}

const updateInvoiceSettings = onCall(
  callableOptions,
  updateInvoiceSettingsHandler,
)


module.exports = { updateInvoiceSettings, updateInvoiceSettingsHandler }

