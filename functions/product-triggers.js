const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore')
const { Timestamp } = require('firebase-admin/firestore')
const { db } = require('./shared/core')
const { slugify } = require('./shared/slugify')

const SITE_URL = 'https://pridecircuit.in'
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

const comparableProduct = (value) => {
  const normalize = (current, key = '') => {
    if (key === 'createdAt' || key === 'updatedAt' || key === 'indexNowNotifiedAt') return undefined
    if (Array.isArray(current)) return current.map((item) => normalize(item))
    if (current && typeof current === 'object') {
      return Object.keys(current).sort().reduce((result, itemKey) => {
        const normalized = normalize(current[itemKey], itemKey)
        if (normalized !== undefined) result[itemKey] = normalized
        return result
      }, {})
    }
    return current
  }
  return JSON.stringify(normalize(value || {}))
}

const hasMeaningfulProductChange = (before, after) =>
  comparableProduct(before) !== comparableProduct(after)

async function allocateSlug(reference, data) {
  return db.runTransaction(async (transaction) => {
    const current = await transaction.get(reference)
    if (!current.exists) return null
    const currentData = current.data() || {}
    let slug = String(currentData.slug || '').trim()
    if (!slug) {
      const snapshot = await transaction.get(db.collection('products'))
      const used = new Set(
        snapshot.docs
          .filter((document) => document.id !== reference.id)
          .flatMap((document) => [
            document.id.toLowerCase(),
            String(document.data()?.slug || '').toLowerCase(),
          ])
          .filter(Boolean),
      )
      const base = slugify(data.name) || 'product'
      slug = base
      let suffix = 2
      while (used.has(slug.toLowerCase())) {
        slug = `${base}-${reference.id.toLowerCase()}${suffix === 2 ? '' : `-${suffix}`}`
        suffix += 1
      }
    }
    const now = Timestamp.now()
    const fields = {
      ...(currentData.slug ? {} : { slug }),
      ...(currentData.createdAt ? {} : { createdAt: now }),
      ...(currentData.updatedAt ? {} : { updatedAt: now }),
    }
    if (Object.keys(fields).length) {
      transaction.update(reference, fields)
    }
    return { ...currentData, ...fields }
  })
}

const indexNowConfiguration = () => {
  const key = String(process.env.INDEXNOW_KEY || '').trim()
  const keyLocation = String(process.env.INDEXNOW_KEY_LOCATION || '').trim()
  if (!/^[A-Za-z0-9-]{8,128}$/.test(key)) return null
  try {
    const location = new URL(keyLocation)
    if (location.protocol !== 'https:' || location.hostname !== 'pridecircuit.in') return null
  } catch {
    return null
  }
  return { key, keyLocation }
}

async function notifyIndexNow(slug, configuration) {
  if (!configuration || !slug) return
  const url = `${SITE_URL}/product/${encodeURIComponent(slug)}`
  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        host: 'pridecircuit.in',
        key: configuration.key,
        keyLocation: configuration.keyLocation,
        urlList: [url],
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) throw new Error(`IndexNow responded with HTTP ${response.status}.`)
  } catch (error) {
    console.error('IndexNow notification failed; product creation remains successful.', error)
    return false
  }
  return true
}

exports.onProductCreated = onDocumentCreated(
  { document: 'products/{productId}', region: 'asia-south1' },
  async (event) => {
    const reference = event.data?.ref
    const original = event.data?.data() || {}
    if (!reference) return
    const product = await allocateSlug(reference, original)
    if (!product || product.enabled === false || product.indexNowNotifiedAt) return
    const configuration = indexNowConfiguration()
    if (!configuration) return
    const notified = await notifyIndexNow(product.slug, configuration)
    if (notified) {
      await reference.update({ indexNowNotifiedAt: Timestamp.now() })
    }
  },
)

exports.onProductUpdated = onDocumentUpdated(
  { document: 'products/{productId}', region: 'asia-south1' },
  async (event) => {
    const before = event.data?.before?.data() || {}
    const after = event.data?.after?.data() || {}
    if (!hasMeaningfulProductChange(before, after)) return
    if (!String(after.slug || '').trim()) {
      await allocateSlug(event.data.after.ref, after)
      return
    }
    await event.data.after.ref.update({ updatedAt: Timestamp.now() })
  },
)

