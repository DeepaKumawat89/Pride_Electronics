const { applicationDefault, initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { slugify } = require('../shared/slugify')

let db
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const BATCH_SIZE = 400

function parseArguments(args) {
  let projectId = ''
  let apply = false
  let dryRun = false
  let help = false
  const requiredValue = (flag, index) => {
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value.`)
    index += 1
    return value
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--help' || argument === '-h') help = true
    else if (argument === '--project') {
      projectId = requiredValue(argument, index)
      index += 1
    }
    else if (argument.startsWith('--project=')) projectId = argument.slice('--project='.length)
    else if (argument === '--dry-run') dryRun = true
    else if (argument === '--apply') apply = true
    else throw new Error(`Unknown argument: ${argument}`)
  }
  if (!help && !projectId) throw new Error('--project <project-id> is required.')
  if (dryRun && apply) {
    throw new Error('--dry-run cannot be combined with --apply.')
  }
  return { projectId, apply, help }
}

const hasOwnSlug = (data) => Object.prototype.hasOwnProperty.call(data, 'slug')
const slugValue = (data) => hasOwnSlug(data) ? data.slug : undefined
const isValidSlug = (value) =>
  typeof value === 'string' && value === value.trim() && SLUG_PATTERN.test(value)

function idCollisionFor(slug, productId, productIdsByLowerCase) {
  const matchingIds = productIdsByLowerCase.get(slug.toLowerCase()) || []
  return matchingIds.find((id) => id !== productId) || ''
}

function uniqueSlugFor(product, usedSlugs, productIdsByLowerCase) {
  const base = slugify(product.data.slug) || slugify(product.data.name) || 'product'
  const candidates = [base, `${base}-${product.id.toLowerCase()}`]
  let candidate = candidates.find((value) =>
    !usedSlugs.has(value) && !productIdsByLowerCase.has(value.toLowerCase()),
  )
  if (!candidate) candidate = candidates[1]
  let suffix = 2
  while (usedSlugs.has(candidate) || productIdsByLowerCase.has(candidate.toLowerCase())) {
    candidate = `${base}-${product.id.toLowerCase()}-${suffix}`
    suffix += 1
  }
  return candidate
}

function createMigrationPlan(documents) {
  const products = documents
    .map((document) => ({ id: document.id, reference: document.ref, data: document.data() || {} }))
    .sort((first, second) => first.id.localeCompare(second.id))
  const productIdsByLowerCase = new Map()
  products.forEach((product) => {
    const key = product.id.toLowerCase()
    const ids = productIdsByLowerCase.get(key) || []
    ids.push(product.id)
    productIdsByLowerCase.set(key, ids)
  })

  const bySlug = new Map()
  products.filter((product) => isValidSlug(slugValue(product.data))).forEach((product) => {
    const slug = slugValue(product.data)
    const group = bySlug.get(slug) || []
    group.push(product)
    bySlug.set(slug, group)
  })

  const preserved = new Set()
  const usedSlugs = new Set()
  const invalidReasons = new Map()
  bySlug.forEach((group, slug) => {
    const eligible = group.filter((product) =>
      !idCollisionFor(slug, product.id, productIdsByLowerCase),
    )
    const keeper = eligible[0]
    if (keeper) {
      preserved.add(keeper.id)
      usedSlugs.add(slug)
    }
    group.forEach((product) => {
      if (product === keeper) return
      const reason = group.length > 1 && eligible.includes(product)
        ? 'duplicate-slug'
        : 'slug-collides-with-product-id'
      invalidReasons.set(product.id, reason)
    })
  })

  const changes = []
  products.forEach((product) => {
    if (preserved.has(product.id)) return
    const oldSlugPresent = hasOwnSlug(product.data)
    const oldSlug = slugValue(product.data)
    let reason = invalidReasons.get(product.id)
    if (!reason) {
      if (!oldSlugPresent || oldSlug === null || oldSlug === '') reason = 'missing-slug'
      else if (!isValidSlug(oldSlug)) reason = 'invalid-or-whitespace-slug'
      else reason = 'slug-collision'
    }
    const newSlug = uniqueSlugFor(product, usedSlugs, productIdsByLowerCase)
    usedSlugs.add(newSlug)
    if (newSlug === oldSlug && oldSlugPresent) return
    changes.push({
      id: product.id,
      name: String(product.data.name || ''),
      oldSlugPresent,
      oldSlug: oldSlugPresent ? oldSlug : null,
      newSlug,
      reason,
      reference: product.reference,
    })
  })

  return { products, changes }
}

async function applySlugChanges(changes) {
  let committed = 0
  for (let index = 0; index < changes.length; index += BATCH_SIZE) {
    const batchChanges = changes.slice(index, index + BATCH_SIZE)
    const batch = db.batch()
    batchChanges.forEach(({ reference, newSlug }) => {
      batch.update(reference, { slug: newSlug })
    })
    try {
      await batch.commit()
      committed += batchChanges.length
      console.log(`Committed ${committed}/${changes.length} slug updates.`)
    } catch (error) {
      console.error(
        `Batch failed after ${committed} committed updates. Review the preview and rerun with --apply to apply remaining slug changes.`,
      )
      throw error
    }
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2))
  if (options.help) {
    console.log([
      'Usage:',
      '  npm run migrate-product-slugs -- --project <project-id> [--dry-run]',
      '  npm run migrate-product-slugs -- --project <project-id> --apply',
      '',
      'Without --apply, the script performs a read-only preview.',
    ].join('\n'))
    return
  }

  const app = initializeApp({
    credential: applicationDefault(),
    projectId: options.projectId,
  })
  db = getFirestore(app)
  const projectId = app.options.projectId || ''

  const snapshot = await db.collection('products').get()
  const { products, changes } = createMigrationPlan(snapshot.docs)
  console.log(JSON.stringify({
    mode: options.apply ? 'apply-preview' : 'dry-run',
    projectId: projectId || null,
    productsScanned: products.length,
    fieldsChanged: changes.length ? ['slug'] : [],
    affectedProducts: changes.length,
    changes: changes.map(({ reference, ...change }) => change),
    writesEnabled: options.apply,
  }, null, 2))

  if (!options.apply || !changes.length) return
  if (!projectId) {
    throw new Error('Refusing to apply without a resolved Firebase project ID.')
  }
  await applySlugChanges(changes)
}

main().catch((error) => {
  console.error('Product slug migration stopped safely.', error.message)
  process.exitCode = 1
})
