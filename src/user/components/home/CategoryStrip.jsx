import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { productBelongsToCategory } from '../../../utils/catalogTaxonomy'
import CategoryTile from '../categories/CategoryTile'

const HOME_CATEGORY_LIMIT = 10

export default function CategoryStrip({
  categories = [],
  products = [],
  promotions = [],
  onSelect,
  onViewAll,
}) {
  const featuredCategories = useMemo(() => {
    const activeCategories = categories.filter((category) => {
      const promotion = promotions.find(
        (item) => item.name === category.name,
      )
      return category.enabled !== false && promotion?.enabled !== false
    })
    const ranked = activeCategories.map((category, sourceIndex) => ({
      category,
      sourceIndex,
      productCount: products.filter((product) =>
        productBelongsToCategory(product, category),
      ).length,
    }))

    return ranked
      .sort(
        (first, second) =>
          second.productCount - first.productCount ||
          first.sourceIndex - second.sourceIndex,
      )
      .slice(0, HOME_CATEGORY_LIMIT)
  }, [categories, products, promotions])

  if (!featuredCategories.length) return null

  return (
    <section className="mx-auto max-w-[1440px] px-3 py-6 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
      <div className="mb-3 flex items-end justify-between gap-3 sm:mb-5 sm:gap-4">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35] sm:text-xs">
            Browse the store
          </p>
          <h2 className="mt-1 text-[19px] font-extrabold tracking-[-0.04em] text-slate-950 sm:mt-1.5 sm:text-2xl">
            Shop by category
          </h2>
        </div>
        <a
          href="/categories"
          onClick={(event) => {
            if (!onViewAll) return
            event.preventDefault()
            onViewAll()
          }}
          className="group inline-flex shrink-0 items-center gap-1.5 text-[10px] font-extrabold text-[#397a4a] transition hover:text-[#ff5c35] sm:text-xs"
        >
          View All Categories
          <ArrowRight size={14} className="transition group-hover:translate-x-0.5" />
        </a>
      </div>

      <div className="-mx-3 flex snap-x gap-2.5 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:gap-3 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0 lg:pb-0">
        {featuredCategories.map(({ category, productCount }) => (
          <CategoryTile
            key={category.id}
            category={category}
            productCount={productCount}
            compact
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  )
}
