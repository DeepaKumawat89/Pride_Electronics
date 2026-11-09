import { useEffect } from 'react'

const SITE_URL = 'https://pridecircuit.in'

const textValue = (value) => String(value || '').replace(/\s+/g, ' ').trim()

const publicSlug = (value) =>
  textValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

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

export default function CatalogSeo({ category = 'All', products = [] }) {
  useEffect(() => {
    const categoryName = textValue(category)
    const isCategory = categoryName && categoryName !== 'All'
    const title = isCategory
      ? `${categoryName} Products | Pride Circuit`
      : 'Electronic Products Online | Pride Circuit'
    const description = isCategory
      ? `Shop ${categoryName} products online at Pride Circuit. Browse genuine electronics, clear pricing, and reliable delivery across India.`
      : 'Browse electronic components, DIY modules, audio gear, wearables, peripherals, and power accessories at Pride Circuit.'
    const canonicalUrl = isCategory
      ? `${SITE_URL}/category/${encodeURIComponent(publicSlug(categoryName))}`
      : `${SITE_URL}/products`
    const itemList = products
      .filter((product) => product?.id && product?.name)
      .slice(0, 100)
      .map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: `${SITE_URL}/product/${encodeURIComponent(String(product.id))}`,
        name: textValue(product.name),
      }))
    const structuredData = document.createElement('script')
    structuredData.type = 'application/ld+json'
    structuredData.setAttribute('data-pride-catalog-schema', 'true')
    structuredData.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: title,
      description,
      url: canonicalUrl,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      ...(itemList.length
        ? {
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: itemList.length,
              itemListElement: itemList,
            },
          }
        : {}),
    }).replace(/</g, '\\u003c')
    document.head.appendChild(structuredData)

    const previousTitle = document.title
    document.title = title
    const restore = [
      setMeta('name', 'description', description),
      setMeta('name', 'robots', 'index,follow'),
      setMeta('property', 'og:title', title),
      setMeta('property', 'og:description', description),
      setMeta('property', 'og:type', 'website'),
      setMeta('property', 'og:url', canonicalUrl),
      setMeta('property', 'og:image', `${SITE_URL}/favicon-192x192.png`),
      setMeta('name', 'twitter:title', title),
      setMeta('name', 'twitter:description', description),
      setMeta('name', 'twitter:image', `${SITE_URL}/favicon-192x192.png`),
      setCanonical(canonicalUrl),
    ]

    return () => {
      restore.forEach((restoreValue) => restoreValue())
      structuredData.remove()
      document.title = previousTitle
    }
  }, [category, products])

  return null
}
