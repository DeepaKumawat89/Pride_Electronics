import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore'
import { db } from './firebase'

const productsCollection = collection(db, 'products')

const serializeProduct = (product) => {
  const serialized = JSON.parse(JSON.stringify(product))
  delete serialized.id
  return serialized
}

const sortProducts = (products) =>
  [...products].sort((first, second) =>
    String(second.createdAt || '').localeCompare(String(first.createdAt || '')),
  )

export function subscribeToProducts(onProducts, onError) {
  return onSnapshot(
    productsCollection,
    (snapshot) => {
      onProducts(
        sortProducts(
          snapshot.docs.map((snapshotDocument) => ({
            ...snapshotDocument.data(),
            id: snapshotDocument.id,
          })),
        ),
      )
    },
    onError,
  )
}

export async function createProduct(product) {
  const productReference = product.id
    ? doc(productsCollection, String(product.id))
    : doc(productsCollection)
  const savedProduct = {
    ...product,
    id: productReference.id,
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await setDoc(productReference, serializeProduct(savedProduct))
  return savedProduct
}

export const createProductId = () => doc(productsCollection).id

export async function saveProduct(product) {
  if (!product?.id) throw new Error('A Firestore product ID is required.')
  const savedProduct = {
    ...product,
    updatedAt: new Date().toISOString(),
  }
  await setDoc(
    doc(productsCollection, String(product.id)),
    serializeProduct(savedProduct),
    { merge: true },
  )
  return savedProduct
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
  await deleteDoc(doc(productsCollection, String(productId)))
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

