import { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  MapPin,
  PackageCheck,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  WalletCards,
} from 'lucide-react'
import { formatCurrency, parsePrice } from '../../utils/currency'
import { loadRazorpayCheckout, postRazorpayApi } from '../../utils/razorpay'

export default function CheckoutPage({ items = [], subtotal, savedAddresses = [], savedPayments = [], user, onBack, onPlaceOrder }) {
  const defaultAddress = savedAddresses.find((address) => address.isDefault) || savedAddresses[0]
  const defaultPayment = savedPayments.find((payment) => payment.isDefault) || savedPayments[0]
  const [addressId, setAddressId] = useState(defaultAddress?.id || '')
  const [paymentId, setPaymentId] = useState(defaultPayment?.id || '')
  const [useManualAddress, setUseManualAddress] = useState(false)
  const [useManualPayment, setUseManualPayment] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [couponMessage, setCouponMessage] = useState('')
  const [discount, setDiscount] = useState(0)
  const [paymentError, setPaymentError] = useState('')
  const [paying, setPaying] = useState(false)

  const selectedAddress = savedAddresses.find((address) => address.id === addressId) || defaultAddress
  const selectedPayment = savedPayments.find((payment) => payment.id === paymentId) || defaultPayment
  const usingSavedAddress = !useManualAddress && Boolean(selectedAddress)
  const usingSavedPayment = !useManualPayment && Boolean(selectedPayment)
  const shipping = subtotal >= 999 ? 0 : 99
  const total = Math.max(0, subtotal - discount + shipping)

  const applyCoupon = () => {
    if (coupon.trim().toUpperCase() === 'PRIDE500' && subtotal >= 2499) {
      setDiscount(Math.min(500, subtotal))
      setCouponMessage('PRIDE500 applied — you saved ₹500')
      return
    }
    setDiscount(0)
    setCouponMessage('Use PRIDE500 on orders above ₹2,499')
  }

  const submit = async (event) => {
    event.preventDefault()
    setPaymentError('')
    setPaying(true)

    try {
      const loaded = await loadRazorpayCheckout()
      if (!loaded) throw new Error('Unable to load Razorpay Checkout. Check your connection and try again.')

      const { keyId, order } = await postRazorpayApi('orders', {
        amount: Math.round(total * 100),
        receipt: `pride_${Date.now()}`,
      })

      const checkoutDetails = {
        address: usingSavedAddress ? selectedAddress : null,
        payment: usingSavedPayment ? selectedPayment : null,
        discount,
        shipping,
        total,
      }
      const razorpay = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Pride Electronics',
        description: `Test payment for ${items.length} ${items.length === 1 ? 'product' : 'products'}`,
        order_id: order.id,
        prefill: {
          name: user?.name || selectedAddress?.fullName || '',
          email: user?.email || '',
          contact: user?.mobile || selectedAddress?.phone || '',
        },
        method: 'upi',
        notes: { checkout: 'Pride Electronics Test Mode' },
        theme: { color: '#397a4a', backdrop_color: '#17251c' },
        config: {
          display: {
            sequence: ['upi', 'card', 'netbanking', 'wallet'],
            preferences: { show_default_blocks: true },
          },
        },
        modal: {
          backdropclose: false,
          escape: true,
          ondismiss: () => setPaying(false),
        },
        handler: async (response) => {
          try {
            const verification = await postRazorpayApi('verify', response)
            if (!verification.verified) throw new Error('Payment could not be verified.')
            onPlaceOrder({ ...checkoutDetails, razorpay: response })
          } catch (error) {
            setPaymentError(error.message)
            setPaying(false)
          }
        },
      })

      razorpay.on('payment.failed', (response) => {
        setPaymentError(response.error?.description || 'The test payment failed. Please try again.')
        setPaying(false)
      })
      razorpay.open()
    } catch (error) {
      setPaymentError(error.message)
      setPaying(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <button type="button" onClick={onBack} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm transition hover:bg-slate-950 hover:text-white"><ArrowLeft size={15} /> Back</button>

        <header className="relative mt-5 overflow-hidden rounded-[28px] bg-[#dcebdd] px-5 py-6 sm:px-8 sm:py-8">
          <div className="absolute -right-10 -top-24 size-64 rounded-full bg-[#9bcaa6]/35 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#aacfb3]/45 to-transparent" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#397a4a]">Secure checkout</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">Complete your order</h1><p className="mt-2 text-sm text-slate-600">Review your delivery, payment, and order details before placing the order.</p></div>
            <div className="flex w-fit items-center gap-3 rounded-2xl bg-white/75 px-4 py-3 shadow-sm backdrop-blur"><span className="grid size-10 place-items-center rounded-xl bg-[#397a4a] text-white"><ShieldCheck size={18} /></span><span><strong className="block text-xs text-slate-900">Safe & encrypted</strong><span className="text-[9px] font-semibold text-slate-500">Your payment details are protected</span></span></div>
          </div>
        </header>

        <form onSubmit={submit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <div className="space-y-5">
            <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><MapPin size={18} /></span><div><p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#ff5c35]">Step 01</p><h2 className="text-lg font-extrabold text-slate-950">Delivery address</h2></div></div>
                {!!savedAddresses.length && <button type="button" onClick={() => setUseManualAddress((current) => !current)} className="rounded-full bg-[#f2f7f2] px-3 py-2 text-[9px] font-extrabold text-[#397a4a] transition hover:bg-[#397a4a] hover:text-white">{usingSavedAddress ? 'Use another address' : 'Choose saved address'}</button>}
              </div>

              {usingSavedAddress ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {savedAddresses.map((address) => (
                    <label key={address.id} className={`relative cursor-pointer rounded-[22px] border-2 p-4 transition ${selectedAddress?.id === address.id ? 'border-[#75916f] bg-[#f5faf5] shadow-sm' : 'border-slate-100 bg-[#fafbfa] hover:border-[#c9ddcd]'}`}>
                      <input type="radio" name="checkout-address" value={address.id} checked={selectedAddress?.id === address.id} onChange={() => setAddressId(address.id)} className="sr-only" />
                      <div className="flex items-start justify-between gap-3"><div><strong className="text-xs text-slate-900">{address.label}</strong><p className="mt-1 text-[9px] font-bold text-slate-400">{address.fullName} · {address.phone}</p></div><span className="rounded-full bg-[#e4f1e7] px-2 py-1 text-[8px] font-extrabold uppercase text-[#366643]">{address.type}</span></div>
                      <p className="mt-3 text-[10px] leading-5 text-slate-500">{address.line1}<br />{address.city}, {address.state} {address.pincode}</p>
                      {selectedAddress?.id === address.id && <p className="mt-3 flex items-center gap-1.5 text-[9px] font-extrabold text-[#397a4a]"><CheckCircle2 size={13} /> Selected for delivery</p>}
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input required placeholder="First name" className="h-12 rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10" />
                  <input required placeholder="Last name" className="h-12 rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10" />
                  <input required placeholder="Phone number" className="h-12 rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10 sm:col-span-2" />
                  <input required placeholder="Street address" className="h-12 rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10 sm:col-span-2" />
                  <input required placeholder="City" className="h-12 rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10" />
                  <input required placeholder="PIN code" className="h-12 rounded-2xl border border-slate-200 bg-[#fafbfa] px-4 text-xs outline-none transition focus:border-[#75916f] focus:bg-white focus:ring-4 focus:ring-[#75916f]/10" />
                </div>
              )}
            </section>

            <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-[#ffe9e2] text-[#d84220]"><WalletCards size={18} /></span><div><p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#ff5c35]">Step 02</p><h2 className="text-lg font-extrabold text-slate-950">Payment method</h2></div></div>
                {!!savedPayments.length && <button type="button" onClick={() => setUseManualPayment((current) => !current)} className="rounded-full bg-[#f2f7f2] px-3 py-2 text-[9px] font-extrabold text-[#397a4a] transition hover:bg-[#397a4a] hover:text-white">{usingSavedPayment ? 'Use another method' : 'Choose saved method'}</button>}
              </div>

              {usingSavedPayment ? (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {savedPayments.map((payment) => (
                    <label key={payment.id} className={`cursor-pointer rounded-[22px] border-2 p-4 transition ${selectedPayment?.id === payment.id ? 'border-[#253329] bg-[#f6f8f5]' : 'border-slate-100 bg-[#fafbfa] hover:border-slate-300'}`}>
                      <input type="radio" name="checkout-payment" value={payment.id} checked={selectedPayment?.id === payment.id} onChange={() => setPaymentId(payment.id)} className="sr-only" />
                      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-white text-[#536a50] shadow-sm">{payment.type === 'UPI' ? <span className="text-[9px] font-extrabold">UPI</span> : <CreditCard size={17} />}</span><span className="min-w-0 flex-1"><strong className="block text-[11px] text-slate-900">{payment.type}</strong><span className="mt-0.5 block truncate text-[9px] text-slate-400">{payment.type === 'UPI' ? payment.upiId : `•••• ${payment.last4} · ${payment.expiry}`}</span></span>{selectedPayment?.id === payment.id && <CheckCircle2 size={17} className="shrink-0 text-[#397a4a]" />}</div>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[22px] border-2 border-[#397a4a] bg-[#f5faf5] p-4"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-2xl bg-white text-[#397a4a] shadow-sm"><CreditCard size={17} /></span><div className="flex-1"><strong className="text-xs text-slate-900">Card, UPI or Netbanking</strong><p className="mt-1 text-[9px] leading-4 text-slate-500">Select your preferred method on the secure payment step.</p></div><CheckCircle2 size={17} className="text-[#397a4a]" /></div></div>
              )}
              <div className="mt-4 flex items-start gap-3 rounded-[20px] border border-[#dcebdd] bg-[#f4f8f4] p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#397a4a] shadow-sm"><QrCode size={16} /></span><div><p className="text-[10px] font-extrabold text-slate-800">UPI opens first in Razorpay</p><p className="mt-1 text-[9px] leading-5 text-slate-500">Use UPI QR on desktop or a supported UPI app on mobile. Manual UPI ID entry is no longer offered under the current UPI flow.</p></div></div>
              <p className="mt-4 flex items-center gap-2 text-[9px] font-semibold text-slate-400"><LockKeyhole size={12} className="text-[#397a4a]" /> Payment information is encrypted and securely processed.</p>
            </section>
          </div>

          <aside className="h-fit rounded-[28px] bg-white p-5 shadow-sm lg:sticky lg:top-5 sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-[#ff5c35]">Your order</p><h2 className="mt-1 text-lg font-extrabold text-slate-950">Order summary</h2></div><span className="grid size-10 place-items-center rounded-2xl bg-[#e4f1e7] text-[#397a4a]"><ShoppingBag size={18} /></span></div>

            <div className="mt-5 max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map(({ product, quantity }) => (
                <article key={product.id} className="flex gap-3 rounded-2xl bg-[#f7f8f5] p-3"><img src={product.image} alt={product.name} className="size-16 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-[10px] font-extrabold leading-4 text-slate-800">{product.name}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="rounded-full bg-white px-2 py-1 text-[8px] font-bold text-slate-500">Qty {quantity}</span><strong className="text-[10px] text-slate-900">{formatCurrency(parsePrice(product.price) * quantity)}</strong></div></div></article>
              ))}
            </div>

            <div className="mt-5 rounded-[20px] bg-[#eaf3eb] p-4">
              <p className="flex items-center gap-2 text-[9px] font-extrabold uppercase tracking-wider text-[#536a50]"><Tag size={13} /> Coupon or discount</p>
              <div className="mt-3 flex gap-2"><input value={coupon} onChange={(event) => setCoupon(event.target.value)} placeholder="Enter code" className="h-10 min-w-0 flex-1 rounded-xl border border-white bg-white px-3 text-xs font-bold uppercase outline-none focus:border-[#75916f]" /><button type="button" onClick={applyCoupon} className="rounded-xl bg-[#253329] px-3 text-[10px] font-extrabold text-white transition hover:bg-[#ff5c35]">Apply</button></div>
              {couponMessage && <p className={`mt-2 text-[9px] font-semibold ${discount ? 'text-emerald-700' : 'text-amber-700'}`}>{couponMessage}</p>}
            </div>

            <div className="mt-5 space-y-3 text-xs text-slate-500">
              <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
              <SummaryRow label="Discount" value={discount ? `−${formatCurrency(discount)}` : formatCurrency(0)} accent={discount > 0} />
              <SummaryRow label="Delivery charges" value={shipping ? formatCurrency(shipping) : 'Free'} accent={!shipping} />
              <SummaryRow label="GST" value="Included" />
            </div>
            <div className="my-5 h-px bg-slate-100" />
            <div className="flex items-end justify-between gap-4"><span className="text-sm font-bold text-slate-800">Total amount</span><strong className="text-2xl font-extrabold tracking-tight text-slate-950">{formatCurrency(total)}</strong></div>
            {paymentError && <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-bold leading-5 text-red-700">{paymentError}</div>}
            <button type="submit" disabled={!items.length || paying} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-full bg-[#397a4a] px-5 text-xs font-extrabold text-white shadow-lg shadow-[#397a4a]/20 transition hover:-translate-y-0.5 hover:bg-[#2f663d] disabled:cursor-not-allowed disabled:bg-slate-300"><LockKeyhole size={15} /> {paying ? 'Opening Razorpay…' : `Pay ${formatCurrency(total)} with Razorpay`}</button>
            <p className="mt-3 text-center text-[9px] font-bold text-[#397a4a]">Razorpay Test Mode · No real money will be deducted</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[8px] font-bold text-slate-500"><span className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-2"><Truck size={12} className="text-[#397a4a]" /> Tracked delivery</span><span className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-2"><PackageCheck size={12} className="text-[#397a4a]" /> Quality checked</span></div>
          </aside>
        </form>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, accent = false }) {
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><strong className={accent ? 'text-emerald-700' : 'text-slate-800'}>{value}</strong></div>
}
