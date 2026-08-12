import { ArrowRight, SlidersHorizontal, Sparkles, Zap } from 'lucide-react'
import ProductCard from './ProductCard'

const filters = ['All', 'Audio', 'Wearables', 'Peripherals', 'Components & DIY', 'Smart Power']

export default function ProductCatalog({ products, activeCategory, onCategoryChange, sortBy, onSortChange, likedIds, onLike, onAdd, onView }) {
  const showFeatureCards = activeCategory === 'All' && products.length > 4
  const lifestyleProduct = products.find((product) => product.category === 'Wearables') || products[0]
  const performanceProduct = products.find((product) => product.category === 'Components & DIY') || products[1] || products[0]

  const getProductOrder = (index) => {
    if (!showFeatureCards) return ''
    if (index < 2) return 'order-1'
    if (index === 2) return 'order-3 md:order-1'
    if (index === 3) return 'order-3 xl:order-1'
    return 'order-3'
  }

  return (
    <section id="catalog" className="mx-auto max-w-[1440px] scroll-mt-32 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">Curated for you</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Trending right now</h2><p className="mt-2 text-sm text-slate-500">Our most-loved tech, chosen by customers.</p></div>
        <label className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600"><SlidersHorizontal size={14} /><span className="sr-only">Sort products</span><select value={sortBy} onChange={(event) => onSortChange(event.target.value)} className="bg-transparent pr-1 outline-none"><option value="popular">Most popular</option><option value="rating">Top rated</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => <button key={filter} type="button" onClick={() => onCategoryChange(filter)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${activeCategory === filter ? 'bg-slate-950 text-white' : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-400'}`}>{filter}</button>)}
      </div>

      {products.length ? (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => (
            <div key={product.id} className={`min-w-0 ${getProductOrder(index)}`}>
              <ProductCard product={product} liked={likedIds.includes(product.id)} onLike={onLike} onAdd={onAdd} onView={onView} />
            </div>
          ))}

          {showFeatureCards && (
            <div className="order-2 col-span-full grid gap-4 md:grid-cols-2 sm:gap-5">
              <article className="group relative min-h-64 overflow-hidden rounded-[28px] bg-[#dcebdd] shadow-sm sm:min-h-72">
                <img src={lifestyleProduct.image} alt="" className="absolute inset-y-0 right-0 h-full w-[58%] object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#dcebdd] via-[#dcebdd]/95 to-[#dcebdd]/10" />
                <div className="absolute -left-12 -top-16 size-48 rounded-full bg-white/45 blur-3xl" />
                <div className="relative z-10 flex min-h-64 max-w-[72%] flex-col items-start justify-center p-5 sm:min-h-72 sm:max-w-[64%] sm:p-7">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/75 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#397a4a] backdrop-blur"><Sparkles size={12} /> Everyday intelligence</span>
                  <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.04em] text-slate-950 sm:text-3xl">Smarter tech for every move.</h3>
                  <p className="mt-3 text-xs font-medium leading-5 text-slate-600">Stay connected, active, and effortlessly in control throughout your day.</p>
                  <button type="button" onClick={() => onView(lifestyleProduct)} className="mt-5 flex h-10 items-center gap-2 rounded-full bg-slate-950 px-4 text-[10px] font-extrabold text-white transition hover:bg-[#ff5c35]">Explore the edit <ArrowRight size={13} /></button>
                </div>
              </article>

              <article className="group relative min-h-64 overflow-hidden rounded-[28px] bg-slate-950 shadow-sm sm:min-h-72">
                <img src={performanceProduct.image} alt="" className="absolute inset-y-0 right-0 h-full w-[62%] object-cover opacity-80 transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/95 to-slate-950/15" />
                <div className="absolute -bottom-20 left-10 size-52 rounded-full bg-[#9bcaa6]/20 blur-3xl" />
                <div className="relative z-10 flex min-h-64 max-w-[72%] flex-col items-start justify-center p-5 text-white sm:min-h-72 sm:max-w-[64%] sm:p-7">
                  <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-[#b6dfbf] backdrop-blur"><Zap size={12} fill="currentColor" /> Performance lab</span>
                  <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-[-0.04em] sm:text-3xl">Build without limits.</h3>
                  <p className="mt-3 text-xs font-medium leading-5 text-white/65">High-performance components selected for ambitious setups and bold ideas.</p>
                  <button type="button" onClick={() => onView(performanceProduct)} className="mt-5 flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[10px] font-extrabold text-slate-950 transition hover:bg-[#9bcaa6]">Discover performance <ArrowRight size={13} /></button>
                </div>
              </article>
            </div>
          )}
        </div>
      ) : (
        <div className="my-16 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><p className="text-lg font-extrabold text-slate-800">No products found</p><p className="mt-2 text-sm text-slate-500">Try another search or category.</p></div>
      )}
    </section>
  )
}
