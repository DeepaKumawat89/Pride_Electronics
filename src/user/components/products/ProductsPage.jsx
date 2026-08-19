import {
  ArrowLeft,
  Cable,
  Grid2X2,
  Headphones,
  Monitor,
  Watch,
  Zap,
} from 'lucide-react'
import ProductSearch from '../layout/ProductSearch'
import ProductCatalog from './ProductCatalog'

const categoryPresentation = {
  Audio: {
    icon: Headphones,
    color: 'bg-[#f3e4dd]',
    label: 'Audio & sound',
  },
  Wearables: {
    icon: Watch,
    color: 'bg-[#e2ebf4]',
    label: 'Smart wearables',
  },
  Peripherals: {
    icon: Monitor,
    color: 'bg-[#efe9d7]',
    label: 'Workspace gear',
  },
  'Components & DIY': {
    icon: Cable,
    color: 'bg-[#e5e1ef]',
    label: 'Components & DIY',
  },
  'Smart Power': {
    icon: Zap,
    color: 'bg-[#dfeee4]',
    label: 'Power & charging',
  },
}

const fallbackPresentation = {
  icon: Grid2X2,
  color: 'bg-[#e5e1ef]',
}

export default function ProductsPage({
  products,
  filteredProducts,
  suggestedProducts,
  categories,
  query,
  activeCategory,
  sortBy,
  likedIds,
  onBack,
  onQueryChange,
  onSearchSubmit,
  onCategoryChange,
  onSortChange,
  onProductSelect,
  onLike,
  onAdd,
  onBuyNow,
}) {
  const availableCategories = categories.filter(
    (category) => category.enabled !== false,
  )
  const categoryNames = availableCategories.map((category) => category.name)
  const resultTitle =
    activeCategory !== 'All'
      ? activeCategory
      : query.trim()
        ? 'Search results'
        : 'All products'
  const resultDescription = `${filteredProducts.length} ${filteredProducts.length === 1 ? 'product' : 'products'}${query.trim() ? ` matching “${query.trim()}”` : ' available to explore'}.`

  return (
    <div className="min-h-[70vh]">
      <section className="mx-auto max-w-[1440px] px-4 pt-5 sm:px-6 sm:pt-7 lg:px-10 lg:pt-9">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:border-[#ff5c35] hover:text-[#ff5c35]"
        >
          <ArrowLeft size={15} />
          Back
        </button>

        <div className="relative mt-4 overflow-visible rounded-[28px] bg-[#dcebdd] px-5 py-7 sm:px-8 sm:py-9 lg:px-12 lg:py-11">
          <div className="pointer-events-none absolute -right-20 -top-28 size-72 rounded-full bg-[#9bcaa6]/35 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#397a4a] sm:text-xs">
              Browse the complete collection
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.05em] text-[#17211d] sm:text-4xl lg:text-5xl">
              Find the right tech for you.
            </h1>
            <p className="mt-3 max-w-2xl text-xs font-medium leading-6 text-[#526559] sm:text-sm">
              Search all products or browse category-wise using the same live
              catalog managed in Firebase.
            </p>
            <div className="mt-6 max-w-2xl">
              <ProductSearch
                products={products}
                value={query}
                onChange={onQueryChange}
                onSubmitQuery={onSearchSubmit}
                onSelect={onProductSelect}
                placeholder="Search products, brands, features..."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pt-9 sm:px-6 sm:pt-11 lg:px-10 lg:pt-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35] sm:text-xs">
              Shop by category
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">
              Explore every category
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onCategoryChange('All')}
            className={`hidden shrink-0 rounded-full px-4 py-2 text-xs font-extrabold transition sm:block ${activeCategory === 'All' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-[#ff5c35] hover:text-[#ff5c35]'}`}
          >
            All products
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {availableCategories.map((category) => {
            const presentation =
              categoryPresentation[category.name] || fallbackPresentation
            const Icon = presentation.icon
            const productCount = products.filter(
              (product) => product.category === category.name,
            ).length
            const active = activeCategory === category.name

            return (
              <button
                key={category.id || category.name}
                type="button"
                aria-pressed={active}
                onClick={() => onCategoryChange(category.name)}
                className={`${presentation.color} group min-h-32 rounded-[24px] border p-4 text-left transition duration-300 sm:min-h-36 sm:p-5 ${active ? 'border-[#397a4a] ring-4 ring-[#397a4a]/10' : 'border-transparent hover:-translate-y-1 hover:shadow-lg'}`}
              >
                <span className="grid size-10 place-items-center rounded-2xl bg-white/80 text-slate-800 sm:size-11">
                  <Icon size={20} />
                </span>
                <strong className="mt-5 block text-xs font-extrabold text-slate-900 sm:text-sm">
                  {presentation.label || category.name}
                </strong>
                <span className="mt-1 block text-[10px] font-semibold text-slate-500">
                  {productCount} {productCount === 1 ? 'product' : 'products'}
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => onCategoryChange('All')}
          className={`mt-3 h-11 w-full rounded-full text-xs font-extrabold transition sm:hidden ${activeCategory === 'All' ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
        >
          View all products
        </button>
      </section>

      <ProductCatalog
        products={filteredProducts}
        suggestedProducts={suggestedProducts}
        onSuggestedCategoryChange={onCategoryChange}
        activeCategory={activeCategory}
        onCategoryChange={onCategoryChange}
        sortBy={sortBy}
        onSortChange={onSortChange}
        likedIds={likedIds}
        onLike={onLike}
        onAdd={onAdd}
        onBuyNow={onBuyNow}
        onView={onProductSelect}
        categoryNames={categoryNames}
        eyebrow="Product collection"
        title={resultTitle}
        description={resultDescription}
        showPromotions={false}
      />
    </div>
  )
}
