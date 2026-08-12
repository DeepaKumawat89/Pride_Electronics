import { CheckCircle2, CreditCard, LockKeyhole, MapPin, X } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency } from '../../utils/currency'

export default function CheckoutModal({ open, subtotal, savedAddresses = [], savedPayments = [], onClose, onPlaceOrder }) {
  const defaultAddress = savedAddresses.find((address) => address.isDefault) || savedAddresses[0]
  const defaultPayment = savedPayments.find((payment) => payment.isDefault) || savedPayments[0]
  const [addressId, setAddressId] = useState(defaultAddress?.id || '')
  const [paymentId, setPaymentId] = useState(defaultPayment?.id || '')
  const [useManualAddress, setUseManualAddress] = useState(false)
  const [useManualPayment, setUseManualPayment] = useState(false)

  if (!open) return null
  const shipping = subtotal >= 999 ? 0 : 99
  const selectedAddress = savedAddresses.find((address) => address.id === addressId) || defaultAddress
  const selectedPayment = savedPayments.find((payment) => payment.id === paymentId) || defaultPayment
  const usingSavedAddress = !useManualAddress && Boolean(selectedAddress)
  const usingSavedPayment = !useManualPayment && Boolean(selectedPayment)

  const submit = (event) => {
    event.preventDefault()
    onPlaceOrder({ address: usingSavedAddress ? selectedAddress : null, payment: usingSavedPayment ? selectedPayment : null })
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="my-6 w-full max-w-4xl overflow-hidden rounded-[30px] bg-[#f7f8f5] shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 sm:px-8"><div><p className="text-[10px] font-extrabold uppercase tracking-widest text-[#ff5c35]">Secure checkout</p><h2 className="mt-1 text-xl font-extrabold">Complete your order</h2></div><button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full bg-white"><X size={18}/></button></div>
        <form onSubmit={submit} className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_290px]">
          <div className="space-y-7">
            <section>
              <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-extrabold"><MapPin size={17} className="text-[#ff5c35]"/> Delivery details</h3>{savedAddresses.length > 0 && <button type="button" onClick={() => setUseManualAddress((current) => !current)} className="text-[9px] font-extrabold text-[#536a50]">{usingSavedAddress ? 'Use another address' : 'Use saved address'}</button>}</div>
              {usingSavedAddress ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{savedAddresses.map((address) => <label key={address.id} className={`cursor-pointer rounded-2xl border-2 bg-white p-4 transition ${selectedAddress?.id === address.id ? 'border-[#75916f]' : 'border-transparent hover:border-slate-200'}`}><input type="radio" name="checkout-address" value={address.id} checked={selectedAddress?.id === address.id} onChange={() => setAddressId(address.id)} className="sr-only"/><div className="flex items-start justify-between"><span className="text-xs font-extrabold">{address.label}</span><span className="rounded-full bg-[#e4f1e7] px-2 py-1 text-[8px] font-extrabold uppercase text-[#366643]">{address.type}</span></div><p className="mt-2 text-[10px] leading-5 text-slate-500">{address.fullName}<br/>{address.line1}<br/>{address.city}, {address.state} {address.pincode}</p>{selectedAddress?.id === address.id && <p className="mt-2 flex items-center gap-1 text-[9px] font-extrabold text-[#536a50]"><CheckCircle2 size={12}/>Selected for delivery</p>}</label>)}</div> : <div className="mt-3 grid grid-cols-2 gap-3"><input required placeholder="First name" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="Last name" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="Phone number" className="col-span-2 h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="Street address" className="col-span-2 h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="City" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/><input required placeholder="PIN code" className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-xs outline-none focus:border-[#ff5c35]"/></div>}
            </section>

            <section>
              <div className="flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-sm font-extrabold"><CreditCard size={17} className="text-[#ff5c35]"/> Payment</h3>{savedPayments.length > 0 && <button type="button" onClick={() => setUseManualPayment((current) => !current)} className="text-[9px] font-extrabold text-[#536a50]">{usingSavedPayment ? 'Use another method' : 'Use saved method'}</button>}</div>
              {usingSavedPayment ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{savedPayments.map((payment) => <label key={payment.id} className={`cursor-pointer rounded-2xl border-2 bg-white p-4 transition ${selectedPayment?.id === payment.id ? 'border-[#253329]' : 'border-transparent hover:border-slate-200'}`}><input type="radio" name="checkout-payment" value={payment.id} checked={selectedPayment?.id === payment.id} onChange={() => setPaymentId(payment.id)} className="sr-only"/><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#eff3e7] text-[#536a50]">{payment.type === 'UPI' ? <span className="text-[9px] font-extrabold">UPI</span> : <CreditCard size={16}/>}</span><span className="min-w-0"><strong className="block text-[10px]">{payment.type}</strong><span className="block truncate text-[9px] text-slate-400">{payment.type === 'UPI' ? payment.upiId : `•••• ${payment.last4} · ${payment.expiry}`}</span></span>{selectedPayment?.id === payment.id && <CheckCircle2 size={16} className="ml-auto shrink-0 text-[#536a50]"/>}</div></label>)}</div> : <div className="mt-3 rounded-2xl border-2 border-slate-900 bg-white p-4"><div className="flex items-center justify-between"><span className="text-xs font-extrabold">Card / UPI / Netbanking</span><CheckCircle2 size={17} className="text-[#4f8a5d]"/></div><p className="mt-1 text-[10px] text-slate-400">Choose your preferred method on the secure payment screen.</p></div>}
            </section>
          </div>

          <aside className="h-fit rounded-2xl bg-white p-5"><h3 className="text-sm font-extrabold">Order summary</h3><div className="mt-5 space-y-3 text-xs text-slate-500"><div className="flex justify-between"><span>Items</span><strong className="text-slate-800">{formatCurrency(subtotal)}</strong></div><div className="flex justify-between"><span>Shipping</span><strong className="text-[#4f8a5d]">{shipping ? formatCurrency(shipping) : 'Free'}</strong></div><div className="flex justify-between"><span>GST</span><strong className="text-slate-800">Included</strong></div></div><div className="mt-5 flex justify-between border-t border-slate-100 pt-4"><span className="text-sm font-bold">Total</span><strong className="text-lg font-extrabold">{formatCurrency(subtotal + shipping)}</strong></div><button className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff5c35] text-xs font-extrabold text-white transition hover:bg-slate-950"><LockKeyhole size={15}/> Place order</button><p className="mt-3 text-center text-[9px] leading-4 text-slate-400">By placing your order, you agree to our terms and privacy policy.</p></aside>
        </form>
      </div>
    </div>
  )
}
