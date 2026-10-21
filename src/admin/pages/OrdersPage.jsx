import { useState } from 'react'
import {
  Check,
  CheckCircle2,
  Copy,
  Eye,
  ImageIcon,
  PackageCheck,
  RotateCcw,
  Truck,
} from 'lucide-react'
import SelectMenu from '../../components/ui/SelectMenu'
import {
  EmptyState,
  Modal,
  PageHeader,
  StatCard,
} from '../components/ui/AdminUI'
import { formatAdminCurrency, getInitials, statusTone } from '../utils/adminFormatters'
import { getOrderDeliverySnapshot } from '../../utils/orderDelivery'
import { getOrderDisplayId } from '../../utils/orderIdentifiers'
import { getOrderPlacedMoment, getStatusMoment } from '../../utils/orderTimestamps'

const statuses = [
  'All',
  'Confirmed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Returned',
  'Refunded',
]
const statusOptions = statuses.slice(1).map((status) => ({
  value: status,
  label: status,
}))
const statusForAdmin = (status) => {
  const normalizedStatus = String(status || '').trim().toLowerCase()
  if (['pending', 'processing', 'packed', 'confirmed'].includes(normalizedStatus)) {
    return 'Confirmed'
  }
  return (
    statuses.find(
      (candidate) => candidate !== 'All' && candidate.toLowerCase() === normalizedStatus,
    ) || String(status || '').trim()
  )
}

const finiteMoney = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

const itemSnapshot = (item = {}) => {
  const quantity = Math.max(1, Number(item.quantity ?? item.qty) || 1)
  const unitPrice = finiteMoney(item.unitSellingPrice ?? item.unitPrice ?? item.price)
  const gstRate = finiteMoney(item.gstRate ?? item.taxRate)
  const gst = finiteMoney(item.lineTax ?? item.gstAmount) || finiteMoney(item.unitGst) * quantity
  const itemTotal = item.lineTotal != null
    ? finiteMoney(item.lineTotal)
    : item.productTotal != null
      ? finiteMoney(item.productTotal) + gst
      : unitPrice * quantity + gst
  return { quantity, unitPrice, gstRate, gst, itemTotal }
}

export default function OrdersPage({
  orders = [],
  onUpdateOrderStatus,
  searchQuery = '',
}) {
  const [statusFilter, setStatusFilter] = useState('All')
  const [returnOrder, setReturnOrder] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const filtered = orders.filter(
    (order) =>
      (statusFilter === 'All' || statusForAdmin(order.status) === statusFilter) &&
      (!searchQuery ||
        `${order.id} ${order.orderNumber || ''} ${order.invoiceNumber || ''} ${order.customer} ${order.email} ${order.trackingId || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  )
  const inProgress = orders.filter((order) =>
    ['Confirmed', 'Shipped', 'Out for Delivery'].includes(
      statusForAdmin(order.status),
    ),
  ).length
  const delivered = orders.filter(
    (order) => statusForAdmin(order.status) === 'Delivered',
  ).length

  const copy = (text) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 1800)
  }
  const updateOrderStatus = (order, status, options) => {
    if (status === 'Returned' && !options?.returnDisposition) {
      setReturnOrder(order)
      return
    }
    onUpdateOrderStatus(order.id, status, options)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fulfillment centre"
        title={`${orders.length} customer orders`}
        description="Review order details and keep every delivery moving through the fulfillment pipeline."
      />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={PackageCheck}
          label="All orders"
          value={orders.length}
          detail="Across all statuses"
        />
        <StatCard
          icon={Truck}
          label="In progress"
          value={inProgress}
          detail="Confirmed or in delivery"
          tone="amber"
        />
        <StatCard
          icon={CheckCircle2}
          label="Delivered"
          value={delivered}
          detail="Completed successfully"
          tone="green"
        />
      </section>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[9px] font-extrabold transition ${statusFilter === status ? 'bg-[#397a4a] text-white' : 'border border-slate-200 bg-white text-slate-500'}`}
          >
            {status}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[7px] ${statusFilter === status ? 'bg-white/15' : 'bg-slate-100'}`}
            >
              {status === 'All'
                ? orders.length
                : orders.filter(
                    (order) => statusForAdmin(order.status) === status,
                  ).length}
            </span>
          </button>
        ))}
      </div>
      {!filtered.length ? (
        <EmptyState title="No matching orders" />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {[
                    'Order',
                    'Customer',
                    'Date',
                    'Products',
                    'Delivery',
                    'Total',
                    'Status',
                    'Details',
                  ].map((head) => (
                    <th
                      key={head}
                      className="px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((order) => {
                  const delivery = getOrderDeliverySnapshot(order)
                  const orderDisplayId = getOrderDisplayId(order)
                  const placedMoment = getOrderPlacedMoment(order)
                  return <tr key={order.id} className="transition hover:bg-[#fafcf9]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <strong className="text-[10px] text-[#397a4a]">
                          {orderDisplayId}
                        </strong>
                        <button
                          type="button"
                          onClick={() => copy(orderDisplayId)}
                          className="text-slate-400 hover:text-[#397a4a]"
                        >
                          {copiedId === orderDisplayId ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                      <span className="mt-1 block text-[8px] font-semibold text-slate-400">
                        Invoice {order.invoiceNumber || 'not issued'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e4f1e7] text-[8px] font-extrabold text-[#397a4a]">
                          {getInitials(order.customer)}
                        </span>
                        <span className="min-w-0">
                          <strong className="block max-w-40 truncate text-[10px] text-slate-900">
                            {order.customer}
                          </strong>
                          <span className="block max-w-40 truncate text-[8px] text-slate-400">
                            {order.email}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">
                      {placedMoment.date}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {order.items?.slice(0, 2).map((item, index) => (
                          <span
                            key={`${item.productId || item.productName}-${item.variantId || ''}-${index}`}
                            className="max-w-40 truncate rounded-full bg-slate-100 px-2 py-1 text-[7px] font-bold text-slate-600"
                          >
                            {item.productName || 'Product'}{item.variant ? ` · ${item.variant}` : ''} ×{itemSnapshot(item).quantity}
                          </span>
                        ))}
                        {(order.items?.length || 0) > 2 && (
                          <span className="rounded-full bg-[#e4f1e7] px-2 py-1 text-[7px] font-extrabold text-[#397a4a]">
                            +{order.items.length - 2} more
                          </span>
                        )}
                        {!order.items?.length && (
                          <span className="text-[9px] text-slate-400">
                            {order.itemsCount || 1} product(s)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <strong className="block text-[9px] text-[#397a4a]">{delivery?.label || 'Not recorded'}</strong>
                    </td>
                    <td className="px-5 py-4 text-xs font-extrabold text-slate-900">
                      {order.total}
                    </td>
                    <td className="px-5 py-4">
                      <SelectMenu
                        value={statusForAdmin(order.status)}
                        onChange={(status) => updateOrderStatus(order, status)}
                        options={statusOptions}
                        ariaLabel={`Status for order ${orderDisplayId}`}
                        className="w-32"
                        menuWidth={176}
                        buttonClassName={`rounded-full px-3 py-2 text-[8px] font-extrabold ring-1 ring-inset ${statusTone[statusForAdmin(order.status)] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#17251c] px-3 text-[8px] font-extrabold text-white transition hover:bg-[#397a4a]"
                      >
                        <Eye size={12} /> View order
                      </button>
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        eyebrow="Order details"
        title={selectedOrder ? getOrderDisplayId(selectedOrder) : ''}
        maxWidth="h-[100dvh] max-w-6xl sm:h-[94dvh] sm:w-[calc(100vw-2.5rem)]"
        scrollBody
      >
        {selectedOrder && (() => {
          const delivery = getOrderDeliverySnapshot(selectedOrder)
          const placedMoment = getOrderPlacedMoment(selectedOrder)
          const items = Array.isArray(selectedOrder.items) ? selectedOrder.items : []
          const latestStatusEvent = (selectedOrder.statusHistory || []).at(-1)
          const latestStatusMoment = latestStatusEvent ? getStatusMoment(latestStatusEvent) : null
          return (
            <div className="space-y-6 p-4 sm:p-7">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-white p-4 shadow-sm"><span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Customer</span><strong className="mt-1 block text-xs text-slate-900">{selectedOrder.customer || 'Not recorded'}</strong><span className="mt-1 block break-all text-[9px] text-slate-500">{selectedOrder.email || 'No email'}</span></div>
                <div className="rounded-2xl bg-white p-4 shadow-sm"><span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Ordered</span><strong className="mt-1 block text-xs text-slate-900">{placedMoment.date}</strong><span className="mt-1 block text-[9px] text-slate-500">{placedMoment.time || `Invoice ${selectedOrder.invoiceNumber || 'not issued'}`}</span></div>
                <div className="rounded-2xl bg-white p-4 shadow-sm"><span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Delivery method</span><strong className="mt-1 block text-xs text-[#397a4a]">{delivery?.label || selectedOrder.deliveryMethodLabel || selectedOrder.deliveryOption || 'Not recorded'}</strong><span className="mt-1 block text-[9px] text-slate-500">{selectedOrder.deliveryDate || 'Being scheduled'}</span></div>
                <div className="rounded-2xl bg-white p-4 shadow-sm"><span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">Current status</span><strong className="mt-1 block text-xs text-slate-900">{statusForAdmin(selectedOrder.status)}</strong><span className="mt-1 block text-[9px] text-slate-500">{latestStatusMoment?.date ? `${latestStatusMoment.date}${latestStatusMoment.time ? ` at ${latestStatusMoment.time}` : ''}` : 'Update time not recorded'}</span></div>
              </div>

              <section className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6">
                  <div><h4 className="text-sm font-extrabold text-slate-900">Ordered products</h4><p className="mt-1 text-[9px] text-slate-400">{items.length} separate item{items.length === 1 ? '' : 's'} from the saved order snapshot</p></div>
                  <span className="rounded-full bg-[#e4f1e7] px-3 py-1.5 text-[8px] font-extrabold text-[#397a4a]">{selectedOrder.itemsCount || items.reduce((sum, item) => sum + itemSnapshot(item).quantity, 0)} units</span>
                </div>
                {items.length ? (
                  <div className="touch-pan-x overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <div className="min-w-[820px]">
                      <div className="grid grid-cols-[minmax(260px,2fr)_120px_100px_130px_140px] gap-4 bg-[#f3f7f2] px-5 py-3 text-[8px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                        <span>Product</span><span>SKU / HSN</span><span>Quantity</span><span>Unit price / GST</span><span className="text-right">Item total</span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {items.map((item, index) => {
                          const snapshot = itemSnapshot(item)
                          return (
                            <article key={`${item.productId || item.productName || 'item'}-${item.variantId || ''}-${index}`} className="grid grid-cols-[minmax(260px,2fr)_120px_100px_130px_140px] items-center gap-4 px-5 py-4">
                              <div className="flex min-w-0 items-center gap-3">
                                {item.image ? <img src={item.image} alt={item.productName || 'Ordered product'} className="size-14 shrink-0 rounded-xl bg-slate-50 object-cover" /> : <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400"><ImageIcon size={18} /></span>}
                                <div className="min-w-0"><strong className="block text-[10px] leading-4 text-slate-900">{item.productName || 'Product snapshot'}</strong>{(item.variant || item.variantName || item.specification) && <span className="mt-1 block text-[8px] text-slate-400">{item.variant || item.variantName || item.specification}</span>}</div>
                              </div>
                              <div className="text-[8px] leading-4"><strong className="block break-all text-slate-700">{item.sku || '—'}</strong><span className="text-slate-400">HSN {item.hsnCode || '—'}</span></div>
                              <strong className="text-[10px] text-slate-800">{snapshot.quantity}</strong>
                              <div className="text-[9px]"><strong className="block text-slate-800">{formatAdminCurrency(snapshot.unitPrice)}</strong><span className="mt-1 block text-slate-400">GST {snapshot.gstRate}% · {formatAdminCurrency(snapshot.gst)}</span></div>
                              <strong className="text-right text-xs text-slate-950">{formatAdminCurrency(snapshot.itemTotal)}</strong>
                            </article>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : <div className="p-6"><EmptyState title="No item snapshots recorded" text="This historical order does not contain saved item details." /></div>}
              </section>

            </div>
          )
        })()}
      </Modal>

      <Modal
        open={Boolean(returnOrder)}
        onClose={() => setReturnOrder(null)}
        eyebrow="Return inventory decision"
        title={returnOrder ? `Return ${returnOrder.id}` : ''}
        maxWidth="max-w-lg"
      >
        {returnOrder && (
          <div className="space-y-4 p-5 sm:p-7">
            <p className="text-xs leading-6 text-slate-500">
              Choose whether the accepted return should go back into sellable stock or be recorded as damaged.
            </p>
            <button
              type="button"
              onClick={() => {
                updateOrderStatus(returnOrder, 'Returned', {
                  returnDisposition: 'restock',
                })
                setReturnOrder(null)
              }}
              className="flex w-full items-center gap-3 rounded-[20px] bg-[#e4f1e7] p-4 text-left text-[#397a4a] transition hover:bg-[#d5e9d9]"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-white"><RotateCcw size={17} /></span>
              <span><strong className="block text-xs">Restock returned items</strong><span className="mt-1 block text-[9px] text-slate-500">Add the returned quantity back to available inventory.</span></span>
            </button>
            <button
              type="button"
              onClick={() => {
                updateOrderStatus(returnOrder, 'Returned', {
                  returnDisposition: 'damaged',
                })
                setReturnOrder(null)
              }}
              className="flex w-full items-center gap-3 rounded-[20px] bg-red-50 p-4 text-left text-red-600 transition hover:bg-red-100"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-white"><PackageCheck size={17} /></span>
              <span><strong className="block text-xs">Damaged / Don't restock</strong><span className="mt-1 block text-[9px] text-slate-500">Record the return without adding it to sellable inventory.</span></span>
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
