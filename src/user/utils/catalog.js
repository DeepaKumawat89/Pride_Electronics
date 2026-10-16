import { getProductBasePrice } from '../../utils/productPricing.js'

export const catalogCategories = [
  'All',
  'Audio',
  'Wearables',
  'Peripherals',
  'Components & DIY',
  'Smart Power',
]

export const defaultCatalogFilters = {
  brand: 'All',
  price: 'all',
  rating: 'all',
  availability: 'all',
  feature: 'All',
  ram: 'All',
  storage: 'All',
  connectivity: 'All',
  power: 'All',
  voltage: 'All',
  type: 'All',
  compatibility: 'All',
}

export const priceFilterOptions = [
  { value: 'all', label: 'Any price' },
  { value: 'under-10000', label: 'Under ₹10,000' },
  { value: '10000-20000', label: '₹10,000–₹20,000' },
  { value: '20000-40000', label: '₹20,000–₹40,000' },
  { value: '40000-plus', label: '₹40,000+' },
]

export const ratingFilterOptions = [
  { value: 'all', label: 'Any rating' },
  { value: '4.5', label: '4.5★ & above' },
  { value: '4.8', label: '4.8★ & above' },
  { value: '4.9', label: '4.9★ & above' },
]

export const availabilityFilterOptions = [
  { value: 'all', label: 'Any availability' },
  { value: 'in-stock', label: 'In stock' },
  { value: 'low-stock', label: 'Low stock' },
  { value: 'out-of-stock', label: 'Out of stock' },
]

function getAvailability(product) {
  if (product.stock <= 0) return 'out-of-stock'
  if (product.stock <= 10) return 'low-stock'
  return 'in-stock'
}

export function sortCatalogProducts(products, sortBy) {
  return [...products].sort((a, b) => {
    if (sortBy === 'price-low') return getProductBasePrice(a) - getProductBasePrice(b)
    if (sortBy === 'price-high') return getProductBasePrice(b) - getProductBasePrice(a)
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    if (sortBy === 'rating') return (Number(b.rating) || 0) - (Number(a.rating) || 0)
    if (sortBy === 'recommended') {
      return (
        Number(b.featured) - Number(a.featured) ||
        (Number(b.rating) || 0) - (Number(a.rating) || 0) ||
        (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0)
      )
    }
    return (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0)
  })
}

const matchesPrice = (product, range) => {
  const price = getProductBasePrice(product)
  if (range === 'under-10000') return price < 10000
  if (range === '10000-20000') return price >= 10000 && price <= 20000
  if (range === '20000-40000') return price > 20000 && price <= 40000
  if (range === '40000-plus') return price > 40000
  return true
}

const matchesAttribute = (product, key, selected) => {
  if (selected === 'All') return true
  const value = product.attributes?.[key]
  return Array.isArray(value) ? value.includes(selected) : value === selected
}

export function filterCatalogProducts(products, subcategory, filters) {
  return products.filter((product) => {
    if (subcategory !== 'All' && product.subcategory !== subcategory) return false
    if (filters.brand !== 'All' && product.brand !== filters.brand) return false
    if (!matchesPrice(product, filters.price)) return false
    if (filters.rating !== 'all' && (Number(product.rating) || 0) < Number(filters.rating)) {
      return false
    }
    if (
      filters.availability !== 'all' &&
      getAvailability(product) !== filters.availability
    ) {
      return false
    }
    if (
      filters.feature !== 'All' &&
      !product.features?.includes(filters.feature)
    ) {
      return false
    }

    return [
      'ram',
      'storage',
      'connectivity',
      'power',
      'voltage',
      'type',
      'compatibility',
    ].every((key) => matchesAttribute(product, key, filters[key]))
  })
}

const uniqueSortedValues = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))

export function getCatalogFilterOptions(products) {
  const getAttributeValues = (key) =>
    uniqueSortedValues(
      products.flatMap((product) => {
        const value = product.attributes?.[key]
        return Array.isArray(value) ? value : [value]
      }),
    )

  return {
    subcategories: uniqueSortedValues(
      products.map((product) => product.subcategory),
    ),
    brand: uniqueSortedValues(products.map((product) => product.brand)),
    feature: uniqueSortedValues(
      products.flatMap((product) => product.features || []),
    ),
    ram: getAttributeValues('ram'),
    storage: getAttributeValues('storage'),
    connectivity: getAttributeValues('connectivity'),
    power: getAttributeValues('power'),
    voltage: getAttributeValues('voltage'),
    type: getAttributeValues('type'),
    compatibility: getAttributeValues('compatibility'),
  }
}
