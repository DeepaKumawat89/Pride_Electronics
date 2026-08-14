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
      const top =
        flipVertical &&
        panelHeight &&
        rect.bottom + 8 + panelHeight > window.innerHeight - viewportPadding
          ? Math.max(viewportPadding, rect.top - panelHeight - 8)
          : rect.bottom + 8
      setPosition({ left, top, width })
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
