import { CheckCircle2, CreditCard, LockKeyhole, MapPin, X } from 'lucide-react'
import { formatCurrency } from '../../utils/currency'

export default function CheckoutModal({ open, subtotal, onClose, onPlaceOrder }) {
  if (!open) return null
  const shipping = subtotal >= 999 ? 0 : 99

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="my-6 w-full max-w-3xl overflow-hidden rounded-[30px] bg-[#f7f8f5] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 sm:px-8"><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-[#ff5c35]">Secure checkout</p><h2 className="mt-1 text-xl font-extrabold">Complete your order</h2></div><button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white"><X size={18}/></button></div>
        <form onSubmit={(event) => { event.preventDefault(); onPlaceOrder() }} className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            <section><h3 className="flex items-center gap-2 text-sm font-extrabold"><MapPin size={17} className="text-[#ff5c35]"/> Delivery details</h3><div className="mt-3 grid grid-cols-2 gap-3"><input required placeholder="First name" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="Last name" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="Phone number" className="col-span-2 h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="Street address" className="col-span-2 h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="City" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="PIN code" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/></div></section>
            <section><h3 className="flex items-center gap-2 text-sm font-extrabold"><CreditCard size={17} className="text-[#ff5c35]"/> Payment</h3><div className="mt-3 rounded-2xl border-2 border-slate-900 bg-white p-4"><div className="flex items-center justify-between"><span className="text-xs font-extrabold">Card / UPI / Netbanking</span><CheckCircle2 size={17} className="text-[#4f8a5d]"/></div><p className="mt-1 text-[10px] text-slate-400">Choose your preferred method on the secure payment screen.</p></div></section>
          </div>
          <aside className="h-fit rounded-2xl bg-white p-5"><h3 className="text-sm font-extrabold">Order summary</h3><div className="mt-5 space-y-3 text-xs text-slate-500"><div className="flex justify-between"><span>Items</span><strong className="text-slate-800">{formatCurrency(subtotal)}</strong></div><div className="flex justify-between"><span>Shipping</span><strong className="text-[#4f8a5d]">{shipping ? formatCurrency(shipping) : 'Free'}</strong></div><div className="flex justify-between"><span>GST</span><strong className="text-slate-800">Included</strong></div></div><div className="mt-5 flex justify-between border-t border-slate-100 pt-4"><span className="text-sm font-bold">Total</span><strong className="text-lg font-extrabold">{formatCurrency(subtotal + shipping)}</strong></div><button className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff5c35] text-xs font-extrabold text-white transition hover:bg-slate-950"><LockKeyhole size={15}/> Place order</button><p className="mt-3 text-center text-[9px] leading-4 text-slate-400">By placing your order, you agree to our terms and privacy policy.</p></aside>
        </form>
      </div>
    </div>
  )
}
