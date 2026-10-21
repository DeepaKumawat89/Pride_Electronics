import { useEffect, useState } from 'react'

export function useAnchoredPopover({
  open,
  setOpen,
  triggerRef,
  popoverRef,
  fixedWidth,
  constrainWidth = false,
  align = 'left',
  panelHeight,
  flipVertical = false,
}) {
  const [position, setPosition] = useState(null)

  useEffect(() => {
    if (!open) return undefined

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      const viewportPadding = 12
      const width = fixedWidth
        ? constrainWidth
          ? Math.min(fixedWidth, window.innerWidth - viewportPadding * 2)
          : fixedWidth
        : rect.width
      const left =
        align === 'right'
          ? Math.min(
              Math.max(viewportPadding, rect.right - width),
              window.innerWidth - width - viewportPadding,
            )
          : Math.min(
              Math.max(viewportPadding, rect.left),
              Math.max(
                viewportPadding,
                window.innerWidth - width - viewportPadding,
              ),
            )
      const gap = 8
      const desiredHeight = panelHeight || popoverRef.current?.offsetHeight || 0
      const spaceBelow = Math.max(
        0,
        window.innerHeight - rect.bottom - gap - viewportPadding,
      )
      const spaceAbove = Math.max(0, rect.top - gap - viewportPadding)
      const openUpward = Boolean(
        flipVertical &&
        desiredHeight &&
        spaceBelow < desiredHeight &&
        spaceAbove > spaceBelow,
      )
      const availableHeight = openUpward ? spaceAbove : spaceBelow
      const renderedHeight = desiredHeight
        ? Math.min(desiredHeight, availableHeight)
        : availableHeight
      const top = openUpward
        ? Math.max(viewportPadding, rect.top - gap - renderedHeight)
        : Math.min(
            rect.bottom + gap,
            window.innerHeight - viewportPadding - renderedHeight,
          )
      setPosition({
        left,
        top: Math.max(viewportPadding, top),
        width,
        ...(flipVertical ? { maxHeight: Math.max(0, availableHeight) } : {}),
      })
    }

    const closeOnOutsideClick = (event) => {
      if (
        !triggerRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    updatePosition()
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [
    align,
    constrainWidth,
    fixedWidth,
    flipVertical,
    open,
    panelHeight,
    popoverRef,
    setOpen,
    triggerRef,
  ])

  return position
}
