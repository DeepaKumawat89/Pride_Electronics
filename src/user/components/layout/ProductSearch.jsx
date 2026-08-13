import { ArrowUpRight, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export default function ProductSearch({
  products,
  value,
  onChange,
  onSelect,
  placeholder,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const normalizedQuery = value.trim().toLowerCase()
  const results = useMemo(
    () =>
      normalizedQuery
        ? products
            .filter((product) =>
              `${product.name} ${product.category} ${product.description}`
                .toLowerCase()
                .includes(normalizedQuery),
            )
            .slice(0, 8)
        : [],
    [normalizedQuery, products],
  )

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const submit = (event) => {
    event.preventDefault()
    if (!normalizedQuery) return
    setOpen(false)
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
  }

  const selectProduct = (product) => {
    setOpen(false)
    onChange('')
    onSelect(product)
  }

  return (
    <form ref={containerRef} onSubmit={submit} className="relative w-full">
      <Search
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        size={17}
      />
      <input
        type="search"
        value={value}
        onFocus={() => normalizedQuery && setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(Boolean(event.target.value.trim()))
        }}
        aria-expanded={open && Boolean(normalizedQuery)}
        aria-controls="header-search-results"
        autoComplete="off"
        className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            setOpen(false)
          }}
          className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}

      {open && normalizedQuery && (
        <div
          id="header-search-results"
          className="absolute left-0 top-[calc(100%+10px)] z-[70] h-80 w-full overflow-y-auto overscroll-contain rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
        >
          <div className="flex items-center justify-between px-3 pb-2 pt-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
              Search results
            </p>
            <span className="text-[9px] font-bold text-[#397a4a]">
              {results.length} found
            </span>
          </div>
          {results.length ? (
            <div className="space-y-1">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => selectProduct(product)}
                  className="group flex w-full items-center gap-3 rounded-[18px] p-2 text-left transition hover:bg-[#f2f7f2]"
                >
                  <img
                    src={product.image}
                    alt=""
                    className="size-12 shrink-0 rounded-[14px] object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-extrabold text-slate-800">
                      {product.name}
                    </span>
                    <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider text-[#75916f]">
                      {product.category}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-extrabold text-slate-900">
                    {product.price}
                  </span>
                  <ArrowUpRight
                    size={14}
                    className="shrink-0 text-slate-300 transition group-hover:text-[#ff5c35]"
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="grid h-[250px] place-items-center px-6 text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#eef5ef] text-[#397a4a]">
                  <Search size={19} />
                </span>
                <p className="mt-3 text-xs font-extrabold text-slate-800">
                  No matching products
                </p>
                <p className="mt-1 text-[10px] leading-5 text-slate-400">
                  Try a product name, category, or feature.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  )
}
