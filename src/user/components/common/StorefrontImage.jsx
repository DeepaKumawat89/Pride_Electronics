import { useEffect, useState } from 'react'

const DEFAULT_FALLBACK_IMAGE = '/favicon-192x192.png'

export default function StorefrontImage({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK_IMAGE,
  onError,
  ...imageProps
}) {
  const [displayedSrc, setDisplayedSrc] = useState(src || fallbackSrc)
  const [failedSrc, setFailedSrc] = useState('')

  useEffect(() => {
    setDisplayedSrc(src || fallbackSrc)
    setFailedSrc('')
  }, [fallbackSrc, src])

  const handleError = (event) => {
    const rejectedSrc = event.currentTarget.currentSrc || displayedSrc
    console.error('Storefront image failed to load.', {
      src: rejectedSrc,
      originalSrc: src,
      alt,
    })
    onError?.(event)

    if (displayedSrc !== fallbackSrc) {
      setFailedSrc(rejectedSrc)
      setDisplayedSrc(fallbackSrc)
    }
  }

  return (
    <img
      {...imageProps}
      src={displayedSrc}
      alt={alt}
      onError={handleError}
      data-original-src={src || undefined}
      data-failed-src={failedSrc || undefined}
      data-image-fallback={failedSrc ? 'true' : undefined}
    />
  )
}
