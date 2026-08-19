import { useLayoutEffect, useRef } from 'react'

const animatedProperties = [
  'opacity',
  'transform',
  'transition',
  'transition-delay',
  'will-change',
]

export default function HomeScrollReveal({ children }) {
  const containerRef = useRef(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    if (!container || reduceMotion || !('IntersectionObserver' in window)) {
      return undefined
    }

    const elements = [...container.children]
    const originalStyles = new Map(
      elements.map((element) => [
        element,
        animatedProperties.map((property) => ({
          property,
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        })),
      ]),
    )
    const revealedElements = new Set()
    const transitionHandlers = new Map()

    const restoreStyles = (element) => {
      originalStyles.get(element)?.forEach(({ property, value, priority }) => {
        if (value) element.style.setProperty(property, value, priority)
        else element.style.removeProperty(property)
      })
    }

    elements.forEach((element, index) => {
      element.style.setProperty('opacity', '0')
      element.style.setProperty('transform', 'translate3d(0, 16px, 0)')
      element.style.setProperty(
        'transition',
        'opacity 560ms cubic-bezier(0.22, 1, 0.36, 1), transform 560ms cubic-bezier(0.22, 1, 0.36, 1)',
      )
      element.style.setProperty(
        'transition-delay',
        `${Math.min(index * 25, 100)}ms`,
      )
      element.style.setProperty('will-change', 'opacity, transform')
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || revealedElements.has(entry.target)) {
            return
          }

          const element = entry.target
          revealedElements.add(element)
          observer.unobserve(element)

          const finishReveal = () => {
            const transition = transitionHandlers.get(element)
            if (!transition) return
            element.removeEventListener('transitionend', transition.handler)
            window.clearTimeout(transition.timeout)
            restoreStyles(element)
            transitionHandlers.delete(element)
          }
          const handleTransitionEnd = (event) => {
            if (event.propertyName === 'transform') finishReveal()
          }
          const timeout = window.setTimeout(finishReveal, 800)

          transitionHandlers.set(element, {
            handler: handleTransitionEnd,
            timeout,
          })
          element.addEventListener('transitionend', handleTransitionEnd)
          element.style.setProperty('opacity', '1')
          element.style.setProperty('transform', 'translate3d(0, 0, 0)')
        })
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -7% 0px',
      },
    )

    elements.forEach((element) => observer.observe(element))

    return () => {
      observer.disconnect()
      transitionHandlers.forEach(({ handler, timeout }, element) => {
        element.removeEventListener('transitionend', handler)
        window.clearTimeout(timeout)
      })
      elements.forEach(restoreStyles)
    }
  }, [])

  return (
    <div ref={containerRef} className="contents">
      {children}
    </div>
  )
}
