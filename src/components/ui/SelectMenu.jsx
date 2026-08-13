import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const normalizeOptions = (options) =>
  options.map((option) =>
    typeof option === 'string' ? { label: option, value: option } : option,
  )

export default function SelectMenu({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  ariaLabel,
  className = '',
  buttonClassName = '',
  menuWidth,
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const normalizedOptions = normalizeOptions(options)
  const selected = normalizedOptions.find((option) => option.value === value)

  useEffect(() => {
    if (!open) return undefined

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = menuWidth || rect.width
      const viewportPadding = 12
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
      )
      setPosition({ left, top: rect.bottom + 8, width })
    }

    const closeOnOutsideClick = (event) => {
      if (
        !triggerRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
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
  }, [menuWidth, open])

  const selectOption = (option) => {
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-controls={menuId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-55 ${buttonClassName}`}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="listbox"
            aria-label={ariaLabel}
            style={position}
            className="fixed z-[100] h-52 overflow-y-auto overscroll-contain rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_22px_60px_rgba(15,23,42,0.2)]"
          >
            {normalizedOptions.map((option) => {
              const active = option.value === value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectOption(option)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[11px] font-bold transition ${
                    active
                      ? 'bg-[#e4f1e7] text-[#2f663d]'
                      : 'text-slate-600 hover:bg-[#f4f7f2] hover:text-slate-950'
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {active && <Check size={13} className="shrink-0" />}
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}
