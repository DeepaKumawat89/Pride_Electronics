const { getFirestore } = require('firebase-admin/firestore')
const { initializeApp } = require('firebase-admin/app')
const { slugify } = require('../shared/slugify')

initializeApp()
const db = getFirestore()

async function migrateProductSlugs() {
  const snapshot = await db.collection('products').get()
  const products = [...snapshot.docs].sort((a, b) => a.id.localeCompare(b.id))
  const usedSlugs = new Set()
  const updates = []

  for (const product of products) {
    const existingSlug = String(product.data()?.slug || '').trim()
    if (!existingSlug) continue
    if (usedSlugs.has(existingSlug)) {
      throw new Error(
        `Duplicate existing slug "${existingSlug}" found. Resolve it before migrating.`,
      )
    }
    usedSlugs.add(existingSlug)
  }

  for (const product of products) {
    const existingSlug = String(product.data()?.slug || '').trim()
    if (existingSlug) continue

    const baseSlug = slugify(product.data()?.name) || product.id.toLowerCase()
    let productSlug = baseSlug

    if (!productSlug || usedSlugs.has(productSlug)) {
      productSlug = `${baseSlug}-${product.id}`
      let suffix = 2
      while (usedSlugs.has(productSlug)) {
        productSlug = `${baseSlug}-${product.id}-${suffix}`
        suffix += 1
      }
    }

    usedSlugs.add(productSlug)
    updates.push({ reference: product.ref, slug: productSlug })
  }

  for (let index = 0; index < updates.length; index += 500) {
    const batch = db.batch()
    updates.slice(index, index + 500).forEach(({ reference, slug }) => {
      batch.update(reference, { slug })
    })
    await batch.commit()
  }

  console.log(`Added slugs to ${updates.length} product documents.`)
}

migrateProductSlugs().catch((error) => {
  console.error('Product slug migration failed.', error)
  process.exitCode = 1
})
