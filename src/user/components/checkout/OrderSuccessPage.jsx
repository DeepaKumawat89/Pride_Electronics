import { ArrowRight, Check, CheckCircle2, CreditCard, MapPin, PackageCheck, ReceiptText, ShoppingBag } from 'lucide-react'
import { formatCurrency, parsePrice } from '../../utils/currency'

export default function OrderSuccessPage({ order, onContinueShopping, onViewOrders }) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1120px] px-4 py-7 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
        <section className="relative isolate overflow-hidden rounded-[32px] bg-[#dcebdd] px-5 py-8 text-center shadow-sm sm:px-8 sm:py-11">
          <div className="absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-[#9bcaa6]/45 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-[#aacfb3]/45 to-transparent" />
          <span className="mx-auto grid size-18 place-items-center rounded-full bg-[#397a4a] text-white shadow-xl shadow-[#397a4a]/25"><Check size={31} strokeWidth={3} /></span>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#397a4a]">Razorpay Test Payment Successful</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-5xl">Your order is confirmed!</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Thanks for shopping with Pride Electronics. No real money was deducted because this payment used Razorpay Test Mode.</p>
          <div className="mx-auto mt-6 flex w-fit flex-wrap items-center justify-center gap-2 rounded-full bg-white/75 px-4 py-2.5 text-[10px] font-bold text-slate-600 backdrop-blur"><CheckCircle2 size={14} className="text-[#397a4a]" /> Order {order.id}<span className="size-1 rounded-full bg-slate-300" />Payment verified</div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
          <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#ff5c35]">Order details</p><h2 className="mt-1 text-xl font-extrabold text-slate-950">Items in your order</h2></div><span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><ShoppingBag size={18} /></span></div>
            <div className="mt-5 space-y-3">
              {order.items.map((item, index) => (
                <article key={`${item.productName}-${index}`} className="flex items-center gap-3 rounded-[20px] bg-[#f7f8f5] p-3 sm:gap-4"><img src={item.image} alt={item.productName} className="size-16 shrink-0 rounded-2xl object-cover sm:size-18" /><div className="min-w-0 flex-1"><h3 className="line-clamp-2 text-xs font-extrabold leading-5 text-slate-900">{item.productName}</h3><p className="mt-1 text-[9px] font-semibold text-slate-400">Quantity: {item.qty}</p></div><strong className="shrink-0 text-xs text-slate-900">{formatCurrency(parsePrice(item.price) * item.qty)}</strong></article>
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[26px] bg-[#183020] p-5 text-white shadow-sm">
              <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-white/10 text-[#9bcaa6]"><ReceiptText size={18} /></span><div><p className="text-[9px] font-bold uppercase tracking-wider text-white/45">Amount paid</p><strong className="text-xl">{order.total}</strong></div></div>
              <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-[10px]"><DetailRow label="Order ID" value={order.id} /><DetailRow label="Payment ID" value={order.razorpayPaymentId || 'Test payment'} /><DetailRow label="Status" value="Paid" accent /></div>
            </div>
            <div className="rounded-[26px] bg-white p-5 shadow-sm">
              <p className="flex items-center gap-2 text-xs font-extrabold text-slate-900"><MapPin size={15} className="text-[#397a4a]" /> Delivery address</p>
              {order.shippingAddress ? <p className="mt-3 text-[10px] leading-5 text-slate-500">{order.shippingAddress.fullName}<br />{order.shippingAddress.line1}<br />{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p> : <p className="mt-3 text-[10px] text-slate-500">Address submitted during checkout</p>}
              <p className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-[9px] font-bold text-slate-500"><PackageCheck size={13} className="text-[#397a4a]" /> Delivery is being scheduled</p>
            </div>
          </aside>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onContinueShopping} className="flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-xs font-extrabold text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">Continue shopping</button>
          <button type="button" onClick={onViewOrders} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#397a4a] px-6 text-xs font-extrabold text-white transition hover:bg-[#2f663d]">View my orders <ArrowRight size={15} /></button>
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[9px] font-semibold text-slate-400"><CreditCard size={12} /> Razorpay Test Mode transaction — no real funds transferred</p>
      </div>
    </div>
  )
}

function DetailRow({ label, value, accent = false }) {
  return <div className="flex items-start justify-between gap-4"><span className="text-white/45">{label}</span><strong className={`max-w-[190px] break-all text-right ${accent ? 'text-[#9bcaa6]' : 'text-white/80'}`}>{value}</strong></div>
}
