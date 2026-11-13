// import { useMemo } from 'react'
// import ProductCard from '../products/ProductCard'

// const SECTION_LIMIT = 8
// const DISCOVER_LIMIT = 18
// const TOTAL_LIMIT = 50

// const productKey = (product) => String(product.id || product.slug || product.name)

// const uniqueProducts = (products, usedKeys = new Set()) => {
//   const result = []
//   const seenKeys = new Set(usedKeys)
//   products.forEach((product) => {
//     const key = productKey(product)
//     if (seenKeys.has(key)) return
//     seenKeys.add(key)
//     result.push(product)
//   })
//   return result
// }

// const takeProducts = (products, usedKeys, limit) => {
//   const selected = uniqueProducts(products, usedKeys).slice(0, limit)
//   selected.forEach((product) => usedKeys.add(productKey(product)))
//   return selected
// }

// const newestFirst = (products) =>
//   [...products].sort(
//     (first, second) =>
//       new Date(second.createdAt || 0).getTime() -
//       new Date(first.createdAt || 0).getTime(),
//   )

// const popularFirst = (products) =>
//   [...products].sort(
//     (first, second) =>
//       Number(second.featured) - Number(first.featured) ||
//       (Number(second.rating) || 0) - (Number(first.rating) || 0) ||
//       (Number(second.reviewsCount) || 0) -
//         (Number(first.reviewsCount) || 0),
//   )

// const enabledCategoryNames = (categories, products) => {
//   const configured = categories
//     .filter((category) => category.enabled !== false)
//     .map((category) => category.name)
//     .filter(Boolean)
//   return configured.length
//     ? configured
//     : [...new Set(products.map((product) => product.category).filter(Boolean))]
// }

// const pickAcrossCategories = (products, categoryNames, usedKeys, limit) => {
//   const available = uniqueProducts(products, usedKeys)
//   const selected = []
//   const selectedKeys = new Set()
//   const categoryQueues = categoryNames.map((categoryName) => ({
//     categoryName,
//     products: popularFirst(
//       available.filter((product) => product.category === categoryName),
//     ),
//   }))

//   categoryQueues.forEach((queue) => {
//     const product = queue.products[0]
//     if (!product || selected.length >= limit) return
//     selected.push(product)
//     selectedKeys.add(productKey(product))
//   })

//   let queueIndex = 0
//   while (selected.length < limit && queueIndex < available.length * 2) {
//     const queue = categoryQueues[queueIndex % Math.max(categoryQueues.length, 1)]
//     const product = queue?.products.find(
//       (item) => !selectedKeys.has(productKey(item)),
//     )
//     if (product) {
//       selected.push(product)
//       selectedKeys.add(productKey(product))
//     } else if (!categoryQueues.length) {
//       const fallback = available.find(
//         (item) => !selectedKeys.has(productKey(item)),
//       )
//       if (fallback) {
//         selected.push(fallback)
//         selectedKeys.add(productKey(fallback))
//       }
//     }
//     queueIndex += 1
//   }

//   selected.forEach((product) => usedKeys.add(productKey(product)))
//   return selected
// }

// const pickDiverseProducts = (products, usedKeys, limit) => {
//   const available = uniqueProducts(products, usedKeys)
//   const categoryQueues = [
//     ...new Set(available.map((product) => product.category).filter(Boolean)),
//   ].map((category) =>
//     available.filter((product) => product.category === category),
//   )
//   const selected = []
//   let queueIndex = 0

//   while (selected.length < limit && selected.length < available.length) {
//     const queue = categoryQueues[queueIndex % Math.max(categoryQueues.length, 1)]
//     const product = queue?.shift() || available.find(
//       (item) => !selected.some((selectedProduct) => productKey(selectedProduct) === productKey(item)),
//     )
//     if (product) selected.push(product)
//     queueIndex += 1
//   }

//   selected.forEach((product) => usedKeys.add(productKey(product)))
//   return selected
// }

// const sectionDefinitions = [
//   {
//     key: 'featured',
//     eyebrow: 'Handpicked for you',
//     title: 'Featured Products',
//     description: 'The products our team is putting in the spotlight.',
//   },
//   {
//     key: 'newArrivals',
//     eyebrow: 'Just landed',
//     title: 'New Arrivals',
//     description: 'Fresh additions to the Pride Circuit collection.',
//   },
//   {
//     key: 'popular',
//     eyebrow: 'Customer favourites',
//     title: 'Popular Picks',
//     description: 'Well-loved essentials from across the store.',
//   },
//   {
//     key: 'spotlight',
//     eyebrow: 'Explore the edit',
//     title: 'Category Spotlight',
//     description: 'A balanced mix from the categories you shop most.',
//   },
//   {
//     key: 'discover',
//     eyebrow: 'Keep browsing',
//     title: 'Discover More',
//     description: 'More ways to find your next favourite piece of tech.',
//   },
// ]

// export default function HomepageProductSections({
//   products = [],
//   categories = [],
//   featuredProductIds = [],
//   likedIds = [],
//   onLike,
//   onAdd,
//   onBuyNow,
//   onView,
// }) {
//   const sections = useMemo(() => {
//     const usedKeys = new Set()
//     const categoryNames = enabledCategoryNames(categories, products)
//     const configuredFeatured = featuredProductIds.length
//       ? featuredProductIds
//           .map((id) => products.find((product) => String(product.id) === String(id)))
//           .filter(Boolean)
//       : products.filter((product) => product.featured)
//     const featured = takeProducts(configuredFeatured, usedKeys, SECTION_LIMIT)
//     const newArrivals = takeProducts(
//       newestFirst(products),
//       usedKeys,
//       SECTION_LIMIT,
//     )
//     const popular = pickAcrossCategories(
//       popularFirst(products),
//       categoryNames,
//       usedKeys,
//       SECTION_LIMIT,
//     )
//     const spotlight = pickAcrossCategories(
//       newestFirst(products),
//       categoryNames,
//       usedKeys,
//       SECTION_LIMIT,
//     )
//     const discover = pickDiverseProducts(
//       products,
//       usedKeys,
//       Math.min(DISCOVER_LIMIT, TOTAL_LIMIT - usedKeys.size),
//     )

//     return {
//       featured,
//       newArrivals,
//       popular,
//       spotlight,
//       discover,
//     }
//   }, [categories, featuredProductIds, products])

//   const hasProducts = Object.values(sections).some((section) => section.length)
//   if (!hasProducts) return null

//   return (
//     <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
//       {sectionDefinitions.map((section) => {
//         const sectionProducts = sections[section.key]
//         if (!sectionProducts.length) return null

//         return (
//           <section
//             key={section.key}
//             className="py-8 sm:py-10 lg:py-12"
//             aria-labelledby={`homepage-${section.key}-title`}
//           >
//             <div className="mb-5">
//               <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35] sm:text-xs">
//                 {section.eyebrow}
//               </p>
//               <h2
//                 id={`homepage-${section.key}-title`}
//                 className="mt-1.5 text-2xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-3xl"
//               >
//                 {section.title}
//               </h2>
//               <p className="mt-1.5 text-sm text-slate-500">
//                 {section.description}
//               </p>
//             </div>
//             <div className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
//               {sectionProducts.map((product) => (
//                 <ProductCard
//                   key={productKey(product)}
//                   product={product}
//                   liked={likedIds.includes(product.id)}
//                   onLike={onLike}
//                   onAdd={onAdd}
//                   onBuyNow={onBuyNow}
//                   onView={onView}
//                 />
//               ))}
//             </div>
//           </section>
//         )
//       })}
//     </div>
//   )
// }


import { useMemo, useRef, useState } from 'react'
import ProductCard from '../products/ProductCard'

const SECTION_LIMIT = 8
const DISCOVER_LIMIT = 18
const TOTAL_LIMIT = 50
const DISCOVER_INITIAL = 8

const productKey = (product) => String(product.id || product.slug || product.name)

const uniqueProducts = (products, usedKeys = new Set()) => {
  const result = []
  const seenKeys = new Set(usedKeys)
  products.forEach((product) => {
    const key = productKey(product)
    if (seenKeys.has(key)) return
    seenKeys.add(key)
    result.push(product)
  })
  return result
}

const takeProducts = (products, usedKeys, limit) => {
  const selected = uniqueProducts(products, usedKeys).slice(0, limit)
  selected.forEach((product) => usedKeys.add(productKey(product)))
  return selected
}

const newestFirst = (products) =>
  [...products].sort(
    (first, second) =>
      new Date(second.createdAt || 0).getTime() -
      new Date(first.createdAt || 0).getTime(),
  )

const popularFirst = (products) =>
  [...products].sort(
    (first, second) =>
      Number(second.featured) - Number(first.featured) ||
      (Number(second.rating) || 0) - (Number(first.rating) || 0) ||
      (Number(second.reviewsCount) || 0) -
        (Number(first.reviewsCount) || 0),
  )

const enabledCategoryNames = (categories, products) => {
  const configured = categories
    .filter((category) => category.enabled !== false)
    .map((category) => category.name)
    .filter(Boolean)
  return configured.length
    ? configured
    : [...new Set(products.map((product) => product.category).filter(Boolean))]
}

const pickAcrossCategories = (products, categoryNames, usedKeys, limit) => {
  const available = uniqueProducts(products, usedKeys)
  const selected = []
  const selectedKeys = new Set()
  const categoryQueues = categoryNames.map((categoryName) => ({
    categoryName,
    products: popularFirst(
      available.filter((product) => product.category === categoryName),
    ),
  }))

  categoryQueues.forEach((queue) => {
    const product = queue.products[0]
    if (!product || selected.length >= limit) return
    selected.push(product)
    selectedKeys.add(productKey(product))
  })

  let queueIndex = 0
  while (selected.length < limit && queueIndex < available.length * 2) {
    const queue = categoryQueues[queueIndex % Math.max(categoryQueues.length, 1)]
    const product = queue?.products.find(
      (item) => !selectedKeys.has(productKey(item)),
    )
    if (product) {
      selected.push(product)
      selectedKeys.add(productKey(product))
    } else if (!categoryQueues.length) {
      const fallback = available.find(
        (item) => !selectedKeys.has(productKey(item)),
      )
      if (fallback) {
        selected.push(fallback)
        selectedKeys.add(productKey(fallback))
      }
    }
    queueIndex += 1
  }

  selected.forEach((product) => usedKeys.add(productKey(product)))
  return selected
}

const pickDiverseProducts = (products, usedKeys, limit) => {
  const available = uniqueProducts(products, usedKeys)
  const categoryQueues = [
    ...new Set(available.map((product) => product.category).filter(Boolean)),
  ].map((category) =>
    available.filter((product) => product.category === category),
  )
  const selected = []
  let queueIndex = 0

  while (selected.length < limit && selected.length < available.length) {
    const queue = categoryQueues[queueIndex % Math.max(categoryQueues.length, 1)]
    const product =
      queue?.shift() ||
      available.find(
        (item) =>
          !selected.some(
            (selectedProduct) => productKey(selectedProduct) === productKey(item),
          ),
      )
    if (product) selected.push(product)
    queueIndex += 1
  }

  selected.forEach((product) => usedKeys.add(productKey(product)))
  return selected
}

/* ---------- Config ---------- */

const sectionDefinitions = [
  {
    key: 'featured',
    eyebrow: 'Handpicked for you',
    title: 'Featured Products',
    description: 'The products our team is putting in the spotlight.',
    layout: 'panel',
    dot: 'bg-amber-300',
  },
  {
    key: 'newArrivals',
    eyebrow: 'Just landed',
    title: 'New Arrivals',
    description: 'Fresh additions to the Pride Circuit collection.',
    layout: 'carousel',
    dot: 'bg-emerald-300',
  },
  {
    key: 'popular',
    eyebrow: 'Customer favourites',
    title: 'Popular Picks',
    description: 'Well-loved essentials from across the store.',
    layout: 'grid',
    dot: 'bg-rose-300',
  },
  {
    key: 'spotlight',
    eyebrow: 'Explore the edit',
    title: 'Category Spotlight',
    description: 'A balanced mix from the categories you shop most.',
    layout: 'spotlight',
    dot: 'bg-sky-300',
  },
  {
    key: 'discover',
    eyebrow: 'Keep browsing',
    title: 'Discover More',
    description: 'More ways to find your next favourite piece of tech.',
    layout: 'discover',
    dot: 'bg-violet-300',
  },
]

const gridClass =
  'grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4'

/* ---------- Pieces ---------- */

const arrowProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

function Eyebrow({ section, number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[11px] font-medium tabular-nums tracking-wider text-stone-400">
        {String(number).padStart(2, '0')}
      </span>
      <span className="h-px w-6 bg-stone-300" />
      <span className={`h-1.5 w-1.5 rounded-full ${section.dot}`} />
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
        {section.eyebrow}
      </span>
    </div>
  )
}

function SectionHeader({ section, number, count, children }) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-stone-200/80 pb-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-5 sm:pb-6">
      <div>
        <Eyebrow section={section} number={number} />
        <h2
          id={`homepage-${section.key}-title`}
          className="mt-2.5 text-[23px] font-semibold leading-tight tracking-[-0.03em] text-stone-900 sm:mt-3 sm:text-[34px]"
        >
          {section.title}
        </h2>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-stone-500 sm:mt-2 sm:text-[15px]">
          {section.description}
        </p>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="text-[11px] font-medium text-stone-400 sm:text-xs">
          {count} {count === 1 ? 'product' : 'products'}
        </span>
        {children}
      </div>
    </div>
  )
}

function ProductGrid({ products, cardProps, className = gridClass }) {
  return (
    <div className={className}>
      {products.map((product) => (
        <ProductCard
          key={productKey(product)}
          product={product}
          homepage
          {...cardProps(product)}
        />
      ))}
    </div>
  )
}

function ArrowButton({ direction, onClick }) {
  return (
    <button
      type="button"
      aria-label={direction < 0 ? 'Scroll left' : 'Scroll right'}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 active:scale-95"
    >
      <svg {...arrowProps}>
        <path d={direction < 0 ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
      </svg>
    </button>
  )
}

function CarouselSection({ section, number, products, cardProps }) {
  const trackRef = useRef(null)
  const scrollBy = (direction) => {
    const track = trackRef.current
    if (!track) return
    track.scrollBy({
      left: direction * track.clientWidth * 0.85,
      behavior: 'smooth',
    })
  }

  return (
    <>
      <SectionHeader section={section} number={number} count={products.length}>
        <div className="hidden items-center gap-2 sm:flex">
          <ArrowButton direction={-1} onClick={() => scrollBy(-1)} />
          <ArrowButton direction={1} onClick={() => scrollBy(1)} />
        </div>
      </SectionHeader>
      <div
        ref={trackRef}
        className="-mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth px-3 pb-3 [scrollbar-width:none] sm:-mx-6 sm:gap-5 sm:px-6 sm:pb-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={productKey(product)}
            className="w-[calc(50%-6px)] shrink-0 snap-start sm:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)]"
          >
            <ProductCard product={product} homepage {...cardProps(product)} />
          </div>
        ))}
      </div>
    </>
  )
}

function DiscoverSection({ section, number, products, cardProps }) {
  const [visible, setVisible] = useState(DISCOVER_INITIAL)
  const shown = products.slice(0, visible)
  const remaining = products.length - shown.length

  return (
    <>
      <SectionHeader section={section} number={number} count={products.length} />
      <ProductGrid products={shown} cardProps={cardProps} />
      {remaining > 0 && (
        <div className="mt-12 flex flex-col items-center gap-3">
          <div className="h-px w-24 bg-stone-200" />
          <button
            type="button"
            onClick={() => setVisible((current) => current + DISCOVER_INITIAL)}
            className="inline-flex items-center gap-2.5 rounded-full border border-stone-200 bg-white px-7 py-3 text-sm font-semibold text-stone-800 shadow-[0_1px_2px_rgba(28,25,23,0.05)] transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50 hover:shadow-[0_8px_24px_-12px_rgba(28,25,23,0.18)]"
          >
            Show more products
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
              {remaining} left
            </span>
          </button>
        </div>
      )}
    </>
  )
}

/* ---------- Main ---------- */

export default function HomepageProductSections({
  products = [],
  categories = [],
  featuredProductIds = [],
  likedIds = [],
  onLike,
  onAdd,
  onBuyNow,
  onView,
}) {
  const sections = useMemo(() => {
    const usedKeys = new Set()
    const categoryNames = enabledCategoryNames(categories, products)
    const configuredFeatured = featuredProductIds.length
      ? featuredProductIds
          .map((id) => products.find((product) => String(product.id) === String(id)))
          .filter(Boolean)
      : products.filter((product) => product.featured)
    const featured = takeProducts(configuredFeatured, usedKeys, SECTION_LIMIT)
    const newArrivals = takeProducts(
      newestFirst(products),
      usedKeys,
      SECTION_LIMIT,
    )
    const popular = pickAcrossCategories(
      popularFirst(products),
      categoryNames,
      usedKeys,
      SECTION_LIMIT,
    )
    const spotlight = pickAcrossCategories(
      newestFirst(products),
      categoryNames,
      usedKeys,
      SECTION_LIMIT,
    )
    const discover = pickDiverseProducts(
      products,
      usedKeys,
      Math.min(DISCOVER_LIMIT, TOTAL_LIMIT - usedKeys.size),
    )

    return {
      featured,
      newArrivals,
      popular,
      spotlight,
      discover,
    }
  }, [categories, featuredProductIds, products])

  const hasProducts = Object.values(sections).some((section) => section.length)
  if (!hasProducts) return null

  const cardProps = (product) => ({
    liked: likedIds.includes(product.id),
    onLike,
    onAdd,
    onBuyNow,
    onView,
  })

  const renderBody = (section, number, sectionProducts) => {
    switch (section.layout) {
      case 'panel':
        return (
          <div className="relative overflow-hidden rounded-[24px] border border-stone-200/80 bg-gradient-to-b from-[#fbfaf8] via-white to-[#fdfcfa] p-4 shadow-[0_1px_2px_rgba(28,25,23,0.03),0_24px_48px_-32px_rgba(28,25,23,0.16)] sm:rounded-[32px] sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-amber-100/60 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-orange-50 blur-3xl" />
            <div className="relative">
              <SectionHeader
                section={section}
                number={number}
                count={sectionProducts.length}
              />
              <ProductGrid products={sectionProducts} cardProps={cardProps} />
            </div>
          </div>
        )

      case 'carousel':
        return (
          <CarouselSection
            section={section}
            number={number}
            products={sectionProducts}
            cardProps={cardProps}
          />
        )

      case 'grid':
        return (
          <>
            <SectionHeader
              section={section}
              number={number}
              count={sectionProducts.length}
            />
            <ProductGrid products={sectionProducts} cardProps={cardProps} />
          </>
        )

      case 'spotlight': {
        const chips = [
          ...new Set(
            sectionProducts.map((product) => product.category).filter(Boolean),
          ),
        ]
        return (
          <div className="rounded-[24px] border border-sky-100/80 bg-gradient-to-br from-[#f6faff] via-white to-[#f9fbfd] p-4 sm:rounded-[32px] sm:p-10">
            <div className="grid gap-6 sm:gap-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <Eyebrow section={section} number={number} />
                <h2
                  id={`homepage-${section.key}-title`}
                  className="mt-2.5 text-[23px] font-semibold leading-tight tracking-[-0.03em] text-stone-900 sm:mt-3 sm:text-[34px]"
                >
                  {section.title}
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-stone-500 sm:mt-3 sm:text-[15px]">
                  {section.description}
                </p>
                {chips.length > 0 && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    {chips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 shadow-[0_1px_2px_rgba(28,25,23,0.04)]"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-6 text-xs font-medium text-stone-400">
                  {sectionProducts.length} products
                </p>
              </div>
              <ProductGrid
                products={sectionProducts}
                cardProps={cardProps}
                className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 xl:grid-cols-3"
              />
            </div>
          </div>
        )
      }

      case 'discover':
        return (
          <DiscoverSection
            section={section}
            number={number}
            products={sectionProducts}
            cardProps={cardProps}
          />
        )

      default:
        return null
    }
  }

  const visibleSections = sectionDefinitions.filter(
    (section) => sections[section.key]?.length,
  )

  return (
    <div className="mx-auto max-w-[1440px] bg-white px-3 sm:px-6 lg:px-10">
      {visibleSections.map((section, index) => (
        <section
          key={section.key}
          className="py-7 sm:py-12 lg:py-16"
          aria-labelledby={`homepage-${section.key}-title`}
        >
          {renderBody(section, index + 1, sections[section.key])}
        </section>
      ))}
    </div>
  )
}
