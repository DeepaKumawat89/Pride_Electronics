import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Filter,
  Menu,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import SelectMenu from '../../../components/ui/SelectMenu'
import { useAnchoredPopover } from '../../../hooks/useAnchoredPopover'
import {
  availabilityFilterOptions,
  catalogCategories,
  defaultCatalogFilters,
  filterCatalogProducts,
  getCatalogFilterOptions,
  priceFilterOptions,
  ratingFilterOptions,
} from '../../utils/catalog'
import ProductCard from './ProductCard'
import StorefrontImage from '../common/StorefrontImage'

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-low', label: 'Price: low to high' },
  { value: 'price-high', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Best rated' },
  { value: 'popular', label: 'Most popular' },
]

export default function ProductCatalog({
  products,
  allProducts = products,
  categories = [],
  subcategories = [],
  suggestedProducts = [],
  onSuggestedCategoryChange,
  activeCategory,
  activeCategoryId = '',
  selectedSubcategory = '',
  onCategoryChange,
  onSubcategoryChange,
  sortBy,
  onSortChange,
  likedIds,
  onLike,
  onAdd,
  onBuyNow,
  onView,
  offers,
  categoryNames = catalogCategories.slice(1),
  showPromotions = true,
  loading = false,
  error = '',
  onRetry,
  initialVisibleCount = 24,
  productBatchSize = 24,
  maxVisibleProducts = Number.POSITIVE_INFINITY,
  paginationResetKey = '',
}) {
  const availableCategories = ['All', ...categoryNames]
  const [subcategory, setSubcategory] = useState(selectedSubcategory || 'All')
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState(
    () => new Set(activeCategory !== 'All' ? [activeCategory] : []),
  )
  const [catalogFilters, setCatalogFilters] = useState(defaultCatalogFilters)
  const categoryTree = useMemo(
    () =>
      categories.filter((category) => category.enabled !== false).map((category) => {
        const name = category.name
        const categoryProducts = allProducts.filter(
          (product) => String(product.categoryId || '') === String(category.id) || (!product.categoryId && product.category === name),
        )
        const productSubcategories = [
          ...new Set(
            categoryProducts
              .map((product) => product.subcategory)
              .filter(Boolean),
          ),
        ]
          .sort((a, b) => a.localeCompare(b))
          .map((subcategoryName) => ({ name: subcategoryName }))
        const configuredSubcategories = subcategories
          .filter((subcategory) => String(subcategory.categoryId) === String(category.id) && subcategory.enabled !== false)
        const childNames = new Set(configuredSubcategories.map((item) => item.name.toLowerCase()))
        const categorySubcategories = [
          ...configuredSubcategories,
          ...productSubcategories.filter((item) => !childNames.has(item.name.toLowerCase())),
        ]

        return {
          id: category.id || name,
          name,
          category,
          subcategories: categorySubcategories,
        }
      }),
    [allProducts, categories, subcategories],
  )
  useEffect(() => {
    setSubcategory(selectedSubcategory || 'All')
  }, [activeCategory, selectedSubcategory])
  const filterOptions = useMemo(
    () => getCatalogFilterOptions(products),
    [products],
  )
  const activeCategoryNode = categoryTree.find(
    (category) => activeCategoryId
      ? String(category.id) === String(activeCategoryId)
      : category.name === activeCategory,
  )
  const activeSubcategory =
    subcategory === 'All' ||
    activeCategoryNode?.subcategories.some((item) => item.name === subcategory)
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
  const matchingProducts = useMemo(
    () =>
      filterCatalogProducts(products, activeSubcategory, effectiveFilters),
    [activeSubcategory, effectiveFilters, products],
  )
  const uniqueProducts = useMemo(() => {
    const seenProductIds = new Set()
    return matchingProducts.filter((product) => {
      const productId = String(product.id)
      if (seenProductIds.has(productId)) return false
      seenProductIds.add(productId)
      return true
    })
  }, [matchingProducts])
  const availableProducts = useMemo(
    () =>
      Number.isFinite(maxVisibleProducts)
        ? uniqueProducts.slice(0, Math.max(0, maxVisibleProducts))
        : uniqueProducts,
    [maxVisibleProducts, uniqueProducts],
  )
  const paginationKey = useMemo(
    () =>
      JSON.stringify([
        paginationResetKey,
        activeCategory,
        activeSubcategory,
        sortBy,
        effectiveFilters,
        products.map((product) => product.id),
      ]),
    [
      activeCategory,
      activeSubcategory,
      effectiveFilters,
      paginationResetKey,
      products,
      sortBy,
    ],
  )
  const [pagination, setPagination] = useState({ key: '', count: initialVisibleCount })
  const visibleCount =
    pagination.key === paginationKey ? pagination.count : initialVisibleCount
  const renderedProducts = availableProducts.slice(0, visibleCount)
  const hasMoreProducts = renderedProducts.length < availableProducts.length

  const showFeatureCards =
    showPromotions && activeCategory === 'All' && availableProducts.length > 4
  const today = new Date().toISOString().slice(0, 10)
  const flashSaleActive =
    offers?.flashSale?.enabled !== false &&
    (!offers?.flashSale?.startDate || offers.flashSale.startDate <= today) &&
    (!offers?.flashSale?.endDate || offers.flashSale.endDate >= today)
  const lifestyleProduct =
    availableProducts.find(
      (product) => String(product.id) === String(offers?.flashSale?.productId),
    ) ||
    availableProducts.find((product) => product.category === 'Wearables') ||
    availableProducts[0]
  const performanceProduct =
    availableProducts.find(
      (product) => String(product.id) === String(offers?.deal?.productId),
    ) ||
    availableProducts.find(
      (product) => product.category === 'Components & DIY',
    ) ||
    availableProducts[1] ||
    availableProducts[0]

  useEffect(() => {
    if (!categoryDrawerOpen) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setCategoryDrawerOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [categoryDrawerOpen])

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

  const selectCategory = (nextCategory, closeDrawer = false) => {
    const categoryRecord = typeof nextCategory === 'object'
      ? nextCategory
      : categoryTree.find((item) => item.name === nextCategory)?.category
    const categoryName = typeof nextCategory === 'object' ? nextCategory.name : nextCategory
    clearCatalogFilters()
    if (categoryName !== 'All') {
      setExpandedCategories((current) => {
        const next = new Set(current)
        next.add(categoryName)
        return next
      })
    }
    onCategoryChange(categoryName, categoryRecord)
    if (closeDrawer) setCategoryDrawerOpen(false)
  }

  const selectSubcategory = (categoryValue, subcategoryValue, closeDrawer = false) => {
    const categoryRecord = typeof categoryValue === 'object'
      ? categoryValue
      : categoryTree.find((item) => item.name === categoryValue)?.category
    const categoryName = typeof categoryValue === 'object' ? categoryValue.name : categoryValue
    const subcategoryRecord = typeof subcategoryValue === 'object'
      ? subcategoryValue
      : categoryTree.find((item) => item.name === categoryName)?.subcategories.find((item) => item.name === subcategoryValue)
    const nextSubcategory = typeof subcategoryValue === 'object' ? subcategoryValue.name : subcategoryValue
    setCatalogFilters(defaultCatalogFilters)
    setSubcategory(nextSubcategory)
    onSubcategoryChange?.(categoryName, nextSubcategory, categoryRecord, subcategoryRecord)
    if (closeDrawer) setCategoryDrawerOpen(false)
  }

  const toggleCategory = (categoryName) => {
    setExpandedCategories((current) => {
      const next = new Set(current)
      if (next.has(categoryName)) next.delete(categoryName)
      else next.add(categoryName)
      return next
    })
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
      className="mx-auto max-w-[1680px] scroll-mt-32 px-3 pb-7 pt-2 sm:px-4 sm:pt-3 lg:px-5 lg:pb-10 lg:pt-3 xl:px-6"
    >
      {categoryDrawerOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Product categories"
            data-storefront-overlay="categories"
          >
            <button
              type="button"
              aria-label="Close category menu"
              onClick={() => setCategoryDrawerOpen(false)}
              className="absolute inset-0 h-full w-full cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            />
            <div className="absolute inset-y-0 left-0 flex w-[min(88vw,360px)] flex-col bg-[#fafbf8] shadow-[20px_0_60px_rgba(15,23,42,0.2)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">Shop by</p>
                  <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-950">Categories</h2>
                </div>
                <button
                  type="button"
                  aria-label="Close category menu"
                  onClick={() => setCategoryDrawerOpen(false)}
                  className="grid size-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-[#ff5c35] hover:text-[#ff5c35]"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <CategoryNavigation
                  categoryTree={categoryTree}
                  activeCategory={activeCategory}
                  activeCategoryId={activeCategoryId}
                  activeSubcategory={activeSubcategory}
                  expandedCategories={expandedCategories}
                  onCategorySelect={(item) => selectCategory(item, true)}
                  onSubcategorySelect={(categoryItem, subcategoryItem) =>
                    selectSubcategory(categoryItem, subcategoryItem, true)
                  }
                  onToggleCategory={toggleCategory}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}

      <div className="grid items-start gap-5 lg:grid-cols-[310px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)] xl:gap-7">
        <aside className="sticky top-28 hidden max-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-3 shadow-[0_12px_35px_rgba(15,23,42,0.06)] lg:flex">
          <div className="shrink-0 px-3 pb-3 pt-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">Shop by</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-[-0.035em] text-slate-950">Categories</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Browse the complete collection</p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <CategoryNavigation
              categoryTree={categoryTree}
              activeCategory={activeCategory}
              activeCategoryId={activeCategoryId}
              activeSubcategory={activeSubcategory}
              expandedCategories={expandedCategories}
              onCategorySelect={selectCategory}
              onSubcategorySelect={selectSubcategory}
              onToggleCategory={toggleCategory}
            />
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <nav
              aria-label="Catalog breadcrumb"
              className="flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs font-extrabold"
            >
              {activeCategory === 'All' ? (
                <span className="text-slate-900">All products</span>
              ) : (
                <button
                  type="button"
                  onClick={() => selectCategory('All')}
                  className="text-slate-500 transition hover:text-[#397a4a]"
                >
                  All products
                </button>
              )}
              {activeCategory !== 'All' && (
                <>
                  <ChevronRight size={13} className="shrink-0 text-slate-300" />
                  {activeSubcategory === 'All' ? (
                    <span className="text-slate-900">{activeCategory}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => selectCategory(activeCategory)}
                      className="text-slate-500 transition hover:text-[#397a4a]"
                    >
                      {activeCategory}
                    </button>
                  )}
                </>
              )}
              {activeCategory !== 'All' && activeSubcategory !== 'All' && (
                <>
                  <ChevronRight size={13} className="shrink-0 text-slate-300" />
                  <span className="text-slate-900">{activeSubcategory}</span>
                </>
              )}
            </nav>

            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setCategoryDrawerOpen(true)}
                aria-haspopup="dialog"
                className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-[10px] font-extrabold text-slate-700 transition hover:border-[#397a4a] hover:text-[#397a4a] lg:hidden"
              >
                <Menu size={14} /> Categories
              </button>
              <CatalogFilters
                activeCategory={activeCategory}
                onCategoryChange={selectCategory}
                filters={effectiveFilters}
                onFilterChange={updateFilter}
                options={filterOptions}
                onClear={clearCatalogFilters}
                categories={availableCategories}
              />
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-slate-200 bg-white pl-3 text-xs font-bold text-slate-600 sm:w-48 sm:flex-none">
                <SlidersHorizontal size={14} className="shrink-0" />
                <SelectMenu
                  value={sortBy}
                  onChange={onSortChange}
                  options={sortOptions}
                  ariaLabel="Sort products"
                  className="min-w-0 flex-1"
                  buttonClassName="h-10 rounded-r-full pr-3"
                />
              </div>
            </div>
          </div>

      {loading ? (
        <div className="py-10 sm:py-14" aria-live="polite" aria-busy="true">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
            <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#75916f]/25 border-t-[#536a50]" />
            <p className="mt-4 text-sm font-extrabold text-slate-800">Loading products…</p>
          </div>
        </div>
      ) : error ? (
        <div className="py-10 sm:py-14" role="alert">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-6 py-10 text-center">
            <p className="text-lg font-extrabold text-slate-800">Products are temporarily unavailable</p>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">The catalog could not be loaded. This is a connection problem, not an empty search result.</p>
            {onRetry && (
              <button type="button" onClick={onRetry} className="mt-5 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#397a4a]">Retry loading</button>
            )}
          </div>
        </div>
      ) : uniqueProducts.length ? (
        <>
          <div className="storefront-product-grid mt-7 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 xl:grid-cols-3">
            {renderedProducts.map((product, index) => (
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

            {showFeatureCards && (flashSaleActive || offers?.deal?.enabled !== false) && (
              <div className="order-2 col-span-full grid gap-4 md:grid-cols-2 sm:gap-5">
                {flashSaleActive && <article className="group relative min-h-64 overflow-hidden rounded-[28px] bg-[#dcebdd] shadow-sm sm:min-h-72">
                  <StorefrontImage
                    src={lifestyleProduct.thumbnail || lifestyleProduct.image}
                    alt=""
                    width="640"
                    height="576"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-y-0 right-0 h-full w-[58%] object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#dcebdd] via-[#dcebdd]/95 to-[#dcebdd]/10" />
                  <div className="absolute -left-12 -top-16 size-48 rounded-full bg-white/45 blur-3xl" />
                  <div className="relative z-10 flex min-h-64 max-w-[72%] flex-col items-start justify-center p-5 sm:min-h-72 sm:max-w-[64%] sm:p-7">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#397a4a] backdrop-blur">
                      <Sparkles size={12} /> {offers?.flashSale?.eyebrow || 'Everyday intelligence'}
                    </span>
                    <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.04em] text-slate-950 sm:text-3xl">
                      {offers?.flashSale?.title || 'Smarter tech for every move.'}
                    </h3>
                    <p className="mt-3 text-xs font-medium leading-5 text-slate-600">
                      {offers?.flashSale?.description || 'Stay connected, active, and effortlessly in control throughout your day.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => onView(lifestyleProduct)}
                      className="mt-5 flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-[10px] font-extrabold text-white transition hover:bg-[#ff5c35]"
                    >
                      {offers?.flashSale?.actionLabel || 'Explore the edit'} <ArrowRight size={13} />
                    </button>
                  </div>
                </article>}

                {offers?.deal?.enabled !== false && <article className="group relative min-h-64 overflow-hidden rounded-[28px] bg-slate-950 shadow-sm sm:min-h-72">
                  <StorefrontImage
                    src={performanceProduct.thumbnail || performanceProduct.image}
                    alt=""
                    width="640"
                    height="576"
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-y-0 right-0 h-full w-[62%] object-cover opacity-80 transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/15" />
                  <div className="absolute -bottom-20 left-10 size-52 rounded-full bg-[#9bcaa6]/20 blur-3xl" />
                  <div className="relative z-10 flex min-h-64 max-w-[72%] flex-col items-start justify-center p-5 text-white sm:min-h-72 sm:max-w-[64%] sm:p-7">
                    <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#b6dfbf] backdrop-blur">
                      <Zap size={12} fill="currentColor" /> {offers?.deal?.eyebrow || 'Performance lab'}
                    </span>
                    <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.04em] sm:text-3xl">
                      {offers?.deal?.title || 'Build without limits.'}
                    </h3>
                    <p className="mt-3 text-xs font-medium leading-5 text-white/65">
                      {offers?.deal?.description || 'High-performance components selected for ambitious setups and bold ideas.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => onView(performanceProduct)}
                      className="mt-5 flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[10px] font-extrabold text-slate-950 transition hover:bg-[#9bcaa6]"
                    >
                      {offers?.deal?.actionLabel || 'Discover performance'} <ArrowRight size={13} />
                    </button>
                  </div>
                </article>}
              </div>
            )}
          </div>

          <div className="mt-10 flex flex-col items-center gap-3 border-t border-slate-200 pt-6 text-center">
            <p className="text-[10px] font-bold text-slate-500" aria-live="polite">
              Showing {renderedProducts.length} of {uniqueProducts.length} products
            </p>
            {hasMoreProducts && (
              <button
                type="button"
                onClick={() =>
                  setPagination({
                    key: paginationKey,
                    count: Math.min(
                      visibleCount + productBatchSize,
                      availableProducts.length,
                    ),
                  })
                }
                className="h-11 rounded-full border border-slate-300 bg-white px-6 text-xs font-extrabold text-slate-700 transition hover:border-[#397a4a] hover:bg-[#eef5ef] hover:text-[#397a4a] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#397a4a]/15"
                aria-label={`Load up to ${Math.min(productBatchSize, availableProducts.length - renderedProducts.length)} more products`}
              >
                Load More
              </button>
            )}
          </div>
        </>
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
              {availableCategories.slice(1).map((filter) => (
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
              <div className="storefront-product-grid mt-6 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 xl:grid-cols-3">
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
        </div>
      </div>
    </section>
  )
}

function CategoryNavigation({
  categoryTree,
  activeCategory,
  activeCategoryId = '',
  activeSubcategory,
  expandedCategories,
  onCategorySelect,
  onSubcategorySelect,
  onToggleCategory,
}) {
  return (
    <nav aria-label="Product categories" className="space-y-1.5">
      {categoryTree.map((category) => {
        const active = activeCategoryId
          ? String(activeCategoryId) === String(category.id)
          : activeCategory === category.name
        const expanded = expandedCategories.has(category.name)
        const hasSubcategories = category.subcategories.length > 0

        return (
          <div key={category.id} className="overflow-hidden rounded-2xl">
            <div
              className={`flex items-center rounded-2xl transition-all duration-200 ${
                active ? 'bg-[#eef5ef] shadow-[inset_3px_0_0_#397a4a]' : 'hover:bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => onCategorySelect(category.category)}
                aria-current={active && activeSubcategory === 'All' ? 'page' : undefined}
                className={`min-w-0 flex-1 px-4 py-3 text-left text-xs font-extrabold transition ${active ? 'text-[#285d37]' : 'text-slate-700 hover:text-[#397a4a]'}`}
              >
                <span className="block truncate">{category.name}</span>
                <span className={`mt-1 block text-[9px] font-semibold ${active ? 'text-[#397a4a]/75' : 'text-slate-400'}`}>
                  {category.subcategories.length}{' '}
                  {category.subcategories.length === 1
                    ? 'subcategory'
                    : 'subcategories'}
                </span>
              </button>
              {hasSubcategories && (
                <button
                  type="button"
                  onClick={() => onToggleCategory(category.name)}
                  aria-expanded={expanded}
                  aria-label={`${expanded ? 'Collapse' : 'Expand'} ${category.name} subcategories`}
                  className={`mr-2 grid size-9 shrink-0 place-items-center rounded-xl transition ${active ? 'text-[#397a4a] hover:bg-white/70' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
                >
                  <ChevronDown size={15} className={`transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            <div className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${expanded && hasSubcategories ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden">
                <div className="ml-5 border-l border-[#cddcca] py-1 pl-3">
                  {category.subcategories.map((item) => {
                    const subcategoryActive = active && activeSubcategory === item.name
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => onSubcategorySelect(category.category, item)}
                        aria-current={subcategoryActive ? 'page' : undefined}
                        className={`mt-0.5 block w-full rounded-xl px-3 py-2 text-left text-[10px] font-bold transition-all duration-200 ${subcategoryActive ? 'translate-x-1 bg-[#397a4a] text-white shadow-sm' : 'text-slate-500 hover:translate-x-1 hover:bg-white hover:text-[#397a4a]'}`}
                      >
                        <span className="block truncate">{item.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </nav>
  )
}

function CatalogFilters({
  activeCategory,
  onCategoryChange,
  filters,
  onFilterChange,
  options,
  onClear,
  categories,
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
            aria-modal="true"
            aria-label="Filter products"
            data-storefront-overlay="filters"
            style={position}
            className="fixed z-[100] flex h-[min(600px,calc(100dvh-24px))] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.2)]"
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
                options={categories}
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
