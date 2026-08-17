import { useState } from 'react'
import {
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Eye,
  PackageCheck,
  Printer,
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

const statuses = [
  'All',
  'Pending',
  'Confirmed',
  'Processing',
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

export default function OrdersPage({
  orders = [],
  onUpdateOrderStatus,
  searchQuery = '',
}) {
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [returnOrder, setReturnOrder] = useState(null)
  const [copiedId, setCopiedId] = useState(null)
  const filtered = orders.filter(
    (order) =>
      (statusFilter === 'All' || order.status === statusFilter) &&
      (!searchQuery ||
        `${order.id} ${order.customer} ${order.email}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  )
  const pending = orders.filter((order) =>
    ['Pending', 'Processing'].includes(order.status),
  ).length
  const delivered = orders.filter(
    (order) => order.status === 'Delivered',
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
    if (selectedOrder?.id === order.id) {
      setSelectedOrder((current) => ({
        ...current,
        status,
        returnDisposition:
          options?.returnDisposition || current.returnDisposition,
      }))
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fulfillment centre"
        title={`${orders.length} customer orders`}
        description="Review payments, inspect purchased products, and keep every delivery moving through the fulfillment pipeline."
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
          value={pending}
          detail="Pending or processing"
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
          value="98.7%"
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
                : orders.filter((order) => order.status === status).length}
            </span>
          </button>
        ))}
      </div>
      {!filtered.length ? (
        <EmptyState title="No matching orders" />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {[
                    'Order',
                    'Customer',
                    'Date',
                    'Products',
                    'Total',
                    'Payment',
                    'Status',
                    'Action',
                  ].map((head) => (
                    <th
                      key={head}
                      className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Action' ? 'text-right' : ''}`}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((order) => (
                  <tr key={order.id} className="transition hover:bg-[#fafcf9]">
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
                            key={item.productName}
                            className="max-w-40 truncate rounded-full bg-slate-100 px-2 py-1 text-[7px] font-bold text-slate-600"
                          >
                            {item.productName} ×{item.qty}
                          </span>
                        ))}
                        {!order.items && (
                          <span className="text-[9px] text-slate-400">
                            {order.itemsCount || 1} product(s)
                          </span>
                        )}
                      </div>
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
                        value={order.status}
                        onChange={(status) => updateOrderStatus(order, status)}
                        options={statusOptions}
                        ariaLabel={`Update status for order ${order.id}`}
                        className="w-32"
                        menuWidth={176}
                        buttonClassName={`rounded-full px-3 py-2 text-[8px] font-extrabold ring-1 ring-inset ${statusTone[order.status] || statusTone.Pending}`}
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#17251c] px-3 text-[8px] font-extrabold text-white transition hover:bg-[#397a4a]"
                      >
                        <Eye size={12} /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        eyebrow="Invoice & fulfillment"
        title={selectedOrder ? `Order ${selectedOrder.id}` : ''}
        maxWidth="max-w-2xl"
      >
        {selectedOrder && (
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1.5 text-[8px] font-extrabold ring-1 ring-inset ${statusTone[selectedOrder.status] || statusTone.Pending}`}
                >
                  {selectedOrder.status}
                </span>
                <p className="mt-2 text-[10px] text-slate-500">
                  Placed on {selectedOrder.date} by {selectedOrder.customer}
                </p>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-10 items-center gap-2 rounded-full bg-white px-3 text-[9px] font-extrabold text-slate-600 shadow-sm"
              >
                <Printer size={13} /> Print slip
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoCard
                label="Customer"
                primary={selectedOrder.customer}
                secondary={selectedOrder.email}
              />
              <InfoCard
                label="Shipping & payment"
                primary="Express delivery"
                secondary={`${selectedOrder.paymentMethod || 'Online payment'} · Verified`}
              />
            </div>
            <section className="mt-5 rounded-[22px] bg-white p-4 shadow-sm">
              <h4 className="text-xs font-extrabold text-slate-900">
                Purchased products
              </h4>
              <div className="mt-3 divide-y divide-slate-100">
                {selectedOrder.items?.map((item) => (
                  <div
                    key={item.productName}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <div>
                      <strong className="text-[10px] text-slate-800">
                        {item.productName}
                      </strong>
                      <p className="mt-1 text-[8px] text-slate-400">
                        Quantity: {item.qty}
                      </p>
                    </div>
                    <strong className="shrink-0 text-[10px] text-[#397a4a]">
                      {item.price}
                    </strong>
                  </div>
                )) || (
                  <p className="py-4 text-[10px] text-slate-400">
                    {selectedOrder.itemsCount || 1} product package
                  </p>
                )}
              </div>
            </section>
            <div className="mt-5 flex items-center justify-between rounded-[22px] bg-[#dcebdd] p-4">
              <span className="text-xs font-bold text-[#253329]">
                Grand total
              </span>
              <strong className="text-xl text-[#253329]">
                {selectedOrder.total}
              </strong>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => updateOrderStatus(selectedOrder, 'Shipped')}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#17251c] text-[10px] font-extrabold text-white hover:bg-violet-700"
              >
                <Truck size={15} /> Mark shipped
              </button>
              <button
                type="button"
                onClick={() => updateOrderStatus(selectedOrder, 'Delivered')}
                className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#397a4a] text-[10px] font-extrabold text-white hover:bg-[#2f663d]"
              >
                <CheckCircle2 size={15} /> Mark delivered
              </button>
            </div>
          </div>
        )}
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

function InfoCard({ label, primary, secondary }) {
  return (
    <div className="rounded-[20px] bg-white p-4 shadow-sm">
      <p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <strong className="mt-2 block text-[10px] text-slate-800">
        {primary}
      </strong>
      <span className="mt-1 block text-[8px] text-slate-500">{secondary}</span>
    </div>
  )
}
