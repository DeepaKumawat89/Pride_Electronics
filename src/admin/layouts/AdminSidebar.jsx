import {
  LayoutDashboard,
  LogOut,
  Package,
  CreditCard,
  RotateCcw,
  TicketPercent,
  ShoppingBag,
  Users,
  Warehouse,
  Images,
  ReceiptText,
  Settings,
  MessageSquareText,
  Tags,
  X,
} from 'lucide-react'
import prideCircuitLogo from '../../../images/Prism_Circuit_Tech_Logo-removebg-preview.png'

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
    id: 'categories',
    label: 'Categories',
    caption: 'Catalog structure',
    icon: Tags,
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
    id: 'coupons',
    label: 'Coupons',
    caption: 'Discount rules',
    icon: TicketPercent,
  },
  {
    id: 'users',
    label: 'Customers',
    caption: 'Accounts & activity',
    icon: Users,
  },
  {
    id: 'reviews',
    label: 'Reviews',
    caption: 'Customer moderation',
    icon: MessageSquareText,
  },
  {
    id: 'offers',
    label: 'Offers & banners',
    caption: 'Storefront promotions',
    icon: Images,
  },
  {
    id: 'tax-invoice',
    label: 'Tax & invoice',
    caption: 'GST & business details',
    icon: ReceiptText,
  },
  {
    id: 'settings',
    label: 'Settings',
    caption: 'Store & access controls',
    icon: Settings,
  },
]

export default function AdminSidebar({
  activeTab,
  onSelectTab,
  onLogout,
  isOpen,
  onClose,
  permissions = ['*'],
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
        <div className="relative flex min-h-[104px] items-center px-5 py-5">
          <div className="mr-11 flex min-w-0 flex-1 items-center justify-center overflow-hidden px-1 py-2.5 lg:mr-0">
            <img
              src={prideCircuitLogo}
              alt="Pride Circuit"
              className="h-auto max-h-14 w-full object-contain object-center"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 grid size-9 place-items-center rounded-full bg-white/10 text-white/70 lg:hidden"
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
          {navItems.filter((item) => permissions.includes('*') || permissions.includes(item.id)).map((item) => {
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
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-xs font-bold text-red-200 transition hover:bg-red-400/10 hover:text-red-100"
          >
            <LogOut size={17} /> Log Out
          </button>
        </div>
      </aside>
    </>
  )
}
