import { useState } from 'react'
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
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
import { getInitials, statusTone } from '../utils/adminFormatters'
import { getPaymentStatus } from '../utils/payments'
import { getOrderDeliverySnapshot } from '../../utils/orderDelivery'

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

export default function OrdersPage({
  orders = [],
  onUpdateOrderStatus,
  searchQuery = '',
}) {
  const [statusFilter, setStatusFilter] = useState('All')
  const [returnOrder, setReturnOrder] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const filtered = orders.filter(
    (order) =>
      (statusFilter === 'All' || statusForAdmin(order.status) === statusFilter) &&
      (!searchQuery ||
        `${order.id} ${order.customer} ${order.email} ${order.trackingId || ''}`
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
  const verifiedPayments = orders.filter(
    (order) => getPaymentStatus(order) === 'Successful',
  ).length
  const paymentRate = orders.length
    ? `${((verifiedPayments / orders.length) * 100).toFixed(1)}%`
    : '0%'

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
        description="Review payments and keep every delivery moving through the fulfillment pipeline."
      />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <StatCard
          icon={CreditCard}
          label="Payment rate"
          value={paymentRate}
          detail="Successfully verified"
          tone="violet"
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
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {[
                    'Order',
                    'Customer',
                    'Date',
                    'Products',
                    'Delivery',
                    'Total',
                    'Payment',
                    'Status',
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
                  return <tr key={order.id} className="transition hover:bg-[#fafcf9]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <strong className="text-[10px] text-[#397a4a]">
                          {order.id}
                        </strong>
                        <button
                          type="button"
                          onClick={() => copy(order.id)}
                          className="text-slate-400 hover:text-[#397a4a]"
                        >
                          {copiedId === order.id ? (
                            <Check size={12} />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
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
                      {order.date}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex max-w-56 flex-wrap gap-1">
                        {order.items?.slice(0, 2).map((item) => (
                          <span
                            key={`${item.productId || item.productName}-${item.variantId || ''}`}
                            className="max-w-40 truncate rounded-full bg-slate-100 px-2 py-1 text-[7px] font-bold text-slate-600"
                          >
                            {item.productName}{item.variant ? ` · ${item.variant}` : ''} ×{item.qty}
                          </span>
                        ))}
                        {!order.items && (
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
                      <span className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500">
                        <CreditCard size={12} className="text-violet-600" />
                        {order.paymentMethod || 'Online payment'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <SelectMenu
                        value={statusForAdmin(order.status)}
                        onChange={(status) => updateOrderStatus(order, status)}
                        options={statusOptions}
                        ariaLabel={`Status for order ${order.id}`}
                        className="w-32"
                        menuWidth={176}
                        buttonClassName={`rounded-full px-3 py-2 text-[8px] font-extrabold ring-1 ring-inset ${statusTone[statusForAdmin(order.status)] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}
                      />
                    </td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
