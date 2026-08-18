import { Bell, Menu, Search, X } from 'lucide-react'

const titles = {
  dashboard: ['Dashboard', 'Monitor your store performance'],
  products: ['Product catalog', 'Manage products and inventory'],
  inventory: ['Inventory management', 'Control stock and reservations'],
  payments: ['Payment management', 'Reconcile transactions and refunds'],
  returns: ['Return management', 'Review returns, pickups, and resolutions'],
  coupons: ['Coupon management', 'Configure discounts and eligibility'],
  orders: ['Order fulfillment', 'Track and process customer orders'],
  users: ['Customer accounts', 'Understand your growing audience'],
}

export default function AdminHeader({
  activeTab,
  admin,
  searchQuery,
  onSearch,
  onOpenSidebar,
}) {
  const [title, subtitle] = titles[activeTab] || titles.dashboard
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f8f5]/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1480px] items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white text-slate-600 shadow-sm lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
        <div className="hidden min-w-0 sm:block">
          <h1 className="truncate text-base font-extrabold text-slate-950">
            {title}
          </h1>
          <p className="text-[9px] font-semibold text-slate-400">{subtitle}</p>
        </div>
        <label className="relative ml-auto flex h-11 w-full max-w-md items-center rounded-full border border-slate-200 bg-white shadow-sm transition focus-within:border-[#75916f] focus-within:ring-4 focus-within:ring-[#75916f]/10">
          <Search size={15} className="absolute left-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="size-full bg-transparent pl-10 pr-10 text-xs outline-none placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearch('')}
              className="absolute right-3 grid size-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
            >
              <X size={13} />
            </button>
          )}
        </label>
        <button
          type="button"
          className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white text-slate-600 shadow-sm transition hover:text-[#ff5c35]"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full border-2 border-white bg-[#ff5c35]" />
        </button>
        <div className="hidden items-center gap-2.5 rounded-full bg-white py-1.5 pl-1.5 pr-3 shadow-sm md:flex">
          <span className="grid size-8 place-items-center rounded-full bg-[#397a4a] text-[9px] font-extrabold text-white">
            PA
          </span>
          <span>
            <strong className="block text-[10px] text-slate-800">
              {admin.name}
            </strong>
            <span className="block text-[8px] text-slate-400">
              Administrator
            </span>
          </span>
        </div>
      </div>
    </header>
  )
}
