import assert from 'node:assert/strict'
import test from 'node:test'
import {
  categoryForProduct,
  legacySubcategoriesForProducts,
  legacyTaxonomyPatch,
  normalizeProductTaxonomy,
  productBelongsToCategory,
  productBelongsToSubcategory,
  subcategoryForProduct,
  subcategoriesForCategory,
} from '../src/utils/catalogTaxonomy.js'

const categories = [
  { id: 'category-audio', name: 'Audio' },
  { id: 'category-wearables', name: 'Wearables' },
]
const subcategories = [
  {
    id: 'subcategory-audio-wireless',
    categoryId: 'category-audio',
    categoryName: 'Audio',
    name: 'Wireless',
  },
  {
    id: 'subcategory-wearables-wireless',
    categoryId: 'category-wearables',
    categoryName: 'Wearables',
    name: 'Wireless',
  },
]

test('legacy name-only products resolve to stable category and subcategory IDs', () => {
  const product = { category: ' audio ', subcategory: 'wireless' }

  assert.equal(categoryForProduct(product, categories)?.id, 'category-audio')
  assert.equal(
    subcategoryForProduct(product, subcategories, categories[0])?.id,
    'subcategory-audio-wireless',
  )
  assert.deepEqual(legacyTaxonomyPatch(product, categories, subcategories), {
    categoryId: 'category-audio',
    category: 'Audio',
    subcategoryId: 'subcategory-audio-wireless',
    subcategory: 'Wireless',
  })
})

test('legacy subcategory names can be migrated into deterministic documents', () => {
  const products = [
    { category: 'Audio', subcategory: 'True Wireless' },
    { category: 'Audio', subcategory: 'True Wireless' },
  ]
  const first = legacySubcategoriesForProducts(products, categories, [])
  const second = legacySubcategoriesForProducts(products, categories, [])

  assert.equal(first.length, 1)
  assert.deepEqual(first, second)
  assert.equal(first[0].categoryId, 'category-audio')
  assert.equal(first[0].name, 'True Wireless')
})

test('stable IDs remain authoritative when display names change', () => {
  const product = {
    categoryId: 'category-audio',
    category: 'Old audio name',
    subcategoryId: 'subcategory-audio-wireless',
    subcategory: 'Old wireless name',
  }
  const normalized = normalizeProductTaxonomy(
    product,
    categories,
    subcategories,
  )

  assert.equal(normalized.category, 'Audio')
  assert.equal(normalized.subcategory, 'Wireless')
  assert.deepEqual(legacyTaxonomyPatch(product, categories, subcategories), {
    category: 'Audio',
    subcategory: 'Wireless',
  })
})

test('stale references are repaired when legacy names resolve unambiguously', () => {
  assert.deepEqual(
    legacyTaxonomyPatch(
      {
        categoryId: 'missing-category',
        category: 'Audio',
        subcategoryId: 'missing-subcategory',
        subcategory: 'Wireless',
      },
      categories,
      subcategories,
    ),
    {
      categoryId: 'category-audio',
      subcategoryId: 'subcategory-audio-wireless',
    },
  )
})

test('same-named subcategories stay scoped to their parent category', () => {
  const product = { category: 'Wearables', subcategory: 'Wireless' }
  const category = categoryForProduct(product, categories)
  const subcategory = subcategoryForProduct(product, subcategories, category)

  assert.equal(subcategory.id, 'subcategory-wearables-wireless')
  assert.equal(
    productBelongsToSubcategory(product, subcategories[0]),
    false,
  )
  assert.equal(
    productBelongsToSubcategory(product, subcategories[1]),
    true,
  )
})

test('category helpers support ID-first products and legacy fallbacks', () => {
  assert.equal(
    productBelongsToCategory(
      { categoryId: 'category-audio', category: 'Renamed' },
      categories[0],
    ),
    true,
  )
  assert.equal(
    productBelongsToCategory({ category: 'Audio' }, categories[0]),
    true,
  )
  assert.deepEqual(
    subcategoriesForCategory(subcategories, 'category-wearables').map(
      (item) => item.id,
    ),
    ['subcategory-wearables-wireless'],
  )
})

test('unknown legacy names remain intact instead of being discarded', () => {
  assert.deepEqual(
    normalizeProductTaxonomy(
      { category: 'Legacy category', subcategory: 'Legacy child' },
      categories,
      subcategories,
    ),
    {
      categoryId: '',
      category: 'Legacy category',
      subcategoryId: '',
      subcategory: 'Legacy child',
    },
  )
})
