import { useEffect } from 'react'
import { getProductBasePrice } from '../../../utils/productPricing'

const SITE_URL = 'https://pridecircuit.in'

const textValue = (value) => String(value || '').replace(/\s+/g, ' ').trim()

const productPath = (productId) =>
  `/product/${encodeURIComponent(String(productId || ''))}`

const setMeta = (attribute, name, content) => {
  let element = document.head.querySelector(`meta[${attribute}="${name}"]`)
  const created = !element
  const previousContent = element?.getAttribute('content')
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
  return () => {
    if (created) element.remove()
    else if (previousContent === null) element.removeAttribute('content')
    else element.setAttribute('content', previousContent)
  }
}

const setCanonical = (href) => {
  let element = document.head.querySelector('link[rel="canonical"]')
  const created = !element
  const previousHref = element?.getAttribute('href')
  if (!element) {
    element = document.createElement('link')
    element.setAttribute('rel', 'canonical')
    document.head.appendChild(element)
  }
  element.setAttribute('href', href)
  return () => {
    if (created) element.remove()
    else if (previousHref === null) element.removeAttribute('href')
    else element.setAttribute('href', previousHref)
  }
}

export default function ProductSeo({ product }) {
  useEffect(() => {
    if (!product?.id) return undefined

    const name = textValue(product.name) || 'Product'
    const description =
      textValue(product.description).slice(0, 160) ||
      `Shop ${name} from Pride Circuit.`
    const canonicalUrl = `${SITE_URL}${productPath(product.id)}`
    const images = [
      product.image,
      ...(Array.isArray(product.images) ? product.images : []),
    ].filter(Boolean)
    const price = Number(getProductBasePrice(product))
    const hasPrice = Number.isFinite(price) && price > 0
    const stock = Number(product.stock) || 0
    const reviewCount = Number(product.reviewsCount) || 0
    const rating = Number(product.rating) || 0
    const structuredProduct = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image: [...new Set(images)],
      ...(textValue(product.sku) ? { sku: textValue(product.sku) } : {}),
      ...(textValue(product.brand || product.manufacturer)
        ? {
            brand: {
              '@type': 'Brand',
              name: textValue(product.brand || product.manufacturer),
            },
          }
        : {}),
      ...(hasPrice
        ? {
            offers: {
              '@type': 'Offer',
              url: canonicalUrl,
              price: price.toFixed(2),
              priceCurrency: 'INR',
              availability: `https://schema.org/${stock > 0 ? 'InStock' : 'OutOfStock'}`,
              itemCondition: 'https://schema.org/NewCondition',
            },
          }
        : {}),
      ...(reviewCount > 0 && rating >= 1 && rating <= 5
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: rating.toFixed(1),
              reviewCount,
            },
          }
        : {}),
    }
    const structuredData = document.createElement('script')
    structuredData.type = 'application/ld+json'
    structuredData.setAttribute('data-pride-product-schema', 'true')
    structuredData.textContent = JSON.stringify(structuredProduct).replace(/</g, '\\u003c')
    document.head.appendChild(structuredData)

    const previousTitle = document.title
    document.title = `${name} | Pride Circuit`
    const restore = [
      setMeta('name', 'description', description),
      setMeta('property', 'og:title', `${name} | Pride Circuit`),
      setMeta('property', 'og:description', description),
      setMeta('property', 'og:url', canonicalUrl),
      setMeta('name', 'twitter:title', `${name} | Pride Circuit`),
      setMeta('name', 'twitter:description', description),
      setCanonical(canonicalUrl),
    ]

    return () => {
      restore.forEach((restoreValue) => restoreValue())
      structuredData.remove()
      document.title = previousTitle
    }
  }, [product])

  return null
}
