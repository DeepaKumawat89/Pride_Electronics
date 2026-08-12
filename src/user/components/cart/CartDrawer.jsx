import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { formatCurrency, parsePrice } from '../../utils/currency'

export default function CartDrawer({ open, items, subtotal, onClose, onChangeQuantity, onRemove, onCheckout }) {
  if (!open) return null
  const shipping = subtotal >= 999 ? 0 : 99

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="ml-auto flex h-full w-full max-w-md flex-col bg-[#f7f8f5] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-7"><div><h2 className="text-lg font-extrabold tracking-tight">Your cart</h2><p className="mt-0.5 text-xs text-slate-400">{items.length} {items.length === 1 ? 'item' : 'items'} selected</p></div><button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white"><X size={18}/></button></div>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {!items.length ? <div className="grid h-full place-items-center text-center"><div><span className="mx-auto grid size-20 place-items-center rounded-full bg-white text-slate-300"><ShoppingBag size={32}/></span><h3 className="mt-5 font-extrabold">Your cart is feeling light</h3><p className="mt-2 text-sm text-slate-400">Add something great and it’ll show up here.</p><button type="button" onClick={onClose} className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-xs font-bold text-white">Continue shopping</button></div></div> : (
            <div className="space-y-4">{items.map(({ product, quantity }) => <div key={product.id} className="flex gap-4 rounded-2xl bg-white p-3"><img src={product.image} alt={product.name} className="size-24 rounded-xl object-cover"/><div className="min-w-0 flex-1 py-1"><p className="line-clamp-2 text-xs font-extrabold leading-5">{product.name}</p><p className="mt-1 text-sm font-extrabold text-[#ff5c35]">{formatCurrency(parsePrice(product.price))}</p><div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-full border border-slate-200"><button type="button" onClick={() => onChangeQuantity(product.id, -1)} className="grid size-7 place-items-center"><Minus size={12}/></button><span className="w-6 text-center text-xs font-bold">{quantity}</span><button type="button" onClick={() => onChangeQuantity(product.id, 1)} className="grid size-7 place-items-center"><Plus size={12}/></button></div><button type="button" onClick={() => onRemove(product.id)} className="text-slate-300 transition hover:text-red-500"><Trash2 size={15}/></button></div></div></div>)}</div>
          )}
        </div>

        {!!items.length && <div className="border-t border-slate-200 bg-white px-5 py-6 sm:px-7"><div className="space-y-2 text-xs text-slate-500"><div className="flex justify-between"><span>Subtotal</span><strong className="text-slate-800">{formatCurrency(subtotal)}</strong></div><div className="flex justify-between"><span>Shipping</span><strong className={shipping ? 'text-slate-800' : 'text-[#4f8a5d]'}>{shipping ? formatCurrency(shipping) : 'Free'}</strong></div></div><div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4"><span className="text-sm font-bold">Total</span><strong className="text-xl font-extrabold">{formatCurrency(subtotal + shipping)}</strong></div><button type="button" onClick={onCheckout} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff5c35] text-sm font-extrabold text-white transition hover:bg-slate-950">Secure checkout <ArrowRight size={17}/></button><p className="mt-3 text-center text-[10px] font-semibold text-slate-400">Taxes calculated at checkout · Secure encrypted payment</p></div>}
      </aside>
    </div>
  )
}
