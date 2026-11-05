import {
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore'
import { db, FIREBASE_STORAGE_BUCKET } from './firebase'
import {
  assertValidHsnCode,
  assertValidProductForCreate,
} from '../utils/productValidation'
import {
  assertUniqueSkuSequence,
  createProductSku,
  getHighestSkuSequence,
  updateProductSku,
} from '../utils/productSku'

const productsCollection = collection(db, 'products')
const productSkuCounterReference = doc(db, 'skuCounters', 'products')

const PRODUCT_LISTENER_RETRY_MIN_MS = 1_000
const PRODUCT_LISTENER_RETRY_MAX_MS = 30_000
const PRODUCT_CHANNEL_NAME = `pride-electronics:${db.app.options.projectId}:products:v1`
const NON_RETRYABLE_LISTENER_CODES = new Set([
  'already-exists',
  'data-loss',
  'failed-precondition',
  'invalid-argument',
  'not-found',
  'out-of-range',
  'unimplemented',
])

const productImageFields = ['image', 'images', 'imageStoragePaths']

const parseFirebaseStorageDownloadUrl = (value) => {
  try {
    const url = new URL(value)
    const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/)
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'firebasestorage.googleapis.com' ||
      !match
    ) {
      return null
    }
    return {
      bucket: decodeURIComponent(match[1]),
      path: decodeURIComponent(match[2]),
    }
  } catch {
    return null
  }
}

const assertCurrentStorageImageReferences = (value, label) => {
  const presentFields = productImageFields.filter((field) =>
    Object.prototype.hasOwnProperty.call(value || {}, field),
  )
  if (!presentFields.length) return
  if (presentFields.length !== productImageFields.length) {
    throw new Error(`${label} image URL and Storage path fields must be saved together.`)
  }

  const images = Array.isArray(value.images) ? value.images : []
  const paths = Array.isArray(value.imageStoragePaths) ? value.imageStoragePaths : []
  if (images.length !== paths.length) {
    throw new Error(`${label} image URLs and Storage paths are not aligned.`)
  }

  images.forEach((imageUrl, index) => {
    const storagePath = paths[index]
    if (!storagePath) return
    const reference = parseFirebaseStorageDownloadUrl(imageUrl)
    if (
      !reference ||
      reference.bucket !== FIREBASE_STORAGE_BUCKET ||
      reference.path !== storagePath
    ) {
      throw new Error(
        `${label} image ${index + 1} must reference ${FIREBASE_STORAGE_BUCKET} at its aligned Storage path.`,
      )
    }
  })
}

export const assertCurrentProductImageReferences = (product) => {
  assertCurrentStorageImageReferences(product, 'Product')
  if (!Array.isArray(product?.variants)) return
  product.variants.forEach((variant, index) =>
    assertCurrentStorageImageReferences(variant, `Variant ${index + 1}`),
  )
}

const serializeProduct = (product) => {
  assertCurrentProductImageReferences(product)
  const serialized = JSON.parse(JSON.stringify(product))
  delete serialized.id
  if (Object.prototype.hasOwnProperty.call(serialized, 'hsnCode')) {
    serialized.hsnCode = String(serialized.hsnCode || '').trim()
  }
  if (Object.prototype.hasOwnProperty.call(serialized, 'taxRate')) {
    serialized.taxRate = Number(serialized.taxRate)
  }
  return serialized
}

const serializeProductUpdate = (product) => {
  const serialized = serializeProduct(product)
  if (product.pricingModel === 'gst-exclusive-v1') {
    serialized.originalPrice = deleteField()
    serialized.discount = deleteField()
  }
  if (
    Object.prototype.hasOwnProperty.call(product, 'hsnCode') &&
    !String(product.hsnCode || '').trim()
  ) {
    serialized.hsnCode = ''
  }
  return serialized
}

const sortProducts = (products) =>
  [...products].sort((first, second) =>
    String(second.createdAt || '').localeCompare(String(first.createdAt || '')),
  )

export function subscribeToProducts(onProducts, onError) {
  let active = true
  let retryCount = 0
  let retryTimer = null
  let unsubscribeSnapshot = null
  let latestProducts = null
  const channel =
    typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new window.BroadcastChannel(PRODUCT_CHANNEL_NAME)
      : null

  const publishProducts = (products, { broadcast = false } = {}) => {
    if (!active) return
    const sortedProducts = sortProducts(products)
    latestProducts = sortedProducts
    onProducts(sortedProducts)
    if (broadcast && channel) {
      channel.postMessage({ type: 'products', products: sortedProducts })
    }
  }

  if (channel) {
    channel.onmessage = ({ data }) => {
      if (data?.type === 'request-products' && latestProducts) {
        channel.postMessage({ type: 'products', products: latestProducts })
      } else if (data?.type === 'products' && Array.isArray(data.products)) {
        publishProducts(data.products)
      }
    }
    channel.postMessage({ type: 'request-products' })
  }

  const startListener = () => {
    if (!active) return
    unsubscribeSnapshot = onSnapshot(
      productsCollection,
      (snapshot) => {
        retryCount = 0
        const products = snapshot.docs.map((snapshotDocument) => ({
          ...snapshotDocument.data(),
          id: snapshotDocument.id,
        }))

        // A newly opened tab can receive an empty memory-cache snapshot before
        // the server answers. Treating that as authoritative makes a healthy
        // catalog flash or remain empty when the following request is rejected.
        if (snapshot.metadata.fromCache && products.length === 0) return
        publishProducts(products, { broadcast: !snapshot.metadata.fromCache })
      },
      (error) => {
        unsubscribeSnapshot = null
        if (!active) return
        onError?.(error)

        // Firestore does not reattach a listener after calling its error
        // callback. Retry recoverable transport, auth, and App Check failures;
        // malformed queries and missing indexes remain terminal and visible.
        if (NON_RETRYABLE_LISTENER_CODES.has(error?.code)) return
        const baseDelay = Math.min(
          PRODUCT_LISTENER_RETRY_MIN_MS * 2 ** retryCount,
          PRODUCT_LISTENER_RETRY_MAX_MS,
        )
        retryCount += 1
        const jitteredDelay = baseDelay * (0.75 + Math.random() * 0.5)
        retryTimer = window.setTimeout(startListener, jitteredDelay)
      },
    )
  }

  startListener()

  return () => {
    active = false
    if (retryTimer !== null) window.clearTimeout(retryTimer)
    unsubscribeSnapshot?.()
    channel?.close()
  }
}

export async function createProduct(product) {
  const productToCreate = { ...product }
  const productReference = productToCreate.id
    ? doc(productsCollection, String(productToCreate.id))
    : doc(productsCollection)
  const existingProducts = (await getDocs(productsCollection)).docs.map(
    (snapshotDocument) => snapshotDocument.data(),
  )
  const highestExistingSequence = getHighestSkuSequence(existingProducts)

  return runTransaction(db, async (transaction) => {
    const [counterSnapshot, productSnapshot] = await Promise.all([
      transaction.get(productSkuCounterReference),
      transaction.get(productReference),
    ])
    if (productSnapshot.exists()) {
      throw new Error('A product with this Firestore ID already exists.')
    }
    const counterSequence = counterSnapshot.exists()
      ? Number(counterSnapshot.data().lastSequence) || 0
      : 0
    const nextSequence = Math.max(highestExistingSequence, counterSequence) + 1
    const savedProduct = {
      ...productToCreate,
      id: productReference.id,
      sku: createProductSku(
        productToCreate.sku,
        productToCreate.category,
        productToCreate.subcategory,
        nextSequence,
      ),
      createdAt: productToCreate.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    assertValidProductForCreate(savedProduct)
    transaction.set(productSkuCounterReference, { lastSequence: nextSequence })
    transaction.set(productReference, serializeProduct(savedProduct))
    return savedProduct
  })
}

export const createProductId = () => doc(productsCollection).id

export async function saveProduct(product) {
  if (!product?.id) throw new Error('A Firestore product ID is required.')
  if (Object.prototype.hasOwnProperty.call(product, 'hsnCode')) {
    assertValidHsnCode(product.hsnCode)
  }
  const productReference = doc(productsCollection, String(product.id))
  const existingProducts = (await getDocs(productsCollection)).docs.map(
    (snapshotDocument) => ({
      ...snapshotDocument.data(),
      id: snapshotDocument.id,
    }),
  )
  if (Object.prototype.hasOwnProperty.call(product, 'sku')) {
    assertUniqueSkuSequence(product.sku, existingProducts, product.id)
  }
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(productReference)
    if (!snapshot.exists()) throw new Error('Product not found.')
    const existingProduct = snapshot.data()
    const savedProduct = {
      ...product,
      ...(Object.prototype.hasOwnProperty.call(product, 'sku')
        ? {
            sku: updateProductSku(
              existingProduct.sku,
              product.sku,
              product.category || existingProduct.category,
              product.subcategory || existingProduct.subcategory,
            ),
          }
        : {}),
      updatedAt: new Date().toISOString(),
    }
    transaction.set(
      productReference,
      serializeProductUpdate(savedProduct),
      { merge: true },
    )
    return savedProduct
  })
}

export async function saveProducts(products, { batchSize = 50 } = {}) {
  const savedProducts = []
  for (let index = 0; index < products.length; index += batchSize) {
    const batch = products.slice(index, index + batchSize)
    savedProducts.push(...(await Promise.all(batch.map((product) => saveProduct(product)))))
  }
  return savedProducts
}

export async function removeProduct(productId) {
  if (!productId) throw new Error('A Firestore product ID is required.')
  const productReference = doc(productsCollection, String(productId))
  const existingProducts = (await getDocs(productsCollection)).docs.map(
    (snapshotDocument) => snapshotDocument.data(),
  )
  const highestExistingSequence = getHighestSkuSequence(existingProducts)

  await runTransaction(db, async (transaction) => {
    const [counterSnapshot, productSnapshot] = await Promise.all([
      transaction.get(productSkuCounterReference),
      transaction.get(productReference),
    ])
    if (!productSnapshot.exists()) throw new Error('Product not found.')
    const counterSequence = counterSnapshot.exists()
      ? Number(counterSnapshot.data().lastSequence) || 0
      : 0
    if (
      highestExistingSequence > 0 &&
      (!counterSnapshot.exists() || highestExistingSequence > counterSequence)
    ) {
      transaction.set(productSkuCounterReference, {
        lastSequence: Math.max(highestExistingSequence, counterSequence),
      })
    }
    transaction.delete(productReference)
  })
}

export async function updateProductRatingStats(productId, reviews = []) {
  if (!productId) return
  const published = reviews.filter(
    (review) => String(review.productId) === String(productId) && review.status === 'Published',
  )
  const count = published.length
  const sum = published.reduce((total, item) => total + (Number(item.rating) || 0), 0)
  const average = count > 0 ? Math.round((sum / count) * 10) / 10 : 0
  await saveProduct({
    id: productId,
    rating: average,
    reviewsCount: count,
  })
}
