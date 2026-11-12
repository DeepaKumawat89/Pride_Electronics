import { useEffect } from 'react'

const SITE_URL = 'https://pridecircuit.in'
const TITLE = 'All Electronics Categories | Pride Circuit'
const DESCRIPTION =
  'Browse every active electronics and industrial automation category available from Pride Circuit.'

export default function CategoriesSeo() {
  useEffect(() => {
    const previousTitle = document.title
    const canonical = document.head.querySelector('link[rel="canonical"]')
    const previousCanonical = canonical?.getAttribute('href')
    const description = document.head.querySelector('meta[name="description"]')
    const previousDescription = description?.getAttribute('content')

    document.title = TITLE
    canonical?.setAttribute('href', `${SITE_URL}/categories`)
    description?.setAttribute('content', DESCRIPTION)

    return () => {
      document.title = previousTitle
      if (canonical && previousCanonical !== null) {
        canonical.setAttribute('href', previousCanonical)
      }
      if (description && previousDescription !== null) {
        description.setAttribute('content', previousDescription)
      }
    }
  }, [])

  return null
}
