import { Check, Heart, ShieldCheck, ShoppingBag, Star, Truck, X } from 'lucide-react'
import { formatCurrency, parsePrice } from '../../utils/currency'

export default function ProductModal({ product, liked, onClose, onLike, onAdd }) {
  if (!product) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-slate-950/55 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-t-[30px] bg-[#f7f8f5] shadow-2xl sm:rounded-[30px]">
        <div className="sticky top-0 z-10 flex justify-end bg-gradient-to-b from-[#f7f8f5] to-transparent p-4 pb-0"><button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white shadow"><X size={18}/></button></div>
        <div className="grid gap-8 px-5 pb-8 pt-1 sm:px-8 md:grid-cols-2 md:pb-10">
          <div className="overflow-hidden rounded-3xl bg-white"><img src={product.image} alt={product.name} className="aspect-square size-full object-cover" /></div>
          <div className="flex flex-col justify-center">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">{product.category}</p>
            <h2 className="mt-3 text-3xl font-extrabold leading-tight tracking-[-0.04em] text-slate-950">{product.name}</h2>
            <p className="mt-3 flex items-center gap-1.5 text-xs font-bold text-slate-500"><Star size={14} className="fill-[#ffb000] text-[#ffb000]"/> {product.rating} · {product.reviewsCount} verified reviews</p>
            <p className="mt-5 text-sm leading-7 text-slate-600">{product.description}</p>
            <ul className="mt-5 grid gap-2">{product.specs?.slice(0, 4).map((spec) => <li key={spec} className="flex gap-2 text-xs font-semibold text-slate-600"><Check size={15} className="shrink-0 text-[#4f8a5d]"/>{spec}</li>)}</ul>
            <div className="mt-7 flex items-baseline gap-3"><strong className="text-2xl font-extrabold">{formatCurrency(parsePrice(product.price))}</strong><span className="text-sm text-slate-400 line-through">{formatCurrency(parsePrice(product.originalPrice))}</span><span className="rounded-full bg-[#e4f1e7] px-2 py-1 text-[10px] font-extrabold text-[#366643]">{product.discount}</span></div>
            <div className="mt-6 flex gap-2"><button type="button" onClick={() => onLike(product.id)} className={`grid size-12 place-items-center rounded-full border ${liked ? 'border-[#ff5c35] bg-[#ff5c35] text-white' : 'border-slate-200 bg-white'}`}><Heart size={18} fill={liked ? 'currentColor' : 'none'}/></button><button type="button" onClick={() => { onAdd(product); onClose() }} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 text-sm font-extrabold text-white transition hover:bg-[#ff5c35]"><ShoppingBag size={17}/> Add to cart</button></div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-200 pt-5 text-[10px] font-bold text-slate-500"><span className="flex items-center gap-2"><Truck size={15}/> Ships in 24 hours</span><span className="flex items-center gap-2"><ShieldCheck size={15}/> 2-year warranty</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
