import {
  LayoutDashboard,
  LogOut,
  Package,
  CreditCard,
  RotateCcw,
  ShoppingBag,
  Store,
  Users,
  Warehouse,
  X,
  Zap,
} from 'lucide-react'

const navItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    caption: 'Store overview',
    icon: LayoutDashboard,
  },
  {
    id: 'products',
    label: 'Products',
    caption: 'Catalog & inventory',
    icon: Package,
  },
  {
    id: 'orders',
    label: 'Orders',
    caption: 'Sales & fulfillment',
    icon: ShoppingBag,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    caption: 'Stock & reservations',
    icon: Warehouse,
  },
  {
    id: 'payments',
    label: 'Payments',
    caption: 'Transactions & refunds',
    icon: CreditCard,
  },
  {
    id: 'returns',
    label: 'Returns',
    caption: 'Review & resolution',
    icon: RotateCcw,
  },
  {
    id: 'users',
    label: 'Customers',
    caption: 'Accounts & activity',
    icon: Users,
  },
]

export default function AdminSidebar({
  activeTab,
  onSelectTab,
  onLogout,
  onSwitchToStore,
  isOpen,
  onClose,
}) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close navigation"
        className={`fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm transition lg:hidden ${isOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-[60] flex w-[278px] flex-col overflow-hidden bg-[#17251c] text-white shadow-2xl transition-transform duration-300 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0 lg:rounded-r-[30px] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#9bcaa6]/15 blur-3xl" />
        <div className="relative flex items-center gap-3 px-5 py-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#ff5c35] text-white shadow-lg shadow-[#ff5c35]/20">
            <Zap size={19} fill="currentColor" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold">Pride Electronics</p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[#9bcaa6]">
              Admin Console
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-white/10 text-white/70 lg:hidden"
          >
            <X size={17} />
          </button>
        </div>

        <nav
          className="relative flex-1 space-y-2 overflow-y-auto px-4 py-3"
          aria-label="Admin sections"
        >
          <p className="px-3 pb-2 text-[8px] font-extrabold uppercase tracking-[0.2em] text-white/35">
            Management
          </p>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`group flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition ${active ? 'bg-white text-slate-950 shadow-xl' : 'text-white/65 hover:bg-white/8 hover:text-white'}`}
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-2xl transition ${active ? 'bg-[#e4f1e7] text-[#397a4a]' : 'bg-white/8 text-[#9bcaa6] group-hover:bg-white/12'}`}
                >
                  <Icon size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-xs">{item.label}</strong>
                  <span
                    className={`mt-0.5 block text-[8px] font-semibold ${active ? 'text-slate-400' : 'text-white/35'}`}
                  >
                    {item.caption}
                  </span>
                </span>
                {active && (
                  <span className="size-1.5 rounded-full bg-[#ff5c35]" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="relative border-t border-white/10 p-4">
          <button
            type="button"
            onClick={onSwitchToStore}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-xs font-bold text-white/65 transition hover:bg-white/8 hover:text-white"
          >
            <Store size={17} className="text-[#9bcaa6]" /> Customer storefront
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-xs font-bold text-red-200 transition hover:bg-red-400/10 hover:text-red-100"
          >
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
    </>
  )
}
