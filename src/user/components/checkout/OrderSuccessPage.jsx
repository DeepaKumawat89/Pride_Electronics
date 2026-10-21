import { AlertTriangle, ArrowRight, Check, CheckCircle2, CreditCard, LoaderCircle } from 'lucide-react'
import { getOrderDisplayId } from '../../../utils/orderIdentifiers'

export default function OrderSuccessPage({
  order,
  verificationState,
  onRetryVerification,
  onContinueShopping,
  onViewOrders,
}) {
  if (verificationState) {
    const failed = verificationState.status === 'error'
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-[#f7f8f5]">
        <div className="mx-auto grid min-h-[calc(100vh-8rem)] max-w-[1120px] place-items-center px-4 py-7 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
          <section className="w-full max-w-xl rounded-[32px] bg-white px-6 py-12 text-center shadow-sm sm:px-10 sm:py-16" aria-live="polite" aria-busy={!failed}>
            <span className={`mx-auto grid size-16 place-items-center rounded-full ${failed ? 'bg-red-50 text-red-600' : 'bg-[#e4f1e7] text-[#397a4a]'}`}>
              {failed ? <AlertTriangle size={27} /> : <LoaderCircle size={28} className="animate-spin" />}
            </span>
            <h1 className="mt-6 text-2xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-3xl">
              {failed ? 'Payment verification incomplete' : 'Verifying your payment...'}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-xs font-semibold leading-6 text-slate-500">
              {failed
                ? verificationState.message
                : 'Please wait while we securely confirm your payment and create your order.'}
            </p>
            {failed && (
              <button type="button" onClick={onRetryVerification} className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#397a4a] px-7 text-xs font-extrabold text-white transition hover:bg-[#2f663d]">
                Retry verification
              </button>
            )}
          </section>
        </div>
      </div>
    )
  }

  const isCod = /cash|cod/i.test(order.paymentMethod || '')
  const orderDisplayId = getOrderDisplayId(order)
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1120px] px-4 py-7 sm:px-6 sm:py-10 lg:px-10 lg:py-14">
        <section className="relative isolate overflow-hidden rounded-[32px] bg-[#dcebdd] px-5 py-8 text-center shadow-sm sm:px-8 sm:py-11">
          <div className="absolute -right-16 -top-24 -z-10 size-72 rounded-full bg-[#9bcaa6]/45 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 -z-10 h-28 bg-gradient-to-t from-[#aacfb3]/45 to-transparent" />
          <span className="mx-auto grid size-18 place-items-center rounded-full bg-[#397a4a] text-white shadow-xl shadow-[#397a4a]/25"><Check size={31} strokeWidth={3} /></span>
          <p className="mt-5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#397a4a]">{isCod ? 'Cash on Delivery Order Confirmed' : 'Payment Successful'}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.045em] text-slate-950 sm:text-5xl">Order Placed Successfully</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">Thank you for shopping with Pride Circuit! Your order has been placed successfully.</p>
          <div className="mx-auto mt-6 flex w-fit flex-wrap items-center justify-center gap-2 rounded-full bg-white/75 px-4 py-2.5 text-[10px] font-bold text-slate-600 backdrop-blur"><CheckCircle2 size={14} className="text-[#397a4a]" /> Order {orderDisplayId}<span className="size-1 rounded-full bg-slate-300" />{isCod ? 'Payment due on delivery' : 'Payment verified'}</div>
        </section>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={onContinueShopping} className="flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-xs font-extrabold text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white">Continue shopping</button>
          <button type="button" onClick={onViewOrders} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#397a4a] px-6 text-xs font-extrabold text-white transition hover:bg-[#2f663d]">View Order <ArrowRight size={15} /></button>
        </div>
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[9px] font-semibold text-slate-400"><CreditCard size={12} /> {isCod ? 'Pay securely when your order arrives' : 'Secure online payment'}</p>
      </div>
    </div>
  )
}
