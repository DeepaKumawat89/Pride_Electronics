import { ArrowLeft, Search, Tags, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { productBelongsToCategory } from '../../../utils/catalogTaxonomy'
import CategoryTile from './CategoryTile'

export default function AllCategoriesPage({
  categories = [],
  products = [],
  onBack,
  onSelect,
}) {
  const [query, setQuery] = useState('')
  const activeCategories = useMemo(
    () => categories.filter((category) => category.enabled !== false),
    [categories],
  )
  const categoryCounts = useMemo(
    () =>
      new Map(
        activeCategories.map((category) => [
          String(category.id),
          products.filter((product) =>
            productBelongsToCategory(product, category),
          ).length,
        ]),
      ),
    [activeCategories, products],
  )
  const visibleCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return activeCategories
    return activeCategories.filter((category) =>
      `${category.name} ${category.description || ''}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [activeCategories, query])

  return (
    <div className="min-h-[70vh] bg-[#f7f8f5]">
      <section className="mx-auto max-w-[1440px] px-4 py-7 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-[10px] font-extrabold text-slate-700 transition hover:border-[#397a4a] hover:text-[#397a4a]"
        >
          <ArrowLeft size={14} /> Back to home
        </button>

        <div className="mt-7 grid gap-6 rounded-[28px] bg-[#e4f1e7] p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,440px)] lg:items-end lg:p-9">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/75 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#397a4a]">
              <Tags size={13} /> Complete catalog
            </span>
            <h1 className="mt-4 text-3xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-4xl">
              Browse all categories
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Explore every active Pride Circuit category, then continue into the existing product filters and catalog tools.
            </p>
          </div>

          <label className="relative block">
            <span className="sr-only">Search categories</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search all categories"
              className="h-12 w-full rounded-2xl border border-white bg-white pl-11 pr-11 text-xs font-semibold text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#397a4a] focus:ring-4 focus:ring-[#397a4a]/10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Clear category search"
              >
                <X size={14} />
              </button>
            )}
          </label>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ff5c35]">
              Store directory
            </p>
            <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
              {query ? 'Matching categories' : 'Every active category'}
            </h2>
          </div>
          <span className="shrink-0 rounded-full bg-white px-3 py-2 text-[9px] font-extrabold text-slate-500 shadow-sm">
            {visibleCategories.length} of {activeCategories.length}
          </span>
        </div>

        {visibleCategories.length ? (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
            {visibleCategories.map((category) => (
              <CategoryTile
                key={category.id}
                category={category}
                productCount={categoryCounts.get(String(category.id)) || 0}
                onSelect={onSelect}
              />
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-[24px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <p className="text-base font-extrabold text-slate-800">No categories found</p>
            <p className="mt-2 text-xs font-medium text-slate-500">Try a shorter or different search term.</p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-5 rounded-full bg-[#397a4a] px-5 py-2.5 text-[10px] font-extrabold text-white"
            >
              Show every category
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
