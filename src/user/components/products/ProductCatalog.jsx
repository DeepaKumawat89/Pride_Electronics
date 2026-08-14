import {
  ArrowRight,
  Check,
  Filter,
  SlidersHorizontal,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import SelectMenu from '../../../components/ui/SelectMenu'
import { useAnchoredPopover } from '../../../hooks/useAnchoredPopover'
import {
  availabilityFilterOptions,
  catalogCategories,
  defaultCatalogFilters,
  discountFilterOptions,
  filterCatalogProducts,
  getCatalogFilterOptions,
  priceFilterOptions,
  ratingFilterOptions,
} from '../../utils/catalog'
import ProductCard from './ProductCard'

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Best rated' },
  { value: 'popular', label: 'Most popular' },
  { value: 'discount', label: 'Highest discount' },
]

export default function ProductCatalog({
  products,
  suggestedProducts = [],
  onSuggestedCategoryChange,
  activeCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  likedIds,
  onLike,
  onAdd,
  onBuyNow,
  onView,
}) {
  const [subcategory, setSubcategory] = useState('All')
  const [catalogFilters, setCatalogFilters] = useState(defaultCatalogFilters)
  const filterOptions = useMemo(
    () => getCatalogFilterOptions(products),
    [products],
  )
  const activeSubcategory = filterOptions.subcategories.includes(subcategory)
    ? subcategory
    : 'All'
  const effectiveFilters = useMemo(() => {
    const nextFilters = { ...catalogFilters }
    const dynamicFilterKeys = [
      'brand',
      'feature',
      'ram',
      'storage',
      'connectivity',
      'power',
      'voltage',
      'type',
      'compatibility',
    ]
    dynamicFilterKeys.forEach((key) => {
      if (
        nextFilters[key] !== 'All' &&
        !filterOptions[key].includes(nextFilters[key])
      ) {
        nextFilters[key] = 'All'
      }
    })
    return nextFilters
  }, [catalogFilters, filterOptions])
  const visibleProducts = useMemo(
    () =>
      filterCatalogProducts(products, activeSubcategory, effectiveFilters),
    [activeSubcategory, effectiveFilters, products],
  )
  const showFeatureCards =
    activeCategory === 'All' && visibleProducts.length > 4
  const lifestyleProduct =
    visibleProducts.find((product) => product.category === 'Wearables') ||
    visibleProducts[0]
  const performanceProduct =
    visibleProducts.find(
      (product) => product.category === 'Components & DIY',
    ) ||
    visibleProducts[1] ||
    visibleProducts[0]

  const updateFilter = (key, value) => {
    setCatalogFilters((current) => ({ ...current, [key]: value }))
  }

  const clearCatalogFilters = () => {
    setSubcategory('All')
    setCatalogFilters(defaultCatalogFilters)
  }

  const selectSuggestedCategory = (nextCategory) => {
    clearCatalogFilters()
    onSuggestedCategoryChange(nextCategory)
  }

  const getProductOrder = (index) => {
    if (!showFeatureCards) return ''
    if (index < 2) return 'order-1'
    if (index === 2) return 'order-3 md:order-1'
    if (index === 3) return 'order-3 xl:order-1'
    return 'order-3'
  }

  return (
    <section
      id="catalog"
      className="mx-auto max-w-[1440px] scroll-mt-32 px-4 py-8 sm:px-6 lg:px-10 lg:py-12"
    >
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">
            Curated for you
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">
            Trending right now
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Our most-loved tech, chosen by customers.
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <CatalogFilters
            activeCategory={activeCategory}
            onCategoryChange={onCategoryChange}
            filters={effectiveFilters}
            onFilterChange={updateFilter}
            options={filterOptions}
            onClear={clearCatalogFilters}
          />
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white pl-4 text-xs font-bold text-slate-600 sm:w-52 sm:flex-none">
            <SlidersHorizontal size={14} className="shrink-0" />
            <SelectMenu
              value={sortBy}
              onChange={onSortChange}
              options={sortOptions}
              ariaLabel="Sort products"
              className="min-w-0 flex-1"
              buttonClassName="h-10 rounded-r-full pr-4"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {catalogCategories.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onCategoryChange(filter)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${activeCategory === filter ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-400'}`}
          >
            {filter}
          </button>
        ))}
      </div>

      {activeCategory !== 'All' && filterOptions.subcategories.length > 1 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-2">
          <span className="shrink-0 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
            Subcategory
          </span>
          {['All', ...filterOptions.subcategories].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSubcategory(item)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold transition ${activeSubcategory === item ? 'bg-[#397a4a] text-white' : 'border border-slate-200 bg-white text-slate-500 hover:border-[#8bb495]'}`}
            >
              {item === 'All' ? `All ${activeCategory}` : item}
            </button>
          ))}
        </div>
      )}

      {visibleProducts.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
          {visibleProducts.map((product, index) => (
            <div
              key={product.id}
              className={`min-w-0 ${getProductOrder(index)}`}
            >
              <ProductCard
                product={product}
                liked={likedIds.includes(product.id)}
                onLike={onLike}
                onAdd={onAdd}
                onBuyNow={onBuyNow}
                onView={onView}
              />
            </div>
          ))}

          {showFeatureCards && (
            <div className="order-2 col-span-full grid gap-4 md:grid-cols-2 sm:gap-5">
              <article className="group relative min-h-64 overflow-hidden rounded-[28px] bg-[#dcebdd] shadow-sm sm:min-h-72">
                <img
                  src={lifestyleProduct.image}
                  alt=""
                  className="absolute inset-y-0 right-0 h-full w-[58%] object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#dcebdd] via-[#dcebdd]/95 to-[#dcebdd]/10" />
                <div className="absolute -left-12 -top-16 size-48 rounded-full bg-white/45 blur-3xl" />
                <div className="relative z-10 flex min-h-64 max-w-[72%] flex-col items-start justify-center p-5 sm:min-h-72 sm:max-w-[64%] sm:p-7">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#397a4a] backdrop-blur">
                    <Sparkles size={12} /> Everyday intelligence
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.04em] text-slate-950 sm:text-3xl">
                    Smarter tech for every move.
                  </h3>
                  <p className="mt-3 text-xs font-medium leading-5 text-slate-600">
                    Stay connected, active, and effortlessly in control
                    throughout your day.
                  </p>
                  <button
                    type="button"
                    onClick={() => onView(lifestyleProduct)}
                    className="mt-5 flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-[10px] font-extrabold text-white transition hover:bg-[#ff5c35]"
                  >
                    Explore the edit <ArrowRight size={13} />
                  </button>
                </div>
              </article>

              <article className="group relative min-h-64 overflow-hidden rounded-[28px] bg-slate-950 shadow-sm sm:min-h-72">
                <img
                  src={performanceProduct.image}
                  alt=""
                  className="absolute inset-y-0 right-0 h-full w-[62%] object-cover opacity-80 transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/15" />
                <div className="absolute -bottom-20 left-10 size-52 rounded-full bg-[#9bcaa6]/20 blur-3xl" />
                <div className="relative z-10 flex min-h-64 max-w-[72%] flex-col items-start justify-center p-5 text-white sm:min-h-72 sm:max-w-[64%] sm:p-7">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#b6dfbf] backdrop-blur">
                    <Zap size={12} fill="currentColor" /> Performance lab
                  </span>
                  <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.04em] sm:text-3xl">
                    Build without limits.
                  </h3>
                  <p className="mt-3 text-xs font-medium leading-5 text-white/65">
                    High-performance components selected for ambitious setups
                    and bold ideas.
                  </p>
                  <button
                    type="button"
                    onClick={() => onView(performanceProduct)}
                    className="mt-5 flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[10px] font-extrabold text-slate-950 transition hover:bg-[#9bcaa6]"
                  >
                    Discover performance <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            </div>
          )}
        </div>
      ) : (
        <div className="py-10 sm:py-14">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-lg font-extrabold text-slate-800">
              No products found
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Try another search or explore a suggested category.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {catalogCategories.slice(1).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => selectSuggestedCategory(filter)}
                  className="rounded-full border border-slate-200 bg-[#f7f8f5] px-4 py-2 text-xs font-bold text-slate-600 transition hover:border-[#ff5c35] hover:text-[#ff5c35]"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {suggestedProducts.length > 0 && (
            <div className="mt-10">
              <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ff5c35]">
                    You may also like
                  </p>
                  <h3 className="mt-1 text-xl font-extrabold tracking-tight text-slate-900">
                    Suggested products
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => selectSuggestedCategory('All')}
                  className="shrink-0 text-xs font-extrabold text-[#397a4a] transition hover:text-[#ff5c35]"
                >
                  View all
                </button>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
                {suggestedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    liked={likedIds.includes(product.id)}
                    onLike={onLike}
                    onAdd={onAdd}
                    onBuyNow={onBuyNow}
                    onView={onView}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function CatalogFilters({
  activeCategory,
  onCategoryChange,
  filters,
  onFilterChange,
  options,
  onClear,
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const position = useAnchoredPopover({
    open,
    setOpen,
    triggerRef,
    popoverRef: panelRef,
    fixedWidth: 460,
    constrainWidth: true,
    align: 'right',
    panelHeight: 600,
    flipVertical: true,
  })
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== defaultCatalogFilters[key],
  ).length

  const electronicsGroups = [
    ['ram', 'RAM'],
    ['storage', 'Storage'],
    ['connectivity', 'Connectivity'],
    ['power', 'Power'],
    ['voltage', 'Voltage'],
    ['type', 'Type'],
    ['compatibility', 'Compatibility'],
  ].filter(([key]) => options[key].length > 0)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative flex h-10 w-28 shrink-0 items-center justify-center gap-2 rounded-full border bg-white px-3 text-[10px] font-extrabold transition ${open || activeFilterCount ? 'border-[#ff5c35] text-[#d84220] ring-4 ring-[#ff5c35]/10' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
      >
        <Filter size={14} />
        Filters
        {activeFilterCount > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-[#ff5c35] text-[9px] text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Filter products"
            style={position}
            className="fixed z-[100] flex h-[min(600px,calc(100vh-24px))] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.2)]"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-sm font-extrabold text-slate-900">
                  Product filters
                </p>
                <p className="mt-0.5 text-[9px] text-slate-400">
                  Options update for the selected category.
                </p>
              </div>
              <span className="rounded-full bg-[#eef5ef] px-2.5 py-1 text-[9px] font-extrabold text-[#397a4a]">
                {activeFilterCount} active
              </span>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <FilterChoiceGroup
                label="Category"
                value={activeCategory}
                options={catalogCategories}
                onChange={onCategoryChange}
              />
              <FilterChoiceGroup
                label="Brand"
                value={filters.brand}
                options={['All', ...options.brand]}
                onChange={(value) => onFilterChange('brand', value)}
              />
              <FilterChoiceGroup
                label="Price"
                value={filters.price}
                options={priceFilterOptions}
                onChange={(value) => onFilterChange('price', value)}
              />
              <FilterChoiceGroup
                label="Rating"
                value={filters.rating}
                options={ratingFilterOptions}
                onChange={(value) => onFilterChange('rating', value)}
              />
              <FilterChoiceGroup
                label="Availability"
                value={filters.availability}
                options={availabilityFilterOptions}
                onChange={(value) => onFilterChange('availability', value)}
              />
              <FilterChoiceGroup
                label="Discount"
                value={filters.discount}
                options={discountFilterOptions}
                onChange={(value) => onFilterChange('discount', value)}
              />
              <FilterChoiceGroup
                label="Specifications"
                value={filters.feature}
                options={['All', ...options.feature]}
                onChange={(value) => onFilterChange('feature', value)}
              />

              {electronicsGroups.length > 0 && (
                <section className="border-t border-slate-100 pt-5">
                  <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#ff5c35]">
                    Electronics filters
                  </p>
                  <div className="space-y-5">
                    {electronicsGroups.map(([key, label]) => (
                      <FilterChoiceGroup
                        key={key}
                        label={label}
                        value={filters[key]}
                        options={['All', ...options[key]]}
                        onChange={(value) => onFilterChange(key, value)}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-3">
              <button
                type="button"
                disabled={!activeFilterCount}
                onClick={onClear}
                className="text-[10px] font-extrabold text-[#ff5c35] disabled:opacity-35"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-[10px] font-extrabold text-white transition hover:bg-[#397a4a]"
              >
                Show products
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

function FilterChoiceGroup({ label, value, options, onChange }) {
  return (
    <section>
      <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const normalizedOption =
            typeof option === 'string'
              ? { value: option, label: option }
              : option
          const active = value === normalizedOption.value
          return (
            <button
              key={normalizedOption.value}
              type="button"
              onClick={() => onChange(normalizedOption.value)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[9px] font-extrabold transition ${active ? 'bg-[#253329] text-white' : 'bg-[#f4f7ef] text-slate-600 hover:bg-[#e9efe4]'}`}
            >
              {active && <Check size={11} />}
              {normalizedOption.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}
