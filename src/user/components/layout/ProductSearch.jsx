import { ArrowUpRight, Search, Tag, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  getRelatedSearches,
  matchesProductQuery,
  normalizeSearchQuery,
} from '../../utils/productSearch'

export default function ProductSearch({
  products,
  value,
  onChange,
  onSelect,
  onSubmitQuery,
  placeholder,
  mobile = false,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const resultsId = `product-search-${useId().replace(/:/g, '')}`
  const normalizedQuery = normalizeSearchQuery(value)
  const results = useMemo(
    () =>
      normalizedQuery
        ? products
            .filter((product) => matchesProductQuery(product, normalizedQuery))
            .slice(0, 6)
        : [],
    [normalizedQuery, products],
  )
  const relatedSearches = useMemo(
    () => getRelatedSearches(normalizedQuery),
    [normalizedQuery],
  )
  const recommendedProducts = useMemo(
    () =>
      [...products]
        .sort(
          (a, b) =>
            Number(b.featured) - Number(a.featured) || b.rating - a.rating,
        )
        .slice(0, 3),
    [products],
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

  const showSearchResults = (query = value) => {
    if (!normalizeSearchQuery(query)) return
    setOpen(false)
    onSubmitQuery?.(query)
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
  }

  const submit = (event) => {
    event.preventDefault()
    showSearchResults()
  }

  const selectProduct = (product) => {
    setOpen(false)
    onChange('')
    onSelect(product)
  }

  const selectRelatedSearch = ({ query }) => {
    onChange(query)
    showSearchResults(query)
  }

  return (
    <form ref={containerRef} onSubmit={submit} className="relative w-full">
      <Search
        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400 ${mobile ? 'left-3' : 'left-4'}`}
        size={mobile ? 16 : 17}
      />
      <input
        type="search"
        value={value}
        onFocus={() => normalizedQuery && setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(Boolean(event.target.value.trim()))
        }}
        aria-label="Search products"
        aria-expanded={open && Boolean(normalizedQuery)}
        aria-controls={resultsId}
        autoComplete="off"
        className={`w-full rounded-full border border-slate-200 bg-white text-sm outline-none transition placeholder:text-slate-400 focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10 ${mobile ? 'h-10 pl-9 pr-8 text-xs' : 'h-11 pl-11 pr-11'}`}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            setOpen(false)
          }}
          className={`absolute top-1/2 grid -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 ${mobile ? 'right-1.5 size-7' : 'right-3 size-7'}`}
          aria-label="Clear search"
        >
          <X size={13} />
        </button>
      )}

      {open && normalizedQuery && (
        <div
          id={resultsId}
          className={`absolute top-[calc(100%+10px)] z-[70] max-h-[min(28rem,calc(100vh-7rem))] overflow-y-auto overscroll-contain rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.2)] ${mobile ? '-right-12 w-[calc(100vw-1.5rem)] sm:w-[32rem]' : 'left-0 w-full'}`}
        >
          {results.length ? (
            <section aria-labelledby={`${resultsId}-products`}>
              <div className="flex items-center justify-between px-3 pb-2 pt-1">
                <p
                  id={`${resultsId}-products`}
                  className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400"
                >
                  Products
                </p>
                <span className="text-[9px] font-bold text-[#397a4a]">
                  {results.length} found
                </span>
              </div>
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
            </section>
          ) : (
            <section className="px-3 py-4 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#eef5ef] text-[#397a4a]">
                <Search size={19} />
              </span>
              <p className="mt-3 text-xs font-extrabold text-slate-800">
                No products found
              </p>
              <p className="mt-1 text-[10px] leading-5 text-slate-400">
                Try a related search or explore one of these products.
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {['Audio', 'Wearables', 'Components'].map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      selectRelatedSearch({ query: category.toLowerCase() })
                    }
                    className="rounded-full bg-[#f2f7f2] px-3 py-1.5 text-[9px] font-extrabold text-[#397a4a] transition hover:bg-[#dcebdd]"
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-1 border-t border-slate-100 pt-2 text-left">
                {recommendedProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectProduct(product)}
                    className="flex items-center gap-2 rounded-xl p-2 text-[10px] font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    <img
                      src={product.image}
                      alt=""
                      className="size-8 rounded-lg object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {product.name}
                    </span>
                    <ArrowUpRight size={13} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {relatedSearches.length > 0 && (
            <section className="mt-2 border-t border-slate-100 px-2 pb-1 pt-3">
              <p className="px-1 text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
                Related searches
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {relatedSearches.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    onClick={() => selectRelatedSearch(suggestion)}
                    className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:bg-[#eef5ef] hover:text-[#397a4a]"
                  >
                    <Tag size={11} />
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </form>
  )
}
