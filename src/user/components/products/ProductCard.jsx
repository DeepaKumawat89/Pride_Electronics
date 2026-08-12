import { Heart, ShoppingBag, Star } from 'lucide-react'
import { formatCurrency, parsePrice } from '../../utils/currency'

export default function ProductCard({ product, liked, onLike, onAdd, onView }) {
  return (
    <article className="group flex min-w-0 flex-col">
      <div className="relative aspect-[1/0.9] overflow-hidden rounded-[26px] bg-white">
        <img src={product.image} alt={product.name} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-105" />
        <button type="button" onClick={() => onView(product)} className="absolute inset-0 z-10 cursor-pointer" aria-label={`View details for ${product.name}`} />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-950/20 to-transparent opacity-0 transition group-hover:opacity-100" />
        <span className="absolute left-3 top-3 z-20 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-800 backdrop-blur">{product.badge}</span>
        <button type="button" onClick={() => onLike(product.id)} className={`absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full backdrop-blur transition ${liked ? 'bg-[#ff5c35] text-white' : 'bg-white/90 text-slate-600 hover:text-[#ff5c35]'}`} aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}><Heart size={16} fill={liked ? 'currentColor' : 'none'} /></button>
        <div className="absolute inset-x-3 bottom-3 z-20 flex translate-y-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <button type="button" onClick={() => onAdd(product)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 text-xs font-extrabold text-white shadow-lg transition hover:bg-[#ff5c35]"><ShoppingBag size={15} /> Add to cart</button>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-1 pt-4">
        <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><span>{product.category}</span><span className="flex items-center gap-1 text-slate-600"><Star size={11} className="fill-[#ffb000] text-[#ffb000]" /> {product.rating} <span className="font-medium text-slate-400">({product.reviewsCount})</span></span></div>
        <button type="button" onClick={() => onView(product)} className="mt-2 min-h-12 text-left text-sm font-extrabold leading-6 text-slate-900 transition hover:text-[#ff5c35]">{product.name}</button>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div><strong className="text-base font-extrabold text-slate-950">{formatCurrency(parsePrice(product.price))}</strong><span className="ml-2 text-xs font-medium text-slate-400 line-through">{formatCurrency(parsePrice(product.originalPrice))}</span></div>
          <span className="shrink-0 rounded-full bg-[#e4f1e7] px-2 py-1 text-[9px] font-extrabold text-[#366643]">{product.discount}</span>
        </div>
      </div>
    </article>
  )
}
