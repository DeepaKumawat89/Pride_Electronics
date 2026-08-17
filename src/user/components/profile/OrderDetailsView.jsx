import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  Download,
  Headphones,
  MapPin,
  Package,
  ReceiptText,
  RotateCcw,
  Star,
  Truck,
} from 'lucide-react'
import { useState } from 'react'
import { formatCurrency, parsePrice } from '../../utils/currency'
import downloadInvoicePdf from './InvoicePdf'

const RETURN_REASONS = [
  'Product is damaged',
  'Wrong product received',
  'Product does not match description',
  'Missing parts or accessories',
  'No longer needed',
]
const NOW = Date.now()

const getAddressParts = (address) => {
  if (!address) {
    return {
      name: 'Pride Customer',
      address: 'Address not available',
      phone: 'Phone number not available',
    }
  }
  if (typeof address === 'string') {
    return { name: 'Pride Customer', address, phone: 'Phone number not available' }
  }
  return {
    name: address.fullName || 'Pride Customer',
    address: [
      address.line1,
      address.line2,
      [address.city, address.state, address.pincode].filter(Boolean).join(', '),
    ]
      .filter(Boolean)
      .join(', '),
    phone: address.phone || 'Phone number not available',
  }
}

const getFinancials = (order) => {
  const itemTotal = (order.items || []).reduce(
    (sum, item) => sum + parsePrice(item.price) * Number(item.qty || 1),
    0,
  )
  const discount = parsePrice(order.discount || 0)
  const delivery = parsePrice(order.deliveryCharges || 0)
  const total = parsePrice(order.total) || Math.max(0, itemTotal - discount + delivery)
  const tax =
    parsePrice(order.taxAmount || 0) ||
    Math.round((Math.max(0, itemTotal - discount) * 18) / 118)
  return { itemTotal, discount, delivery, tax, total }
}

const getProgress = (order) => {
  const statusMoment = (status, fallbackDate, fallbackTime) => {
    const event = [...(order.statusHistory || [])]
      .reverse()
      .find((item) => item.status === status)
    return {
      date: event?.date || fallbackDate,
      time: event?.time || fallbackTime,
    }
  }
  const orderedEvent = [...(order.statusHistory || [])]
    .reverse()
    .find((item) => ['Pending', 'Ordered'].includes(item.status))
  const ordered = {
    date: orderedEvent?.date || order.date,
    time: orderedEvent?.time || order.orderTime,
  }
  const confirmed = statusMoment(
    'Confirmed',
    order.confirmedDate,
    order.confirmedTime,
  )
  const processing = statusMoment(
    'Processing',
    order.processingDate,
    order.processingTime,
  )
  const packed = statusMoment('Packed', order.packedDate, order.packedTime)
  const shipped = statusMoment(
    'Shipped',
    order.shippedDate,
    order.shippedTime,
  )
  const outForDelivery = statusMoment(
    'Out for Delivery',
    order.outForDeliveryDate,
    order.outForDeliveryTime,
  )
  const delivered = statusMoment(
    'Delivered',
    order.status === 'Delivered' ? order.deliveryDate : undefined,
    order.deliveredTime,
  )
  const stages = [
    { label: 'Ordered', ...ordered },
    { label: 'Confirmed', ...confirmed },
    { label: 'Processing', ...processing },
    { label: 'Packed', ...packed },
    { label: 'Shipped', ...shipped },
    { label: 'Out for Delivery', ...outForDelivery },
    { label: 'Delivered', ...delivered },
  ]
  const stageByStatus = {
    Pending: 0,
    Ordered: 0,
    Confirmed: 1,
    Processing: 2,
    Packed: 3,
    Shipped: 4,
    'Out for Delivery': 5,
    Delivered: 6,
    Returned: 6,
    Refunded: 6,
  }
  return { stages, current: stageByStatus[order.status] ?? 0 }
}

function StatusPill({ status }) {
  const tone =
    status === 'Delivered'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'Cancelled'
        ? 'bg-red-50 text-red-600'
        : 'bg-amber-50 text-amber-700'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-wider ${tone}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}

function SectionTitle({ children, icon: Icon }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
      {Icon && <Icon size={17} className="text-[#536a50]" />}
      {children}
    </h2>
  )
}

function SummaryRow({ label, value, muted = false }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-[11px]">
      <span className="text-slate-500">{label}</span>
      <strong className={muted ? 'text-emerald-700' : 'text-slate-800'}>{value}</strong>
    </div>
  )
}

export default function OrderDetailsView({ order, user, address, onBack }) {
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [submittedFeedback, setSubmittedFeedback] = useState(null)
  const [activeAction, setActiveAction] = useState('')
  const [returnReason, setReturnReason] = useState('')
  const [returnSubmitted, setReturnSubmitted] = useState(false)
  const [invoiceDownloading, setInvoiceDownloading] = useState(false)
  const financials = getFinancials(order)
  const delivery = getAddressParts(address)
  const progress = getProgress(order)
  const delivered = order.status === 'Delivered'
  const deliveredAt = new Date(order.deliveryDate).getTime()
  const daysSinceDelivery = Number.isNaN(deliveredAt)
    ? Infinity
    : Math.floor((NOW - deliveredAt) / 86400000)
  const returnEligible =
    order.returnEligible ??
    (delivered && daysSinceDelivery >= 0 && daysSinceDelivery <= 30)

  const downloadInvoice = async () => {
    setInvoiceDownloading(true)
    try {
      await downloadInvoicePdf(order, user, address)
    } finally {
      setInvoiceDownloading(false)
    }
  }

  const helpActions = [
    ...(returnEligible ? [['Return Product', RotateCcw]] : []),
    ['Report an Issue', Package],
    ['Billing & Payment Help', CreditCard],
    ['Delivery Help', Truck],
    ['Contact Support', Headphones],
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-3">
      <header>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-[10px] font-extrabold text-slate-500 transition hover:text-[#253329]"
        >
          <ArrowLeft size={15} />
          Back to Orders
        </button>
        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
              Order #{order.id}
            </h1>
            <p className="mt-1.5 text-[10px] text-slate-400 sm:text-xs">
              Ordered on {order.date}
              {order.orderTime ? ` at ${order.orderTime}` : ''}
            </p>
          </div>
          <StatusPill status={order.status} />
        </div>
      </header>

      <section aria-label="Order progress" className="overflow-x-auto pb-2">
        {order.status === 'Cancelled' ? (
          <div className="flex min-w-fit items-center gap-3 rounded-2xl bg-red-50 px-4 py-3 text-[10px] font-bold text-red-600">
            <span className="grid size-7 place-items-center rounded-full bg-red-100">×</span>
            This order was cancelled. Any applicable refund is being processed.
          </div>
        ) : (
          <ol className="flex min-w-[720px] items-start px-1 pt-1">
            {progress.stages.map((stage, index) => {
              const completed = index < progress.current
              const current = index === progress.current
              return (
                <li key={stage.label} className="relative flex-1 text-center">
                  {index > 0 && (
                    <span className={`absolute left-0 top-3.5 h-0.5 w-1/2 ${index <= progress.current ? 'bg-[#75916f]' : 'bg-slate-200'}`} />
                  )}
                  {index < progress.stages.length - 1 && (
                    <span className={`absolute right-0 top-3.5 h-0.5 w-1/2 ${index < progress.current ? 'bg-[#75916f]' : 'bg-slate-200'}`} />
                  )}
                  <span className={`relative z-10 mx-auto grid size-7 place-items-center rounded-full border-2 ${completed ? 'border-[#75916f] bg-[#75916f] text-white' : current ? 'border-[#ff5c35] bg-white text-[#ff5c35]' : 'border-slate-200 bg-white text-slate-300'}`}>
                    {completed ? <Check size={13} strokeWidth={3} /> : <span className="size-1.5 rounded-full bg-current" />}
                  </span>
                  <strong className={`mt-2 block text-[9px] ${completed || current ? 'text-slate-800' : 'text-slate-400'}`}>
                    {stage.label}
                  </strong>
                  {(stage.date || stage.time) && (completed || current) && (
                    <span className="mt-1 block text-[8px] text-slate-400">
                      {[stage.date, stage.time].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>

      <main className="overflow-hidden rounded-[24px] border border-slate-100 bg-white px-4 shadow-[0_12px_35px_rgba(40,68,48,0.07)] sm:px-7">
        <section className="py-6">
          <SectionTitle icon={Package}>Products</SectionTitle>
          <div className="mt-4 divide-y divide-slate-100">
            {(order.items || []).map((item, index) => {
              const quantity = Number(item.qty || 1)
              const unitPrice = parsePrice(item.price)
              const total = Math.max(0, unitPrice * quantity - parsePrice(item.discount || 0))
              return (
                <div key={`${item.productName}-${index}`} className="grid gap-4 py-5 first:pt-1 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center">
                  <img src={item.image} alt={item.productName} className="size-19 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold leading-5 text-slate-900 sm:text-sm">{item.productName}</h3>
                    {(item.variant || item.specification) && (
                      <p className="mt-1 text-[9px] text-slate-400">{item.variant || item.specification}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[9px] text-slate-500">
                      <span>Quantity: <strong className="text-slate-700">{quantity}</strong></span>
                      <span>Unit price: <strong className="text-slate-700">{formatCurrency(unitPrice)}</strong></span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-400">Total price</span>
                    <strong className="mt-1 block text-sm text-slate-950">{formatCurrency(total)}</strong>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="grid gap-8 border-t border-slate-100 py-6 md:grid-cols-2 md:gap-12">
          <div>
            <SectionTitle icon={MapPin}>Delivery</SectionTitle>
            <dl className="mt-4 space-y-3 text-[10px]">
              <div><dt className="text-slate-400">Customer</dt><dd className="mt-0.5 font-bold text-slate-700">{delivery.name}</dd></div>
              <div><dt className="text-slate-400">Delivery address</dt><dd className="mt-0.5 max-w-md font-semibold leading-5 text-slate-600">{delivery.address}</dd></div>
              <div><dt className="text-slate-400">Phone</dt><dd className="mt-0.5 font-semibold text-slate-600">{delivery.phone}</dd></div>
              <div><dt className="text-slate-400">{delivered ? 'Delivered on' : 'Estimated delivery'}</dt><dd className="mt-0.5 font-bold text-slate-700">{order.deliveryDate || 'Being scheduled'}</dd></div>
            </dl>
          </div>
          <div>
            <SectionTitle icon={CreditCard}>Payment</SectionTitle>
            <dl className="mt-4 space-y-3 text-[10px]">
              <div><dt className="text-slate-400">Payment method</dt><dd className="mt-0.5 font-bold text-slate-700">{order.paymentMethod || 'Online payment'}</dd></div>
              <div><dt className="text-slate-400">Payment status</dt><dd className="mt-0.5 font-bold text-emerald-700">{order.paymentStatus || 'Paid'}</dd></div>
              {(order.razorpayPaymentId || order.transactionId) && (
                <div><dt className="text-slate-400">Transaction ID</dt><dd className="mt-0.5 break-all font-mono text-[9px] font-semibold text-slate-600">{order.razorpayPaymentId || order.transactionId}</dd></div>
              )}
              {order.trackingId && (
                <div><dt className="text-slate-400">Tracking ID</dt><dd className="mt-0.5 break-all font-mono text-[9px] font-semibold text-slate-600">{order.trackingId}</dd></div>
              )}
            </dl>
          </div>
        </section>

        <section className="border-t border-slate-100 py-6">
          <div className="ml-auto max-w-md">
            <SectionTitle icon={ReceiptText}>Order Summary</SectionTitle>
            <div className="mt-3">
              <SummaryRow label="Item total" value={formatCurrency(financials.itemTotal)} />
              <SummaryRow label="Discount" value={`− ${formatCurrency(financials.discount)}`} muted />
              <SummaryRow label="Delivery charges" value={financials.delivery ? formatCurrency(financials.delivery) : 'FREE'} muted={!financials.delivery} />
              <SummaryRow label="GST / Taxes (included)" value={formatCurrency(financials.tax)} />
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-4">
                <strong className="text-sm text-slate-900">Grand Total</strong>
                <strong className="text-xl text-[#253329]">{formatCurrency(financials.total)}</strong>
              </div>
            </div>
          </div>
        </section>

        {delivered && (
          <section className="border-t border-slate-100 py-6">
            <SectionTitle icon={Star}>Rate your purchase</SectionTitle>
            {submittedFeedback ? (
              <div className="mt-4">
                <div className="flex items-center gap-1" aria-label={`${submittedFeedback.rating} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star key={value} size={17} className={value <= submittedFeedback.rating ? 'text-[#ffb000]' : 'text-slate-200'} fill={value <= submittedFeedback.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <p className="mt-3 max-w-3xl text-[11px] leading-5 text-slate-600">{submittedFeedback.review}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-[9px] font-bold text-emerald-700"><CheckCircle2 size={13} /> Feedback submitted</p>
              </div>
            ) : (
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (rating && review.trim()) setSubmittedFeedback({ rating, review: review.trim() })
                }}
                className="mt-4 max-w-3xl"
              >
                <div className="flex gap-1" role="radiogroup" aria-label="Purchase rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" role="radio" aria-checked={rating === value} onClick={() => setRating(value)} className="grid size-9 place-items-center rounded-full transition hover:bg-amber-50" aria-label={`${value} star${value > 1 ? 's' : ''}`}>
                      <Star size={19} className={value <= rating ? 'text-[#ffb000]' : 'text-slate-300'} fill={value <= rating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                <label className="mt-4 block text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Write your feedback</label>
                <textarea required value={review} onChange={(event) => setReview(event.target.value)} rows={4} placeholder="Tell us about the product and delivery experience..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-3 text-xs outline-none transition focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10" />
                <button disabled={!rating || !review.trim()} className="mt-3 rounded-full bg-[#253329] px-5 py-2.5 text-[10px] font-extrabold text-white transition hover:bg-[#ff5c35] disabled:cursor-not-allowed disabled:opacity-40">Submit Feedback</button>
              </form>
            )}
          </section>
        )}
      </main>

      <section className="overflow-hidden rounded-[24px] border border-slate-100 bg-white px-4 shadow-[0_10px_30px_rgba(40,68,48,0.06)] sm:px-7">
        <div className="py-6">
          <SectionTitle icon={Headphones}>Help & Actions</SectionTitle>
          <div className="mt-4 flex flex-wrap gap-2">
            {helpActions.map(([label, Icon]) =>
              label === 'Contact Support' ? (
                <a key={label} href={`mailto:support@prideelectronics.in?subject=${encodeURIComponent(`Help with order ${order.id}`)}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 text-[9px] font-extrabold text-slate-600 transition hover:border-[#75916f] hover:text-[#253329]"><Icon size={14} />{label}</a>
              ) : (
                <button key={label} type="button" onClick={() => setActiveAction((current) => current === label ? '' : label)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[9px] font-extrabold transition ${activeAction === label ? 'border-[#75916f] bg-[#eef4e8] text-[#253329]' : 'border-slate-200 text-slate-600 hover:border-[#75916f]'}`}><Icon size={14} />{label}</button>
              ),
            )}
          </div>

          {activeAction === 'Return Product' && returnEligible && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              {returnSubmitted ? (
                <p className="flex items-center gap-2 text-[10px] font-bold text-emerald-700"><CheckCircle2 size={15} /> Return request submitted for “{returnReason}”. Pickup details will be shared after review.</p>
              ) : (
                <form onSubmit={(event) => { event.preventDefault(); if (returnReason) setReturnSubmitted(true) }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="min-w-0 flex-1 text-[9px] font-extrabold uppercase tracking-wider text-slate-500">Return reason
                    <select required value={returnReason} onChange={(event) => setReturnReason(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none focus:border-[#75916f]">
                      <option value="">Select a reason</option>
                      {RETURN_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                    </select>
                  </label>
                  <button className="h-11 rounded-full bg-[#253329] px-5 text-[10px] font-extrabold text-white">Initiate Return</button>
                </form>
              )}
              <p className="mt-3 text-[9px] leading-4 text-slate-400">Eligible returns are inspected before refunds are sent to the original payment method within 5–7 business days.</p>
            </div>
          )}

          {activeAction && activeAction !== 'Return Product' && (
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-5 text-slate-500">Tell our support team about your {activeAction.toLowerCase()} request for order {order.id}.</p>
              <a href={`mailto:support@prideelectronics.in?subject=${encodeURIComponent(`${activeAction} - ${order.id}`)}`} className="w-fit rounded-full bg-[#253329] px-4 py-2.5 text-[9px] font-extrabold text-white">Contact Support</a>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 border-t border-slate-100 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <SectionTitle icon={ReceiptText}>Invoice</SectionTitle>
            <p className="mt-1 text-[9px] text-slate-400">Your professional PDF invoice is available for this order.</p>
          </div>
          <button type="button" onClick={downloadInvoice} disabled={invoiceDownloading} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-[#253329] px-5 text-[10px] font-extrabold text-white transition hover:bg-[#ff5c35] disabled:opacity-60">
            <Download size={15} />
            {invoiceDownloading ? 'Preparing PDF...' : 'Download Invoice'}
          </button>
        </div>
      </section>
    </div>
  )
}
