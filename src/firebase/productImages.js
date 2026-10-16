import {
  deleteObject,
  getBlob,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { auth, storage } from './firebase'

export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MIN_PRODUCT_IMAGES = 1
export const MAX_PRODUCT_IMAGES = 3
export const MAX_PRODUCT_IMAGE_SIZE = 20 * 1024 * 1024
const MAX_STORED_PRODUCT_IMAGE_SIZE = 10 * 1024 * 1024

const productImagePathPattern =
  /^products\/[^/]+\/[^/]+\.(?:jpg|jpeg|png|webp)$/i

const productImageError = (error, action) => {
  if (error?.code === 'storage/unauthorized') {
    return new Error(
      `Firebase denied the product image ${action}. Sign out and sign in again to refresh the admin claim, confirm storage.rules is deployed to ecommerce-78081, and verify the admin app has a valid App Check site key.`,
      { cause: error },
    )
  }
  if (error?.code === 'storage/bucket-not-found') {
    return new Error(
      'The configured Firebase Storage bucket was not found for ecommerce-78081.',
      { cause: error },
    )
  }
  return error
}

const requireAdminImageAccess = async () => {
  const user = auth.currentUser
  if (!user) throw new Error('Sign in as the administrator before managing product images.')
  const token = await user.getIdTokenResult(true)
  if (token.claims.admin !== true) {
    throw new Error('This Firebase account does not have the required admin claim.')
  }
  return user
}

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    const source = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(source)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(source)
      reject(new Error(`Unable to read ${file.name}.`))
    }
    image.src = source
  })

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('Unable to optimize the selected image.')),
      'image/webp',
      quality,
    )
  })

export async function optimizeProductImage(
  file,
  { maxDimension = 1600, quality = 0.82 } = {},
) {
  if (!PRODUCT_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`${file.name} must be a JPG, PNG, or WebP image.`)
  }
  if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
    throw new Error(`${file.name} must be smaller than 20 MB.`)
  }

  const image = await loadImage(file)
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
  const width = Math.max(1, Math.round(image.width * scale))
  const height = Math.max(1, Math.round(image.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image optimization is not supported.')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, 0, 0, width, height)
  return canvasToBlob(canvas, quality)
}

const createImageId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(36).slice(2)}`

const blobHash = async (blob) => {
  const digest = await globalThis.crypto.subtle.digest(
    'SHA-256',
    await blob.arrayBuffer(),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

export async function uploadProductImages(productId, files, { prefix = '' } = {}) {
  if (!productId) throw new Error('A product ID is required for image uploads.')
  if (!files.length) return { paths: [], urls: [] }
  if (files.length > MAX_PRODUCT_IMAGES) {
    throw new Error(`Select no more than ${MAX_PRODUCT_IMAGES} images.`)
  }

  const user = await requireAdminImageAccess()
  const uploads = []
  const contentHashes = new Set()
  try {
    for (const [index, file] of files.entries()) {
      const optimizedImage = await optimizeProductImage(file)
      if (optimizedImage.size >= MAX_STORED_PRODUCT_IMAGE_SIZE) {
        throw new Error(`${file.name} could not be optimized below 10 MB.`)
      }
      const hash = await blobHash(optimizedImage)
      if (contentHashes.has(hash)) continue
      contentHashes.add(hash)
      const safePrefix = String(prefix || '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 80)
      const path = `products/${productId}/${safePrefix}${String(index + 1).padStart(2, '0')}-${createImageId()}.webp`
      const imageReference = ref(storage, path)
      await uploadBytes(imageReference, optimizedImage, {
        contentType: 'image/webp',
        cacheControl: 'public,max-age=31536000,immutable',
        customMetadata: {
          adminUid: user.uid,
          contentHash: hash,
          originalName: String(file.name || 'product-image').slice(0, 200),
        },
      })
      const upload = { path, url: '' }
      uploads.push(upload)
      upload.url = await getDownloadURL(imageReference)
    }
    return {
      paths: uploads.map((upload) => upload.path),
      urls: uploads.map((upload) => upload.url),
    }
  } catch (error) {
    await removeProductImages(
      uploads.map((upload) => upload.path),
      { ignoreErrors: true, skipAuthorizationCheck: true },
    )
    throw productImageError(error, 'upload')
  }
}

export const uploadVariantImages = (productId, variantId, files) =>
  uploadProductImages(productId, files, { prefix: `variant-${variantId}-` })

export async function copyProductImages(productId, images = [], paths = []) {
  if (images.length > MAX_PRODUCT_IMAGES) {
    throw new Error(`A product cannot contain more than ${MAX_PRODUCT_IMAGES} images.`)
  }
  const records = []
  const copiedPaths = []
  try {
    for (const [index, url] of images.entries()) {
      const sourcePath = paths[index] || ''
      if (sourcePath && !productImagePathPattern.test(sourcePath)) {
        throw new Error('An invalid source product image path was rejected.')
      }
      if (!sourcePath && !String(url).startsWith('https://')) {
        throw new Error('An invalid source product image URL was rejected.')
      }
      const blob = sourcePath
        ? await getBlob(ref(storage, sourcePath))
        : await fetch(url).then((response) => {
            if (!response.ok) throw new Error('Unable to copy the source product image.')
            return response.blob()
          })
      const file = new File([blob], `product-copy-${index + 1}.${blob.type === 'image/png' ? 'png' : 'webp'}`, {
        type: blob.type || 'image/webp',
      })
      const copied = await uploadProductImages(productId, [file], {
        prefix: `copy-${index + 1}-`,
      })
      copiedPaths.push(...copied.paths)
      records.push({ path: copied.paths[0], url: copied.urls[0] })
    }
    return {
      paths: records.map((record) => record.path),
      urls: records.map((record) => record.url),
    }
  } catch (error) {
    await removeProductImages(copiedPaths, {
      ignoreErrors: true,
      skipAuthorizationCheck: true,
    })
    throw productImageError(error, 'copy')
  }
}

export async function removeProductImages(
  paths = [],
  { ignoreErrors = false, skipAuthorizationCheck = false } = {},
) {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (!uniquePaths.length) return
  if (!uniquePaths.every((path) => productImagePathPattern.test(path))) {
    throw new Error('An invalid product image storage path was rejected.')
  }
  if (!skipAuthorizationCheck) await requireAdminImageAccess()
  const results = await Promise.allSettled(
    uniquePaths.map((path) => deleteObject(ref(storage, path))),
  )
  const failure = results.find(
    (result) =>
      result.status === 'rejected' &&
      result.reason?.code !== 'storage/object-not-found',
  )
  if (failure && !ignoreErrors) {
    throw productImageError(failure.reason, 'deletion')
  }
}
