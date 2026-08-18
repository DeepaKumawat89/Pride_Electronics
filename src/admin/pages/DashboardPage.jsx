import {
  AlertTriangle,
  ArrowUpRight,
  Clock3,
  IndianRupee,
  Package,
  Plus,
  ShoppingBag,
  TrendingUp,
  Users,
} from 'lucide-react'
import { EmptyState, PageHeader, StatCard } from '../components/ui/AdminUI'
import {
  formatAdminCurrency,
  getInitials,
  moneyValue,
  statusTone,
} from '../utils/adminFormatters'
import { getAvailableStock } from '../utils/inventory'

export default function DashboardPage({
  products = [],
  orders = [],
  customers = [],
  onNavigate,
}) {
  const totalRevenue = orders
    .filter((order) => !['Cancelled', 'Refunded'].includes(order.status))
    .reduce((sum, order) => sum + moneyValue(order.total), 0)
  const lowStock = products.filter(
    (product) =>
      getAvailableStock(product) <= Number(product.lowStockThreshold ?? 10),
  )
  const pending = orders.filter((order) =>
    ['Pending', 'Processing'].includes(order.status),
  ).length
  const categories = new Set(products.map((product) => product.category)).size
  const now = new Date()
  const chartMonths = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1)
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-IN', { month: 'short' }),
    }
  })
  const chartValues = chartMonths.map(({ key }) =>
    orders
      .filter(
        (order) =>
          String(order.date || '').slice(0, 7) === key &&
          !['Cancelled', 'Refunded'].includes(order.status),
      )
      .reduce((sum, order) => sum + moneyValue(order.total), 0),
  )
  const chartMaximum = Math.max(...chartValues, 1)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Control centre"
        title="Your store at a glance"
        description="Track revenue, inventory health, customer activity, and fulfillment from one focused dashboard."
        actions={
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="flex h-11 items-center gap-2 rounded-full bg-[#17251c] px-4 text-[10px] font-extrabold text-white transition hover:bg-[#397a4a]"
          >
            <Plus size={15} /> Add product
          </button>
        }
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={IndianRupee}
          label="Total revenue"
          value={formatAdminCurrency(totalRevenue)}
          detail="Excludes cancelled and refunded"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total orders"
          value={orders.length}
          detail={`${pending} need attention`}
          tone="orange"
        />
        <StatCard
          icon={Package}
          label="Products"
          value={products.length}
          detail={`${categories} active categories`}
          tone="violet"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={customers.length}
          detail="Registered accounts"
          tone="amber"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.55fr)]">
        <article className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#397a4a]">
                Performance overview
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-slate-950">
                Revenue momentum
              </h3>
            </div>
            <span className="w-fit rounded-full bg-[#e4f1e7] px-3 py-2 text-[9px] font-extrabold text-[#397a4a]">
              Last 12 months
            </span>
          </div>
          {orders.length ? <div className="p-5 sm:p-7">
            <div className="flex h-56 items-end gap-2 rounded-[22px] bg-gradient-to-b from-[#f4f8f4] to-white px-3 pb-3 pt-6 sm:gap-3 sm:px-5">
              {chartValues.map((value, index) => (
                <div key={index} className="group flex h-full flex-1 items-end">
                  <div
                    className="relative w-full rounded-t-xl bg-[#9bcaa6] transition group-hover:bg-[#397a4a]"
                    style={{ height: `${(value / chartMaximum) * 100}%` }}
                  >
                    <span className="absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-950 px-1.5 py-1 text-[7px] font-bold text-white group-hover:block">
                      {formatAdminCurrency(value)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-between text-[8px] font-bold uppercase text-slate-400">
              {[0, 3, 6, 9, 11].map((index) => <span key={chartMonths[index].key}>{chartMonths[index].label}</span>)}
            </div>
          </div> : <div className="p-5 sm:p-7"><EmptyState title="No sales data yet" text="Revenue activity will appear after the first order is placed." /></div>}
        </article>

        <article className="rounded-[28px] bg-[#17251c] p-5 text-white shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#9bcaa6]">
                Store ranking
              </p>
              <h3 className="mt-1 text-lg font-extrabold">Top products</h3>
            </div>
            <TrendingUp size={19} className="text-[#ff7b59]" />
          </div>
          <div className="mt-5 space-y-2">
            {products.slice(0, 4).map((product, index) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onNavigate('products')}
                className="flex w-full items-center gap-3 rounded-[18px] bg-white/6 p-2.5 text-left transition hover:bg-white/10"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/10 text-[9px] font-extrabold text-[#9bcaa6]">
                  {index + 1}
                </span>
                <img
                  src={product.image}
                  alt=""
                  className="size-11 shrink-0 rounded-xl object-cover"
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[10px]">
                    {product.name}
                  </strong>
                  <span className="mt-0.5 block text-[8px] text-white/40">
                    {product.category}
                  </span>
                </span>
                <strong className="text-[9px] text-white/70">
                  {product.price}
                </strong>
              </button>
            ))}
            {!products.length && <p className="rounded-2xl border border-white/10 px-4 py-8 text-center text-[9px] font-bold text-white/45">No products in the catalog yet.</p>}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white/10 py-3 text-[9px] font-extrabold text-white/70 hover:bg-white/8"
          >
            View catalog <ArrowUpRight size={13} />
          </button>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <article className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.17em] text-[#ff5c35]">
                Latest activity
              </p>
              <h3 className="mt-1 text-lg font-extrabold text-slate-950">
                Recent orders
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-[9px] font-extrabold text-[#397a4a]"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 5).map((order) => (
              <button
                key={order.id}
                type="button"
                onClick={() => onNavigate('orders')}
                className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 text-left transition hover:bg-[#f8faf7] sm:px-6"
              >
                <span className="grid size-10 place-items-center rounded-full bg-[#e4f1e7] text-[9px] font-extrabold text-[#397a4a]">
                  {getInitials(order.customer)}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-[10px] text-slate-900">
                    {order.customer}
                  </strong>
                  <span className="mt-1 block text-[8px] font-semibold text-slate-400">
                    {order.id} · {order.date}
                  </span>
                </span>
                <span className="text-right">
                  <strong className="block text-[10px] text-slate-900">
                    {order.total}
                  </strong>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2 py-1 text-[7px] font-extrabold ring-1 ring-inset ${statusTone[order.status] || statusTone.Pending}`}
                  >
                    {order.status}
                  </span>
                </span>
              </button>
            ))}
            {!orders.length && <div className="p-5 sm:p-6"><EmptyState title="No orders yet" text="New customer orders will appear here." /></div>}
          </div>
        </article>

        <div className="space-y-5">
          <article className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                <AlertTriangle size={18} />
              </span>
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wider text-amber-700">
                  Inventory watch
                </p>
                <h3 className="text-base font-extrabold text-slate-950">
                  Low-stock alerts
                </h3>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {lowStock.slice(0, 4).map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onNavigate('products')}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[#fafbfa] p-2.5 text-left"
                >
                  <img
                    src={product.image}
                    alt=""
                    className="size-10 rounded-xl object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-[9px] text-slate-800">
                      {product.name}
                    </strong>
                    <span className="text-[8px] text-slate-400">
                      {product.category}
                    </span>
                  </span>
                  <b className="text-[9px] text-red-600">
                    {getAvailableStock(product)} available
                  </b>
                </button>
              ))}
              {!lowStock.length && (
                <p className="rounded-2xl bg-emerald-50 p-4 text-center text-[9px] font-bold text-emerald-700">
                  Inventory levels look healthy.
                </p>
              )}
            </div>
          </article>
          <article className="rounded-[28px] bg-[#dcebdd] p-5">
            <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#397a4a]">
              Quick actions
            </p>
            <div className="mt-3 grid gap-2">
              <QuickAction
                icon={Plus}
                text="Add hardware"
                onClick={() => onNavigate('products')}
              />
              <QuickAction
                icon={Clock3}
                text={`Process ${pending} pending`}
                onClick={() => onNavigate('orders')}
              />
              <QuickAction
                icon={Users}
                text="View customers"
                onClick={() => onNavigate('users')}
              />
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

function QuickAction({ icon: Icon, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl bg-white/70 p-3 text-left text-[10px] font-extrabold text-[#253329] transition hover:bg-white"
    >
      <span className="grid size-8 place-items-center rounded-xl bg-white text-[#397a4a]">
        <Icon size={14} />
      </span>
      <span className="flex-1">{text}</span>
      <ArrowUpRight size={13} />
    </button>
  )
}
