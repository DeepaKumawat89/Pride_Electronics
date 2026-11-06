import { useEffect } from 'react'

const SITE_URL = 'https://pridecircuit.in'
const HOME_TITLE = 'Pride Circuit | Buy Electronic Components Online in India'
const HOME_DESCRIPTION =
  'Shop electronic components, DIY modules, audio gear, wearables, peripherals, and power accessories online in India at Pride Circuit. Explore genuine products, secure checkout, and reliable support.'

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
  const element = document.head.querySelector('link[rel="canonical"]')
  const previousHref = element?.getAttribute('href')
  if (element) element.setAttribute('href', href)
  return () => {
    if (element && previousHref !== null) element.setAttribute('href', previousHref)
  }
}

export default function HomeSeo() {
  useEffect(() => {
    const previousTitle = document.title
    document.title = HOME_TITLE
    const restore = [
      setMeta('name', 'description', HOME_DESCRIPTION),
      setMeta('name', 'robots', 'index,follow'),
      setMeta('property', 'og:title', HOME_TITLE),
      setMeta('property', 'og:description', HOME_DESCRIPTION),
      setMeta('property', 'og:site_name', 'Pride Circuit'),
      setMeta('property', 'og:type', 'website'),
      setMeta('property', 'og:url', `${SITE_URL}/`),
      setMeta('property', 'og:image', `${SITE_URL}/favicon-192x192.png`),
      setMeta('name', 'twitter:title', HOME_TITLE),
      setMeta('name', 'twitter:description', HOME_DESCRIPTION),
      setMeta('name', 'twitter:image', `${SITE_URL}/favicon-192x192.png`),
      setCanonical(`${SITE_URL}/`),
    ]

    return () => {
      restore.forEach((restoreValue) => restoreValue())
      document.title = previousTitle
    }
  }, [])

  return null
}
