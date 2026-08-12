import { SlidersHorizontal } from 'lucide-react'
import ProductCard from './ProductCard'

const filters = ['All', 'Audio', 'Wearables', 'Peripherals', 'Components & DIY', 'Smart Power']

export default function ProductCatalog({ products, activeCategory, onCategoryChange, sortBy, onSortChange, likedIds, onLike, onAdd, onView }) {
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
          {products.map((product) => <ProductCard key={product.id} product={product} liked={likedIds.includes(product.id)} onLike={onLike} onAdd={onAdd} onView={onView} />)}
        </div>
      ) : (
        <div className="my-16 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"><p className="text-lg font-extrabold text-slate-800">No products found</p><p className="mt-2 text-sm text-slate-500">Try another search or category.</p></div>
      )}
    </section>
  )
}
