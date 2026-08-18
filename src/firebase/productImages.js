import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'
import { storage } from './firebase'

export const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_PRODUCT_IMAGES = 8
export const MAX_PRODUCT_IMAGE_SIZE = 20 * 1024 * 1024

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

export async function uploadProductImages(productId, files) {
  if (!productId) throw new Error('A product ID is required for image uploads.')
  if (!files.length) return { paths: [], urls: [] }
  if (files.length > MAX_PRODUCT_IMAGES) {
    throw new Error(`Select no more than ${MAX_PRODUCT_IMAGES} images.`)
  }

  const uploads = []
  try {
    for (const [index, file] of files.entries()) {
      const optimizedImage = await optimizeProductImage(file)
      const path = `products/${productId}/${String(index + 1).padStart(2, '0')}-${createImageId()}.webp`
      const imageReference = ref(storage, path)
      await uploadBytes(imageReference, optimizedImage, {
        contentType: 'image/webp',
        cacheControl: 'public,max-age=31536000,immutable',
        customMetadata: { originalName: file.name },
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
    await removeProductImages(uploads.map((upload) => upload.path))
    throw error
  }
}

export const removeProductImages = (paths = []) =>
  Promise.allSettled(paths.map((path) => deleteObject(ref(storage, path))))
