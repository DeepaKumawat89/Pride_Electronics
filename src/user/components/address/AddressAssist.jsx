import {
  Check,
  ChevronDown,
  LoaderCircle,
  LocateFixed,
  MapPin,
  Search,
} from 'lucide-react'
import { useId, useMemo, useRef, useState } from 'react'

function SuggestionPanel({
  id,
  status,
  message,
  suggestions,
  onSelect,
  onHighlight,
  highlightedIndex,
  type,
}) {
  if (status === 'idle') return null

  return (
    <div
      role="listbox"
      id={id}
      aria-label={type === 'address' ? 'Address suggestions' : 'PIN code localities'}
      className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
    >
      {status === 'loading' ? (
        <p className="flex items-center gap-2 px-3 py-3 text-[10px] font-bold text-slate-500">
          <LoaderCircle size={14} className="animate-spin text-[#397a4a]" />
          {type === 'address'
            ? 'Finding addresses…'
            : 'Checking PIN code…'}
        </p>
      ) : suggestions.length ? (
        suggestions.map((suggestion, index) => (
          <button
            key={suggestion.id}
            id={`${id}-option-${index}`}
            type="button"
            role="option"
            aria-selected={highlightedIndex === index}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHighlight(index)}
            onClick={() => onSelect(suggestion)}
            className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${highlightedIndex === index ? 'bg-[#f2f7f2]' : 'hover:bg-[#f2f7f2]'}`}
          >
            <MapPin size={14} className="mt-0.5 shrink-0 text-[#397a4a]" />
            <span className="min-w-0 text-[10px] font-semibold leading-5 text-slate-600">
              {suggestion.label}
            </span>
          </button>
        ))
      ) : (
        <p
          className={`px-3 py-3 text-[10px] font-bold ${status === 'error' ? 'text-red-600' : 'text-slate-500'}`}
        >
          {message}
        </p>
      )}
    </div>
  )
}

export function CurrentLocationControl({ assist, className = '' }) {
  const loading = assist.locationLookup.status === 'loading'
  return (
    <div className={className}>
      <button
        type="button"
        disabled={loading}
        onClick={assist.useCurrentLocation}
        className="inline-flex items-center gap-2 rounded-full border border-[#75916f]/35 bg-white px-4 py-2.5 text-[10px] font-extrabold text-[#397a4a] transition hover:border-[#397a4a] hover:bg-[#f2f7f2] disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? (
          <LoaderCircle size={14} className="animate-spin" />
        ) : (
          <LocateFixed size={14} />
        )}
        {loading ? 'Finding your location…' : 'Use my current location'}
      </button>
      {assist.locationLookup.message && (
        <p
          role="status"
          className={`mt-2 text-[9px] font-bold leading-4 ${assist.locationLookup.status === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
        >
          {assist.locationLookup.message}
        </p>
      )}
    </div>
  )
}

export function AddressAutocompleteInput({
  assist,
  value,
  className,
  placeholder,
  required = false,
}) {
  const [focused, setFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const listId = `address-suggestions-${useId().replace(/:/g, '')}`
  const suggestions = assist.addressLookup.suggestions
  const showPanel =
    focused &&
    value.trim().length >= 3 &&
    assist.addressLookup.status !== 'idle'
  const selectSuggestion = (suggestion) => {
    assist.selectAddress(suggestion)
    setFocused(false)
    setHighlightedIndex(-1)
  }
  const handleKeyDown = (event) => {
    if (!showPanel) return
    if (event.key === 'Escape') {
      setFocused(false)
      setHighlightedIndex(-1)
      return
    }
    if (!suggestions.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setHighlightedIndex((current) => {
        if (current < 0) return direction > 0 ? 0 : suggestions.length - 1
        return (current + direction + suggestions.length) % suggestions.length
      })
    }
    if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault()
      selectSuggestion(suggestions[highlightedIndex])
    }
  }

  return (
    <div className="relative min-w-0">
      <input
        required={required}
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          setHighlightedIndex(-1)
          assist.updateStreet(event.target.value)
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="street-address"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listId : undefined}
        aria-activedescendant={
          showPanel && highlightedIndex >= 0
            ? `${listId}-option-${highlightedIndex}`
            : undefined
        }
        className={`${className} pr-10`}
      />
      {assist.addressLookup.status === 'loading' && (
        <LoaderCircle
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#397a4a]"
        />
      )}
      {showPanel && (
        <SuggestionPanel
          {...assist.addressLookup}
          id={listId}
          type="address"
          highlightedIndex={highlightedIndex}
          onHighlight={setHighlightedIndex}
          onSelect={selectSuggestion}
        />
      )}
    </div>
  )
}

export function PincodeAutocompleteInput({
  assist,
  value,
  className,
  placeholder,
  required = false,
}) {
  const [focused, setFocused] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const listId = `pincode-suggestions-${useId().replace(/:/g, '')}`
  const suggestions = assist.pincodeLookup.suggestions
  const showPanel =
    focused &&
    value.length === 6 &&
    assist.pincodeLookup.status !== 'idle'
  const selectSuggestion = (suggestion) => {
    assist.selectPincode(suggestion)
    setFocused(false)
    setHighlightedIndex(-1)
  }
  const handleKeyDown = (event) => {
    if (!showPanel) return
    if (event.key === 'Escape') {
      setFocused(false)
      setHighlightedIndex(-1)
      return
    }
    if (!suggestions.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setHighlightedIndex((current) => {
        if (current < 0) return direction > 0 ? 0 : suggestions.length - 1
        return (current + direction + suggestions.length) % suggestions.length
      })
    }
    if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault()
      selectSuggestion(suggestions[highlightedIndex])
    }
  }

  return (
    <div className="relative min-w-0">
      <input
        required={required}
        inputMode="numeric"
        pattern="[1-8][0-9]{5}"
        value={value}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => {
          setHighlightedIndex(-1)
          assist.updatePincode(
            event.target.value.replace(/\D/g, '').slice(0, 6),
          )
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="postal-code"
        aria-autocomplete="list"
        aria-expanded={showPanel}
        aria-controls={showPanel ? listId : undefined}
        aria-activedescendant={
          showPanel && highlightedIndex >= 0
            ? `${listId}-option-${highlightedIndex}`
            : undefined
        }
        className={`${className} pr-10`}
      />
      {assist.pincodeLookup.status === 'loading' && (
        <LoaderCircle
          size={14}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[#397a4a]"
        />
      )}
      {showPanel && (
        <SuggestionPanel
          {...assist.pincodeLookup}
          id={listId}
          type="pincode"
          highlightedIndex={highlightedIndex}
          onHighlight={setHighlightedIndex}
          onSelect={selectSuggestion}
        />
      )}
    </div>
  )
}

function LocationSelectionInput({
  value,
  options,
  onSelect,
  className,
  placeholder,
  disabled = false,
  required = false,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const triggerRef = useRef(null)
  const listId = `location-options-${useId().replace(/:/g, '')}`
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return options
    return options.filter((option) =>
      option.toLowerCase().includes(normalizedQuery),
    )
  }, [options, query])

  const closePanel = () => {
    setOpen(false)
    setQuery('')
    setHighlightedIndex(-1)
  }

  const chooseOption = (option) => {
    onSelect(option)
    closePanel()
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closePanel()
      triggerRef.current?.focus()
      return
    }
    if (!filteredOptions.length) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const direction = event.key === 'ArrowDown' ? 1 : -1
      setHighlightedIndex((current) => {
        if (current < 0) {
          return direction > 0 ? 0 : filteredOptions.length - 1
        }
        return (
          (current + direction + filteredOptions.length) %
          filteredOptions.length
        )
      })
    }
    if (event.key === 'Enter' && highlightedIndex >= 0) {
      event.preventDefault()
      chooseOption(filteredOptions[highlightedIndex])
    }
  }

  return (
    <div
      className="relative min-w-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) closePanel()
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-required={required}
        onClick={() => {
          setOpen((current) => !current)
          setQuery('')
          setHighlightedIndex(-1)
        }}
        className={`${className} flex items-center justify-between gap-3 text-left disabled:cursor-not-allowed disabled:opacity-55`}
      >
        <span className={value ? 'truncate' : 'truncate text-slate-400'}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
          <div className="relative m-1 mb-1.5">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setHighlightedIndex(-1)
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={`Search ${placeholder.toLowerCase()}`}
              aria-label={`Search ${placeholder.toLowerCase()}`}
              aria-controls={listId}
              aria-activedescendant={
                highlightedIndex >= 0
                  ? `${listId}-option-${highlightedIndex}`
                  : undefined
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-[#fafbfa] pl-9 pr-3 text-[10px] font-semibold text-slate-700 outline-none focus:border-[#75916f] focus:ring-4 focus:ring-[#75916f]/10"
            />
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label={`${placeholder} options`}
            className="max-h-56 overflow-y-auto overscroll-contain"
          >
            {filteredOptions.length ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option}
                  id={`${listId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={option === value}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseOption(option)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-[10px] font-semibold text-slate-600 transition ${highlightedIndex === index ? 'bg-[#f2f7f2]' : 'hover:bg-[#f2f7f2]'}`}
                >
                  <span>{option}</span>
                  {option === value && (
                    <Check size={13} className="shrink-0 text-[#397a4a]" />
                  )}
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-[10px] font-bold text-slate-500">
                No matching {placeholder.toLowerCase()} found.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function StateSelectionInput({
  assist,
  value,
  className,
  required = false,
}) {
  return (
    <LocationSelectionInput
      value={value}
      options={assist.locationOptions.states}
      onSelect={assist.selectState}
      className={className}
      placeholder="State"
      required={required}
    />
  )
}

export function CitySelectionInput({
  assist,
  value,
  className,
  required = false,
}) {
  return (
    <LocationSelectionInput
      value={value}
      options={assist.locationOptions.cities}
      onSelect={assist.selectCity}
      className={className}
      placeholder={
        assist.locationOptions.hasSelectedState
          ? 'City'
          : 'Select state first'
      }
      disabled={!assist.locationOptions.hasSelectedState}
      required={required}
    />
  )
}
