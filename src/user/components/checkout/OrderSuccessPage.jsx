import { ArrowRight, Check, CheckCircle2, CreditCard } from 'lucide-react'
import { getOrderDisplayId } from '../../../utils/orderIdentifiers'

export default function OrderSuccessPage({
  order,
  onVerifyPayment,
  onContinueShopping,
  onViewOrders,
}) {
  const paymentState = String(order.paymentStatus || 'Pending')
  const paymentConfirmed = ['paid', 'successful', 'captured'].includes(paymentState.toLowerCase())
  const paymentFailed = ['failed', 'cancelled'].includes(paymentState.toLowerCase())
  const orderDisplayId = getOrderDisplayId(order)
  return (
    <div className="min-h-[calc(100dvh-8rem)] bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1120px] px-4 py-7 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
        <section className="relative isolate overflow-hidden rounded-[32px] bg-[#dcebdd] px-5 py-8 text-center shadow-sm sm:px-8 sm:py-11">
          <div className="absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-[#9bcaa6]/45 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-[#aacfb3]/45 to-transparent" />
          <span className={`mx-auto grid size-18 place-items-center rounded-full ${paymentFailed ? 'bg-amber-100 text-amber-700' : paymentConfirmed ? 'bg-[#397a4a] text-white shadow-xl shadow-[#397a4a]/25' : 'bg-amber-100 text-amber-700'}`}>{paymentConfirmed ? <Check size={31} strokeWidth={3} /> : <CreditCard size={28} />}</span>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#397a4a]">{paymentConfirmed ? 'Payment Successful' : paymentFailed ? `Payment ${paymentState}` : `Payment status: ${paymentState}`}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-5xl">{paymentConfirmed ? 'Order Placed Successfully' : paymentFailed ? 'Payment Needs Attention' : 'Payment Confirmation Pending'}</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">{paymentFailed ? 'Your order has not been confirmed. You can review its current status in your account.' : !paymentConfirmed ? 'Cashfree has returned to Pride Circuit. We will update this order when the payment is verified.' : 'Thank you for shopping with Pride Circuit!'}</p>
          <div className="mx-auto mt-6 flex w-fit flex-wrap items-center justify-center gap-2 rounded-full bg-white/75 px-4 py-2.5 text-[10px] font-bold text-slate-600 backdrop-blur"><CheckCircle2 size={14} className="text-[#397a4a]" /> Order {orderDisplayId}<span className="size-1 rounded-full bg-slate-300" />Payment {paymentState}</div>
        </section>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onContinueShopping} className="flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-xs font-extrabold text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">Continue shopping</button>
          <button type="button" onClick={onViewOrders} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#397a4a] px-6 text-xs font-extrabold text-white transition hover:bg-[#2f663d]">View Order <ArrowRight size={15} /></button>
        </div>
        {!paymentConfirmed && !paymentFailed && (
          <div className="mt-4 text-center">
            <button type="button" onClick={onVerifyPayment} className="text-xs font-extrabold text-[#397a4a] underline underline-offset-4">
              Check payment status
            </button>
          </div>
        )}
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[9px] font-semibold text-slate-400"><CreditCard size={12} /> {paymentConfirmed ? 'Secure online payment verified by Cashfree' : 'Payment state is updated from server verification and Cashfree webhooks'}</p>
      </div>
    </div>
  )
}
