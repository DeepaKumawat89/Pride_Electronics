import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  Heart,
  LogOut,
  MapPin,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Star,
  TicketPercent,
  Trash2,
  Truck,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import SelectMenu from '../../../components/ui/SelectMenu'
import { useAnchoredPopover } from '../../../hooks/useAnchoredPopover'
import { getInitials } from '../../../utils/text'
import { formatCurrency, parsePrice } from '../../utils/currency'
import { calculateCartPricing } from '../../utils/cart'
import { accountMenuItems } from './accountMenuItems'
import OrderDetailsView from './OrderDetailsView'

const genderOptions = [
  { value: '', label: 'Select gender' },
  { value: 'Female', label: 'Female' },
  { value: 'Male', label: 'Male' },
  { value: 'Non-binary', label: 'Non-binary' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
]
const orderDateOptions = [
  { value: 'all', label: 'All dates' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 3 months' },
  { value: '365', label: 'Last year' },
]
const addressTypeOptions = ['Shipping', 'Billing']
const addressLabelOptions = ['Home', 'Work', 'Other']
const sectionMeta = {
  profile: ['My Profile', 'Manage your personal information', UserRound],
  wishlist: ['Wishlist', 'Your saved products, all in one place', Heart],
  orders: ['Orders', 'Find, track, and review your purchases', Package],
  cart: ['Your Cart', 'Review items and savings before checkout', ShoppingBag],
  address: ['Saved Address', 'Your preferred delivery location', MapPin],
  payment: ['Saved Cards & Wallet', 'Your saved payment preferences', CreditCard],
  coupons: ['Coupons', 'Offers available for your next order', TicketPercent],
}

const couponList = [
  {
    code: 'PRIDE500',
    title: '₹500 off your first order',
    detail: 'Minimum purchase of ₹2,499',
    tone: 'bg-[#fff1c9] text-[#765400]',
  },
  {
    code: 'FREESHIP',
    title: 'Free express delivery',
    detail: 'Valid on all Pride+ member orders',
    tone: 'bg-[#e4f1e7] text-[#366643]',
  },
  {
    code: 'AUDIO15',
    title: '15% off audio products',
    detail: 'Maximum discount ₹1,500',
    tone: 'bg-[#ffe9e2] text-[#b33b20]',
  },
]

const fieldClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-[#75916f] focus:ring-4 focus:ring-[#9bcaa6]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'
const orderFilterNow = Date.now()

function Avatar({ user, size = 'size-12', textSize = 'text-sm' }) {
  return user.photo ? (
    <img
      src={user.photo}
      alt={`${user.name}'s profile`}
      className={`${size} shrink-0 rounded-full object-cover ring-2 ring-white/70`}
    />
  ) : (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-[#253329] ${textSize} font-extrabold text-white ring-2 ring-white/70`}
    >
      {getInitials(user.name)}
    </span>
  )
}

function HeaderSearch({ value, onChange, placeholder, ariaLabel }) {
  return (
    <div className="relative block min-w-0 flex-1 sm:w-56 sm:flex-none lg:w-64">
      <Search
        size={17}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label={`Clear ${ariaLabel.toLowerCase()}`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}


function OrderFilter({
  dateRange,
  onDateRangeChange,
  status,
  onStatusChange,
  statuses,
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const activeFilterCount =
    Number(dateRange !== 'all') + Number(status !== 'All')

  const position = useAnchoredPopover({
    open,
    setOpen,
    triggerRef,
    popoverRef: menuRef,
    fixedWidth: 360,
    constrainWidth: true,
    align: 'right',
    panelHeight: 410,
    flipVertical: true,
  })

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative inline-flex h-11 w-36 shrink-0 items-center justify-center gap-2 rounded-full border bg-white px-4 text-[11px] font-extrabold transition ${open || activeFilterCount ? 'border-[#ff5c35] text-[#d84220] ring-4 ring-[#ff5c35]/10' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
      >
        <SlidersHorizontal size={15} />
        <span>Filter</span>
        {activeFilterCount > 0 && (
          <span className="grid size-5 place-items-center rounded-full bg-[#ff5c35] text-[9px] text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="dialog"
            aria-label="Filter orders"
            style={position}
            className="fixed z-[100] flex h-[410px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.2)]"
          >
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Date
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {orderDateOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onDateRangeChange(option.value)}
                    className={`rounded-xl px-3 py-2.5 text-left text-[10px] font-bold transition ${dateRange === option.value ? 'bg-[#253329] text-white' : 'bg-[#f4f7ef] text-slate-600 hover:bg-[#e9efe4]'}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Order status
              </p>
              <div className="mt-2 max-h-32 overflow-y-auto pr-1">
                <div className="flex flex-wrap gap-2">
                {statuses.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onStatusChange(item)}
                    className={`rounded-full px-3 py-2 text-[9px] font-extrabold transition ${status === item ? 'bg-[#253329] text-white' : 'bg-[#f4f7ef] text-slate-600 hover:bg-[#e9efe4]'}`}
                  >
                    {item}
                  </button>
                ))}
                </div>
              </div>
            </div>

            <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                type="button"
                disabled={!activeFilterCount}
                onClick={() => {
                  onDateRangeChange('all')
                  onStatusChange('All')
                }}
                className="text-[9px] font-extrabold text-[#ff5c35] disabled:opacity-35"
              >
                Clear filters
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-[#253329] px-4 py-2 text-[9px] font-extrabold text-white"
              >
                Done
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

export default function AccountPanel({
  section,
  user,
  wishlistProducts,
  orders,
  cartItems,
  savedCartItems,
  cartIssues,
  savedAddresses,
  savedPayments,
  onSectionChange,
  onClose,
  onUpdateUser,
  onRemoveWishlist,
  onViewProduct,
  onAddToCart,
  onChangeQuantity,
  onRemoveCartItem,
  onSaveCartItem,
  onMoveSavedItemToCart,
  onRemoveSavedItem,
  onDismissUnavailableCartItems,
  onCheckout,
  onLogout,
  onSaveAddress,
  onDeleteAddress,
  onSetDefaultAddress,
  onSavePayment,
  onDeletePayment,
  onSetDefaultPayment,
}) {
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [contentScrolled, setContentScrolled] = useState(false)
  const [wishlistQuery, setWishlistQuery] = useState('')
  const [orderQuery, setOrderQuery] = useState('')
  const [orderDateRange, setOrderDateRange] = useState('all')
  const [orderStatus, setOrderStatus] = useState('All')
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false)
  const contentViewportRef = useRef(null)
  const contentRef = useRef(null)
  const orderStatuses = useMemo(
    () => ['All', ...new Set(orders.map((order) => order.status))],
    [orders],
  )

  useEffect(() => {
    if (!section) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => {
      if (event.key !== 'Escape') return
      setOrderDetailsOpen(false)
      onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [section, onClose])

  useEffect(() => {
    const viewport = contentViewportRef.current
    const content = contentRef.current
    if (!section || !viewport) return undefined

    viewport.scrollTop = 0
    setContentScrolled(false)

    const updateScrolledState = () => {
      const hasMoreContent =
        viewport.scrollHeight > viewport.clientHeight + 1
      setContentScrolled(hasMoreContent && viewport.scrollTop > 0)
    }

    updateScrolledState()

    if (typeof ResizeObserver === 'undefined') return undefined

    const resizeObserver = new ResizeObserver(updateScrolledState)
    resizeObserver.observe(viewport)
    if (content) resizeObserver.observe(content)

    return () => resizeObserver.disconnect()
  }, [section])

  if (!section) return null
  const [title, subtitle, SectionIcon] = sectionMeta[section]

  return (
    <div className="fixed inset-0 z-50 isolate overflow-hidden bg-[#dcebdd]">
      <div className="pointer-events-none absolute -right-32 -top-48 -z-10 size-[600px] rounded-full bg-[#9bcaa6]/35 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[62%] bg-gradient-to-t from-[#aacfb3]/45 to-transparent" />

      <div className="relative z-10 flex h-full flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:flex-row md:gap-5 md:p-5 lg:gap-7 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
        <AccountNavigation
          section={section}
          user={user}
          onSectionChange={(nextSection) => {
            setOrderDetailsOpen(false)
            onSectionChange(nextSection)
          }}
          onClose={() => {
            setOrderDetailsOpen(false)
            onClose()
          }}
          onLogout={() => setLogoutOpen(true)}
        />

        <main className="min-h-0 min-w-0 flex-1">
          <div className="flex h-full flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_24px_70px_rgba(40,68,48,0.14)] md:rounded-[30px]">
            {!(section === 'orders' && orderDetailsOpen) && (
              <header
                className={`flex shrink-0 flex-wrap items-center gap-3 border-b px-5 py-4 transition-colors duration-300 sm:px-7 sm:py-5 lg:px-9 ${contentScrolled ? 'border-[#dce7d5] bg-[#eef4e8]' : 'border-slate-100 bg-white'}`}
              >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#eff3e7] text-[#536a50]">
                  <SectionIcon size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
                    {title}
                  </h1>
                  <p className="truncate text-[10px] text-slate-400 sm:text-[11px]">
                    {subtitle}
                  </p>
                </span>
              </div>

              {section === 'wishlist' && (
                <div className="ml-auto flex w-full min-w-0 justify-end sm:w-auto">
                  <HeaderSearch
                    value={wishlistQuery}
                    onChange={setWishlistQuery}
                    placeholder="Search wishlist"
                    ariaLabel="Search wishlist"
                  />
                </div>
              )}

              {section === 'orders' && (
                <div className="ml-auto flex w-full min-w-0 gap-2 sm:w-auto">
                  <HeaderSearch
                    value={orderQuery}
                    onChange={setOrderQuery}
                    placeholder="Search orders"
                    ariaLabel="Search orders"
                  />
                  <OrderFilter
                    dateRange={orderDateRange}
                    onDateRangeChange={setOrderDateRange}
                    status={orderStatus}
                    onStatusChange={setOrderStatus}
                    statuses={orderStatuses}
                  />
                </div>
              )}
              </header>
            )}

            <div
              ref={contentViewportRef}
              onScroll={(event) => {
                const viewport = event.currentTarget
                const hasMoreContent =
                  viewport.scrollHeight > viewport.clientHeight + 1
                setContentScrolled(hasMoreContent && viewport.scrollTop > 0)
              }}
              className="flex-1 overflow-y-auto bg-white p-5 sm:p-7 lg:p-9"
            >
              <div ref={contentRef}>
                {section === 'profile' && (
                  <ProfileSection user={user} onUpdateUser={onUpdateUser} />
                )}
                {section === 'wishlist' && (
                  <WishlistSection
                    products={wishlistProducts}
                    query={wishlistQuery}
                    onRemove={onRemoveWishlist}
                    onView={onViewProduct}
                    onAdd={onAddToCart}
                  />
                )}
                {section === 'orders' && (
                  <OrdersSection
                    orders={orders}
                    user={user}
                    savedAddresses={savedAddresses}
                    query={orderQuery}
                    onQueryChange={setOrderQuery}
                    dateRange={orderDateRange}
                    onDateRangeChange={setOrderDateRange}
                    status={orderStatus}
                    onStatusChange={setOrderStatus}
                    onNavigate={() =>
                      contentViewportRef.current?.scrollTo({ top: 0 })
                    }
                    onDetailsChange={setOrderDetailsOpen}
                  />
                )}
                {section === 'cart' && (
                  <CartSection
                    items={cartItems}
                    savedItems={savedCartItems}
                    issues={cartIssues}
                    onChangeQuantity={onChangeQuantity}
                    onRemove={onRemoveCartItem}
                    onSaveForLater={onSaveCartItem}
                    onMoveToCart={onMoveSavedItemToCart}
                    onRemoveSaved={onRemoveSavedItem}
                    onDismissUnavailable={onDismissUnavailableCartItems}
                    onCheckout={onCheckout}
                  />
                )}
                {section === 'address' && (
                  <AddressSection
                    addresses={savedAddresses}
                    user={user}
                    onSave={onSaveAddress}
                    onDelete={onDeleteAddress}
                    onSetDefault={onSetDefaultAddress}
                  />
                )}
                {section === 'payment' && (
                  <PaymentSection
                    user={user}
                    payments={savedPayments}
                    onSave={onSavePayment}
                    onDelete={onDeletePayment}
                    onSetDefault={onSetDefaultPayment}
                  />
                )}
                {section === 'coupons' && <CouponsSection />}
              </div>
            </div>
          </div>
        </main>
      </div>

      {logoutOpen && (
        <LogoutConfirmation
          onCancel={() => setLogoutOpen(false)}
          onConfirm={onLogout}
        />
      )}
    </div>
  )
}

function AccountNavigation({
  section,
  user,
  onSectionChange,
  onClose,
  onLogout,
}) {
  return (
    <aside className="shrink-0 rounded-[24px] bg-white/30 shadow-[0_16px_45px_rgba(40,68,48,0.08)] backdrop-blur-md md:w-64 md:rounded-[28px] lg:w-72">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4 md:h-20 md:px-5">
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white/80 text-[#253329] shadow-sm transition hover:-translate-x-0.5 hover:bg-white"
          aria-label="Back to store"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#5d705e]">
            Your account
          </p>
          <p className="truncate text-sm font-extrabold text-[#253329]">
            {user.name}
          </p>
        </div>
      </div>
      <div className="hidden px-4 pb-5 md:block lg:px-5">
        <div className="mb-5 flex items-center gap-3 rounded-2xl bg-white/55 p-3 shadow-sm">
          <Avatar user={user} size="size-10" textSize="text-xs" />
          <span className="min-w-0">
            <strong className="block truncate text-xs text-[#253329]">
              {user.name}
            </strong>
            <span className="mt-0.5 block truncate text-[9px] text-[#5d705e]">
              {user.email}
            </span>
          </span>
        </div>
        <nav className="grid gap-1.5">
          {accountMenuItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSectionChange(id)}
              className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-bold transition ${section === id ? 'bg-[#253329] text-white shadow-md' : 'text-[#425443] hover:bg-white/65 hover:shadow-sm'}`}
            >
              <Icon
                size={16}
                className={
                  section === id
                    ? 'text-[#ffb000]'
                    : 'text-[#647765] transition group-hover:text-[#ff5c35]'
                }
              />
              <span className="flex-1">{label}</span>
              {section === id && <ChevronRight size={14} />}
            </button>
          ))}
          <button
            type="button"
            onClick={onLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-bold text-red-600 transition hover:bg-red-50/70"
          >
            <LogOut size={16} />
            Logout
          </button>
        </nav>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-3 pb-3 sm:px-4 md:hidden">
        {accountMenuItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSectionChange(id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 text-[10px] font-extrabold ${section === id ? 'bg-[#253329] text-white' : 'bg-white/55 text-[#425443]'}`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={onLogout}
          className="flex shrink-0 items-center gap-2 rounded-full bg-red-50/70 px-3.5 py-2.5 text-[10px] font-extrabold text-red-600"
        >
          <LogOut size={14} />
          Logout
        </button>
      </nav>
    </aside>
  )
}

function ProfileSection({ user, onUpdateUser }) {
  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    mobile: user.mobile || '',
    dob: user.dob || '',
    gender: user.gender || '',
  })
  const fileRef = useRef(null)

  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setError('Choose a JPG, PNG, or WebP image smaller than 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      onUpdateUser({ ...user, photo: reader.result })
      setError('')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    reader.readAsDataURL(file)
  }

  const saveProfile = (event) => {
    event.preventDefault()
    onUpdateUser({ ...user, ...form })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="relative isolate overflow-hidden rounded-[28px] bg-[#e5ecd6] p-6 sm:p-8">
        <div className="absolute -right-14 -top-20 -z-10 size-64 rounded-full bg-[#9bcaa6]/35 blur-3xl" />
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="relative">
            <Avatar user={user} size="size-28" textSize="text-3xl" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full bg-[#ff5c35] text-white shadow-lg ring-4 ring-[#e5ecd6] transition hover:scale-105"
              aria-label="Change profile photo"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhoto}
              className="hidden"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="rounded-full bg-white/70 px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#4f7659]">
              Pride+ member
            </span>
            <h2 className="mt-3 truncate text-2xl font-extrabold text-[#253329] sm:text-3xl">
              {user.name}
            </h2>
            <p className="mt-1 truncate text-sm text-[#5d705e]">{user.email}</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-[10px] font-extrabold text-[#536a50] transition hover:bg-white"
            >
              <Camera size={13} />
              Change photo
            </button>
          </div>
          <button
            type="button"
            onClick={() => setEditing((current) => !current)}
            className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35]"
          >
            <Pencil size={14} />
            {editing ? 'Cancel editing' : 'Edit profile'}
          </button>
        </div>
      </div>
      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
      {saved && (
        <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
          <CheckCircle2 size={15} />
          Profile updated successfully.
        </p>
      )}
      <form
        onSubmit={saveProfile}
        className="rounded-[26px] border border-slate-100 bg-[#fafbf8] p-5 sm:p-7"
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold">Personal information</h3>
            <p className="mt-1 text-[10px] text-slate-400">
              Keep your details accurate for delivery and support.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input
              required
              disabled={!editing}
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              className={fieldClass}
            />
          </Field>
          <Field label="Email address">
            <input
              required
              disabled={!editing}
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              className={fieldClass}
            />
          </Field>
          <Field label="Mobile number">
            <input
              disabled={!editing}
              type="tel"
              placeholder="Add mobile number"
              value={form.mobile}
              onChange={(event) =>
                setForm({ ...form, mobile: event.target.value })
              }
              className={fieldClass}
            />
          </Field>
          <Field label="Date of birth">
            <input
              disabled={!editing}
              type="date"
              value={form.dob}
              onChange={(event) =>
                setForm({ ...form, dob: event.target.value })
              }
              className={fieldClass}
            />
          </Field>
          <Field label="Gender">
            <SelectMenu
              disabled={!editing}
              value={form.gender}
              onChange={(gender) => setForm({ ...form, gender })}
              options={genderOptions}
              ariaLabel="Gender"
              buttonClassName={fieldClass}
            />
          </Field>
        </div>
        {editing && (
          <div className="mt-6 flex justify-end">
            <button className="inline-flex items-center gap-2 rounded-full bg-[#253329] px-6 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35]">
              <Check size={14} />
              Save changes
            </button>
          </div>
        )}
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <span className="mb-2 block text-[9px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </span>
      {children}
    </div>
  )
}

function WishlistSection({ products, query, onRemove, onView, onAdd }) {
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return products

    return products.filter((product) =>
      `${product.name || ''} ${product.category || ''} ${product.badge || ''}`
        .toLowerCase()
        .includes(normalizedQuery),
    )
  }, [products, query])

  if (!products.length)
    return (
      <EmptyState
        icon={Heart}
        title="Your wishlist is empty"
        text="Tap the heart on a product to save it here."
      />
    )

  return (
    <div className="mx-auto max-w-6xl">
      {query && (
        <p
          className="mb-4 text-[10px] font-bold text-slate-400"
          aria-live="polite"
        >
          Showing{' '}
          <strong className="text-slate-700">{filteredProducts.length}</strong>{' '}
          of {products.length} saved items
        </p>
      )}

      {filteredProducts.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <article
              key={product.id}
              className="group flex min-w-0 flex-col overflow-hidden rounded-[26px] border border-slate-100 bg-[#fafbf8] shadow-[0_8px_28px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(40,68,48,0.14)]"
            >
            <button
              type="button"
              onClick={() => onView(product)}
              className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100 text-left"
            >
              <img
                src={product.image}
                alt={product.name}
                className="size-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/35 to-transparent" />
              <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-wider text-slate-700 backdrop-blur">
                {product.badge || product.category}
              </span>
              <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[9px] font-extrabold text-slate-800 shadow-lg transition sm:translate-y-2 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                <Eye size={12} />
                Quick details
              </span>
            </button>
            <div className="flex flex-1 flex-col p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-[#75916f]">
                  {product.category}
                </p>
                <span
                  className={`text-[8px] font-extrabold ${Number(product.stock) <= 0 ? 'text-red-600' : Number(product.stock) < 10 ? 'text-amber-600' : 'text-emerald-700'}`}
                >
                  {Number(product.stock) <= 0
                    ? 'Out of stock'
                    : Number(product.stock) < 10
                      ? `${product.stock} left`
                      : 'In stock'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onView(product)}
                className="mt-2 line-clamp-2 min-h-11 text-left text-sm font-extrabold leading-[1.4] text-slate-900 transition hover:text-[#ff5c35]"
              >
                {product.name}
              </button>
              <div className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-slate-500">
                <Star size={11} className="fill-[#ffb000] text-[#ffb000]" />
                <span className="text-slate-700">{product.rating || 'New'}</span>
                <span className="font-medium text-slate-400">
                  ({product.reviewsCount || 0} reviews)
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <strong className="text-base text-slate-950">
                  {formatCurrency(parsePrice(product.price))}
                </strong>
                {product.originalPrice && (
                  <span className="text-[10px] text-slate-400 line-through">
                    {formatCurrency(parsePrice(product.originalPrice))}
                  </span>
                )}
              </div>
              <div className="mt-auto flex gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => onRemove(product.id)}
                  className="grid size-11 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  <Trash2 size={15} />
                </button>
                <button
                  type="button"
                  disabled={Number(product.stock) <= 0}
                  onClick={() => onAdd(product)}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#253329] px-4 text-[10px] font-extrabold text-white transition hover:bg-[#ff5c35] disabled:cursor-not-allowed disabled:bg-slate-300"
                  aria-label={`Add ${product.name} to cart`}
                >
                  <ShoppingBag size={14} />
                  {Number(product.stock) <= 0 ? 'Out of stock' : 'Add to cart'}
                </button>
              </div>
            </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No matching wishlist items"
          text="Try searching by product name or category."
        />
      )}
    </div>
  )
}

function OrdersSection({
  orders,
  user,
  savedAddresses,
  query,
  onQueryChange,
  dateRange,
  onDateRangeChange,
  status,
  onStatusChange,
  onNavigate,
  onDetailsChange,
}) {
  const [selectedOrder, setSelectedOrder] = useState(null)
  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const matchesQuery =
          !query ||
          `${order.id} ${order.items?.map((item) => item.productName).join(' ')}`
            .toLowerCase()
            .includes(query.toLowerCase())
        const matchesStatus = status === 'All' || order.status === status
        const days = dateRange === 'all' ? Infinity : Number(dateRange)
        const matchesDate =
          days === Infinity ||
          orderFilterNow - new Date(order.date).getTime() <= days * 86400000
        return matchesQuery && matchesStatus && matchesDate
      }),
    [orders, query, status, dateRange],
  )

  if (selectedOrder) {
    return (
      <OrderDetailsView
        order={selectedOrder}
        user={user}
        address={
          selectedOrder.shippingAddress ||
          savedAddresses.find((item) => item.isDefault) ||
          savedAddresses[0]
        }
        onBack={() => {
          setSelectedOrder(null)
          onDetailsChange(false)
          onNavigate()
        }}
      />
    )
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400">
          Showing <strong className="text-slate-700">{filtered.length}</strong>{' '}
          of {orders.length} orders
        </p>
        {(query || status !== 'All' || dateRange !== 'all') && (
          <button
            type="button"
            onClick={() => {
              onQueryChange('')
              onStatusChange('All')
              onDateRangeChange('all')
            }}
            className="text-[9px] font-extrabold text-[#ff5c35]"
          >
            Clear all filters
          </button>
        )}
      </div>

      {filtered.length ? (
        <div className="space-y-4">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onSelect={() => {
                setSelectedOrder(order)
                onDetailsChange(true)
                onNavigate()
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="No matching orders"
          text="Try changing the search, status, or date filters."
        />
      )}
    </div>
  )
}

function OrderCard({ order, onSelect }) {
  const firstItem = order.items?.[0]
  const delivered = order.status === 'Delivered'
  const cancelled = order.status === 'Cancelled'

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
      aria-label={`Open details for order ${order.id}`}
      className="group block w-full cursor-pointer overflow-hidden rounded-[26px] border border-slate-100 bg-[#fafbf8] text-left shadow-[0_8px_24px_rgba(15,23,42,0.03)] transition duration-300 hover:-translate-y-0.5 hover:border-[#aacfb3]/60 hover:shadow-[0_18px_45px_rgba(40,68,48,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#9bcaa6]/35"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#eff3e7] text-[#536a50]">
            <Package size={16} />
          </span>
          <div>
            <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
              Order ID
            </p>
            <p className="mt-0.5 text-xs font-extrabold text-slate-900">
              {order.id}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={order.paymentStatus || 'Paid'} kind="payment" />
          <StatusBadge value={order.status} />
        </div>
      </div>
      <div className="grid gap-5 p-4 sm:grid-cols-[112px_minmax(0,1fr)_auto] sm:items-center sm:p-5">
        <div className="relative">
          <img
            src={firstItem?.image}
            alt={firstItem?.productName || 'Order product'}
            className="aspect-square w-full rounded-[20px] object-cover sm:size-28"
          />
          {order.items?.length > 1 && (
            <span className="absolute -bottom-2 -right-2 grid size-8 place-items-center rounded-full bg-[#253329] text-[9px] font-extrabold text-white ring-4 ring-[#fafbf8]">
              +{order.items.length - 1}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-extrabold leading-5 text-slate-900 sm:text-base">
            {firstItem?.productName}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-semibold text-slate-400">
            <span>
              Quantity:{' '}
              <strong className="text-slate-600">{firstItem?.qty}</strong>
            </span>
            <span>
              Price:{' '}
              <strong className="text-slate-600">{firstItem?.price}</strong>
            </span>
          </div>
          <div
            className={`mt-4 flex w-fit items-center gap-2 rounded-full px-3 py-2 text-[9px] font-bold ${cancelled ? 'bg-red-50 text-red-600' : delivered ? 'bg-emerald-50 text-emerald-700' : 'bg-[#fff1c9] text-[#765400]'}`}
          >
            <Truck size={13} />
            {cancelled
              ? 'Order cancelled'
              : delivered
                ? `Delivered on ${order.deliveryDate}`
                : `Expected by ${order.deliveryDate || 'being scheduled'}`}
          </div>
        </div>
        <div className="flex items-center justify-between gap-5 border-t border-slate-100 pt-4 sm:block sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 sm:text-right">
          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Total paid
            </p>
            <p className="mt-1 text-lg font-extrabold text-slate-950">
              {order.total}
            </p>
          </div>
          <ChevronRight
            size={18}
            className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#ff5c35] sm:ml-auto sm:mt-4"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-slate-100 bg-white/70 px-4 py-3 text-[9px] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span className="flex items-center gap-1.5">
          <CalendarDays size={12} />
          Ordered {order.date}
          {order.orderTime ? ` · ${order.orderTime}` : ''}
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-[#75916f]" />
          Protected purchase
        </span>
      </div>
    </article>
  )
}

function StatusBadge({ value, kind }) {
  const color =
    kind === 'payment'
      ? 'bg-emerald-50 text-emerald-700'
      : value === 'Delivered'
        ? 'bg-[#e4f1e7] text-[#366643]'
        : value === 'Cancelled'
          ? 'bg-red-50 text-red-600'
          : 'bg-amber-50 text-amber-700'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[8px] font-extrabold uppercase tracking-wider ${color}`}
    >
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {value}
    </span>
  )
}



function CartSection({
  items,
  savedItems = [],
  issues = {},
  onChangeQuantity,
  onRemove,
  onSaveForLater,
  onMoveToCart,
  onRemoveSaved,
  onDismissUnavailable,
  onCheckout,
}) {
  const [coupon, setCoupon] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [couponAttempted, setCouponAttempted] = useState(false)
  const pricing = useMemo(
    () => calculateCartPricing(items, appliedCoupon),
    [appliedCoupon, items],
  )
  const hasOutOfStockItems = items.some(
    ({ product }) => Number(product.stock) <= 0,
  )

  const applyCoupon = () => {
    setAppliedCoupon(coupon.trim().toUpperCase())
    setCouponAttempted(true)
  }

  if (!items.length)
    return (
      <div className="mx-auto max-w-6xl">
        {issues.removedProductCount > 0 && (
          <CartValidationNotice
            text={`${issues.removedProductCount} ${issues.removedProductCount === 1 ? 'product is' : 'products are'} no longer available and were removed from your cart.`}
            onDismiss={onDismissUnavailable}
          />
        )}
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          text="Items you add to your cart will appear here."
        />
        <SavedForLaterSection
          items={savedItems}
          onMoveToCart={onMoveToCart}
          onRemove={onRemoveSaved}
        />
      </div>
    )
  return (
    <div className="mx-auto max-w-6xl">
      {issues.removedProductCount > 0 && (
        <CartValidationNotice
          text={`${issues.removedProductCount} ${issues.removedProductCount === 1 ? 'product is' : 'products are'} no longer available and were removed from your cart.`}
          onDismiss={onDismissUnavailable}
        />
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-extrabold text-slate-700">
            {items.length} {items.length === 1 ? 'product' : 'products'}
          </p>
          <p className="text-[10px] font-semibold text-slate-400">
            Free delivery over ₹999
          </p>
        </div>
        <div className="space-y-3">
          {items.map(({ product, quantity, priceChanged, quantityAdjusted }) => (
            <article
              key={product.id}
              className="rounded-[22px] border border-slate-100 bg-[#fafbf8] p-3 transition hover:shadow-md sm:p-4"
            >
              <div className="flex gap-3 sm:gap-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="size-20 rounded-2xl object-cover sm:size-24"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                    {product.category}
                  </p>
                  <h3 className="mt-1 line-clamp-2 text-xs font-extrabold leading-5 sm:text-sm">
                    {product.name}
                  </h3>
                  <p className="mt-2 text-sm font-extrabold text-[#ff5c35]">
                    {formatCurrency(parsePrice(product.price))}
                  </p>
                  {(priceChanged || quantityAdjusted || Number(product.stock) <= 0) && (
                    <div className="mt-2 space-y-1 text-[8px] font-extrabold">
                      {priceChanged && <p className="text-[#397a4a]">Price updated to the latest catalog price</p>}
                      {quantityAdjusted && <p className="text-amber-700">Quantity adjusted to available stock</p>}
                      {Number(product.stock) <= 0 && <p className="text-red-600">Out of stock — remove or save this item for later</p>}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center rounded-full border border-slate-200 bg-white shadow-sm">
                      <button
                        type="button"
                        disabled={quantity <= 1}
                        onClick={() => onChangeQuantity(product.id, -1)}
                        className="grid size-8 place-items-center hover:text-[#ff5c35] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-xs font-bold">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        disabled={Number(product.stock) <= 0 || quantity >= Number(product.stock)}
                        onClick={() => onChangeQuantity(product.id, 1)}
                        className="grid size-8 place-items-center hover:text-[#ff5c35] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => onSaveForLater(product.id)} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 transition hover:text-[#397a4a]"><Bookmark size={13} /> Save for later</button>
                      <button type="button" onClick={() => onRemove(product.id)} className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 transition hover:text-red-500"><Trash2 size={13} /> Remove</button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[10px] text-slate-400">Item total</span>
                <strong className="text-sm">
                  {formatCurrency(parsePrice(product.price) * quantity)}
                </strong>
              </div>
            </article>
          ))}
        </div>
        </div>
        <aside className="h-fit rounded-[24px] bg-[#e5ecd6] p-5 xl:sticky xl:top-5">
        <h3 className="text-sm font-extrabold text-[#253329]">Order summary</h3>
        <div className="mt-5 rounded-2xl bg-white/60 p-3">
          <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#687963]">
            Have a coupon?
          </p>
          <div className="mt-2 flex gap-2">
            <input
              value={coupon}
              onChange={(event) => setCoupon(event.target.value)}
              placeholder="Enter code"
              className="h-10 min-w-0 flex-1 rounded-xl border border-white bg-white px-3 text-xs font-bold uppercase outline-none focus:border-[#75916f]"
            />
            <button
              type="button"
              onClick={applyCoupon}
              className="rounded-xl bg-[#253329] px-3 text-[10px] font-extrabold text-white"
            >
              Apply
            </button>
          </div>
          {couponAttempted && pricing.coupon.message && (
            <p
              className={`mt-2 text-[9px] font-semibold ${pricing.coupon.status === 'applied' ? 'text-emerald-700' : pricing.coupon.status === 'expired' ? 'text-red-600' : 'text-amber-700'}`}
            >
              {pricing.coupon.message}
            </p>
          )}
        </div>
        <div className="mt-5 space-y-3 text-xs text-[#5d705e]">
          <CartSummaryRow label="Subtotal" value={formatCurrency(pricing.mrpSubtotal)} />
          <CartSummaryRow
            label="Discount"
            value={`−${formatCurrency(pricing.productDiscount)}`}
            accent={pricing.productDiscount > 0}
          />
          <CartSummaryRow
            label="Coupon discount"
            value={`−${formatCurrency(pricing.couponDiscount)}`}
            accent={pricing.couponDiscount > 0}
          />
          <CartSummaryRow
            label="Shipping"
            value={pricing.shipping ? formatCurrency(pricing.shipping) : 'Free'}
            accent={!pricing.shipping}
          />
          <CartSummaryRow label="GST / Tax" value={`${formatCurrency(pricing.tax)} included`} />
        </div>
        <div className="my-5 h-px bg-[#253329]/10" />
        <div className="flex items-end justify-between">
          <span className="text-sm font-bold text-[#253329]">Final total</span>
          <strong className="text-xl text-[#253329]">
            {formatCurrency(pricing.total)}
          </strong>
        </div>
        <button
          type="button"
          disabled={hasOutOfStockItems}
          onClick={() => onCheckout({ couponCode: pricing.coupon.status === 'applied' ? appliedCoupon : '' })}
          className="mt-5 w-full rounded-full bg-[#253329] px-5 py-3.5 text-xs font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#ff5c35] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:hover:translate-y-0"
        >
          Proceed to Checkout
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-semibold text-[#687963]">
          <ShieldCheck size={12} />
          Secure encrypted checkout
        </p>
        </aside>
      </div>
      <SavedForLaterSection items={savedItems} onMoveToCart={onMoveToCart} onRemove={onRemoveSaved} />
    </div>
  )
}

function CartValidationNotice({ text, onDismiss }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] font-bold text-amber-800">
      <span>{text}</span>
      <button type="button" onClick={onDismiss} className="shrink-0 font-extrabold text-amber-900 underline underline-offset-2">Dismiss</button>
    </div>
  )
}

function SavedForLaterSection({ items, onMoveToCart, onRemove }) {
  if (!items.length) return null
  return (
    <section className="mt-7 border-t border-slate-100 pt-6">
      <h3 className="text-sm font-extrabold text-slate-800">Saved for later ({items.length})</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map(({ product }) => {
          const available = Number(product.stock) > 0
          return (
            <article key={product.id} className="flex items-center gap-3 rounded-[20px] border border-slate-100 bg-[#fafbf8] p-3">
              <img src={product.image} alt={product.name} className="size-16 shrink-0 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-extrabold text-slate-800">{product.name}</p>
                <p className="mt-1 text-[10px] font-bold text-[#ff5c35]">{formatCurrency(parsePrice(product.price))}</p>
                <p className={`mt-1 text-[8px] font-extrabold ${available ? 'text-emerald-700' : 'text-red-600'}`}>{available ? 'In stock' : 'Out of stock'}</p>
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" disabled={!available} onClick={() => onMoveToCart(product.id)} className="text-[8px] font-extrabold text-[#397a4a] disabled:cursor-not-allowed disabled:text-slate-300">Move to cart</button>
                  <button type="button" onClick={() => onRemove(product.id)} className="text-[8px] font-extrabold text-red-500">Remove</button>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function CartSummaryRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <strong className={accent ? 'text-emerald-700' : 'text-[#253329]'}>
        {value}
      </strong>
    </div>
  )
}

function AddressSection({ addresses, user, onSave, onDelete, onSetDefault }) {
  const emptyAddress = {
    id: '',
    type: 'Shipping',
    label: 'Home',
    fullName: user.name,
    phone: user.mobile || '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  }
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyAddress)
  const [permission, setPermission] = useState(false)

  const openForm = (address = emptyAddress) => {
    setForm({ ...address })
    setPermission(false)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setForm(emptyAddress)
    setPermission(false)
  }

  const submit = (event) => {
    event.preventDefault()
    if (!permission) return
    onSave(form)
    closeForm()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {!formOpen && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">
              Your saved addresses
            </h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Add separate shipping and billing destinations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openForm()}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35]"
          >
            <Plus size={15} />
            Add address
          </button>
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={submit}
          className="rounded-[26px] border border-[#9bcaa6]/40 bg-[#f7faf3] p-5 sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#536a50]">
                {form.id ? 'Update address' : 'New address'}
              </p>
              <h3 className="mt-1 text-lg font-extrabold">
                {form.id
                  ? `Edit ${form.label}`
                  : 'Add billing or shipping address'}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="grid size-9 place-items-center rounded-full bg-white text-slate-400 hover:text-slate-800"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Address type">
              <SelectMenu
                value={form.type}
                onChange={(type) => setForm({ ...form, type })}
                options={addressTypeOptions}
                ariaLabel="Address type"
                buttonClassName={fieldClass}
              />
            </Field>
            <Field label="Address label">
              <SelectMenu
                value={form.label}
                onChange={(label) => setForm({ ...form, label })}
                options={addressLabelOptions}
                ariaLabel="Address label"
                buttonClassName={fieldClass}
              />
            </Field>
            <Field label="Full name">
              <input
                required
                value={form.fullName}
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
                className={fieldClass}
              />
            </Field>
            <Field label="Mobile number">
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
                className={fieldClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Street address">
                <input
                  required
                  value={form.line1}
                  onChange={(event) =>
                    setForm({ ...form, line1: event.target.value })
                  }
                  className={fieldClass}
                />
              </Field>
            </div>
            <Field label="City">
              <input
                required
                value={form.city}
                onChange={(event) =>
                  setForm({ ...form, city: event.target.value })
                }
                className={fieldClass}
              />
            </Field>
            <Field label="State">
              <input
                required
                value={form.state}
                onChange={(event) =>
                  setForm({ ...form, state: event.target.value })
                }
                className={fieldClass}
              />
            </Field>
            <Field label="PIN code">
              <input
                required
                inputMode="numeric"
                value={form.pincode}
                onChange={(event) =>
                  setForm({ ...form, pincode: event.target.value })
                }
                className={fieldClass}
              />
            </Field>
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4">
            <input
              required
              checked={permission}
              onChange={(event) => setPermission(event.target.checked)}
              type="checkbox"
              className="mt-0.5 size-4 accent-[#536a50]"
            />
            <span className="text-[10px] font-semibold leading-5 text-slate-500">
              I give permission to securely save this address to my Pride
              Electronics account for future billing and delivery.
            </span>
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-extrabold text-slate-500"
            >
              Cancel
            </button>
            <button
              disabled={!permission}
              className="rounded-full bg-[#253329] px-5 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#ff5c35] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {form.id ? 'Update address' : 'Save address'}
            </button>
          </div>
        </form>
      )}

      {!formOpen &&
        (addresses.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {addresses.map((address) => (
              <article
                key={address.id}
                className={`overflow-hidden rounded-[26px] border bg-[#fafbf8] transition hover:shadow-lg ${address.isDefault ? 'border-[#75916f]' : 'border-slate-100'}`}
              >
                <div
                  className={`h-1.5 ${address.type === 'Billing' ? 'bg-[#ffb000]' : 'bg-[#75916f]'}`}
                />
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#e5ecd6] text-[#536a50]">
                      <MapPin size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold">
                          {address.label}
                        </h3>
                        <span className="rounded-full bg-white px-2 py-1 text-[8px] font-extrabold uppercase text-slate-500 shadow-sm">
                          {address.type}
                        </span>
                        {address.isDefault && (
                          <span className="rounded-full bg-[#e4f1e7] px-2 py-1 text-[8px] font-extrabold uppercase text-[#366643]">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-xs font-bold text-slate-700">
                        {address.fullName}
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-slate-500">
                        {address.line1}
                        <br />
                        {address.city}, {address.state} {address.pincode}
                        <br />
                        {address.phone}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => openForm(address)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[9px] font-extrabold text-slate-600 shadow-sm hover:text-[#ff5c35]"
                    >
                      <Pencil size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(address.id)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[9px] font-extrabold text-red-500 shadow-sm"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                    {!address.isDefault && (
                      <button
                        type="button"
                        onClick={() => onSetDefault(address.id)}
                        className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#253329] px-3 py-2 text-[9px] font-extrabold text-white"
                      >
                        <Check size={12} />
                        Set as default
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title="No saved addresses"
            text="Add a shipping or billing address to get started."
          />
        ))}
    </div>
  )
}

function PaymentSection({ user, payments, onSave, onDelete, onSetDefault }) {
  const emptyPayment = {
    id: '',
    type: 'UPI',
    holder: user.name,
    upiId: '',
    last4: '',
    expiry: '',
    isDefault: false,
  }
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyPayment)
  const [cardNumber, setCardNumber] = useState('')
  const [permission, setPermission] = useState(false)

  const openForm = (payment = emptyPayment) => {
    setForm({ ...payment })
    setCardNumber('')
    setPermission(false)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setForm(emptyPayment)
    setCardNumber('')
    setPermission(false)
  }

  const submit = (event) => {
    event.preventDefault()
    if (!permission) return
    const next =
      form.type === 'UPI'
        ? { ...form, holder: user.name, last4: '', expiry: '' }
        : {
            ...form,
            upiId: '',
            last4: cardNumber
              ? cardNumber.replace(/\s/g, '').slice(-4)
              : form.last4,
          }
    onSave(next)
    closeForm()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {!formOpen && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800">
              Saved payment methods
            </h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Only masked card details are retained in this mock storefront.
            </p>
          </div>
          <button
            type="button"
            onClick={() => openForm()}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[#253329] px-5 py-3 text-xs font-extrabold text-white transition hover:bg-[#ff5c35]"
          >
            <Plus size={15} />
            Add payment method
          </button>
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={submit}
          className="rounded-[26px] border border-[#9bcaa6]/40 bg-[#f7faf3] p-5 sm:p-7"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-wider text-[#536a50]">
                {form.id ? 'Update method' : 'Secure payment setup'}
              </p>
              <h3 className="mt-1 text-lg font-extrabold">
                {form.id ? `Edit ${form.type}` : 'Add a payment method'}
              </h3>
            </div>
            <button
              type="button"
              onClick={closeForm}
              className="grid size-9 place-items-center rounded-full bg-white text-slate-400"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2">
            {['UPI', 'Debit Card', 'Credit Card'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setForm({ ...form, type })}
                className={`rounded-2xl px-2 py-3 text-[10px] font-extrabold transition ${form.type === type ? 'bg-[#253329] text-white' : 'bg-white text-slate-500'}`}
              >
                {type}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {form.type === 'UPI' ? (
              <div className="sm:col-span-2">
                <Field label="UPI ID">
                  <input
                    required
                    value={form.upiId}
                    onChange={(event) =>
                      setForm({ ...form, upiId: event.target.value })
                    }
                    placeholder="name@bank"
                    className={fieldClass}
                  />
                </Field>
              </div>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <Field label="Cardholder name">
                    <input
                      required
                      value={form.holder}
                      onChange={(event) =>
                        setForm({ ...form, holder: event.target.value })
                      }
                      className={fieldClass}
                    />
                  </Field>
                </div>
                <Field
                  label={
                    form.last4
                      ? `Card number (saved •••• ${form.last4})`
                      : 'Card number'
                  }
                >
                  <input
                    required={!form.last4}
                    value={cardNumber}
                    onChange={(event) => setCardNumber(event.target.value)}
                    inputMode="numeric"
                    placeholder={
                      form.last4
                        ? 'Enter only to replace card'
                        : '1234 5678 9012 3456'
                    }
                    className={fieldClass}
                  />
                </Field>
                <Field label="Expiry">
                  <input
                    required
                    value={form.expiry}
                    onChange={(event) =>
                      setForm({ ...form, expiry: event.target.value })
                    }
                    placeholder="MM/YY"
                    className={fieldClass}
                  />
                </Field>
              </>
            )}
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl bg-white p-4">
            <input
              required
              checked={permission}
              onChange={(event) => setPermission(event.target.checked)}
              type="checkbox"
              className="mt-0.5 size-4 accent-[#536a50]"
            />
            <span className="text-[10px] font-semibold leading-5 text-slate-500">
              I give permission to securely save this payment method for faster
              future checkout. Full card numbers are not retained.
            </span>
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-xs font-extrabold text-slate-500"
            >
              Cancel
            </button>
            <button
              disabled={!permission}
              className="rounded-full bg-[#253329] px-5 py-2.5 text-xs font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {form.id ? 'Update method' : 'Save method'}
            </button>
          </div>
        </form>
      )}

      {!formOpen &&
        (payments.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {payments.map((payment) => (
              <article
                key={payment.id}
                className={`relative isolate overflow-hidden rounded-[26px] p-5 text-white shadow-lg ${payment.type === 'UPI' ? 'bg-gradient-to-br from-[#536a50] to-[#75916f]' : 'bg-gradient-to-br from-[#253329] to-[#536a50]'}`}
              >
                <div className="absolute -right-12 -top-12 -z-10 size-40 rounded-full border-[28px] border-white/5" />
                <div className="flex items-start justify-between">
                  <span className="grid size-10 place-items-center rounded-2xl bg-white/10">
                    {payment.type === 'UPI' ? (
                      <span className="text-xs font-extrabold">UPI</span>
                    ) : (
                      <CreditCard size={19} />
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    {payment.isDefault && (
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[8px] font-extrabold uppercase">
                        Default
                      </span>
                    )}
                    <span className="text-[9px] font-bold uppercase text-white/60">
                      {payment.type}
                    </span>
                  </div>
                </div>
                <p className="mt-8 font-mono text-base font-bold tracking-wider">
                  {payment.type === 'UPI'
                    ? payment.upiId
                    : `•••• •••• •••• ${payment.last4}`}
                </p>
                <p className="mt-2 text-[9px] uppercase tracking-wider text-white/50">
                  {payment.type === 'UPI'
                    ? 'Verified UPI address'
                    : `${payment.holder} · Expires ${payment.expiry}`}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                  <button
                    type="button"
                    onClick={() => openForm(payment)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[9px] font-extrabold hover:bg-white/20"
                  >
                    <Pencil size={12} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(payment.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-2 text-[9px] font-extrabold text-red-200"
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                  {!payment.isDefault && (
                    <button
                      type="button"
                      onClick={() => onSetDefault(payment.id)}
                      className="ml-auto rounded-full bg-white px-3 py-2 text-[9px] font-extrabold text-[#253329]"
                    >
                      Set as default
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CreditCard}
            title="No saved payment methods"
            text="Add UPI, a debit card, or a credit card for faster checkout."
          />
        ))}
    </div>
  )
}

function CouponsSection() {
  return (
    <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">
      {couponList.map((coupon) => (
        <article
          key={coupon.code}
          className="group overflow-hidden rounded-[26px] border border-dashed border-slate-300 bg-[#fafbf8] transition hover:-translate-y-1 hover:shadow-xl"
        >
          <div className={`${coupon.tone} relative overflow-hidden p-5`}>
            <div className="absolute -right-5 -top-5 size-24 rounded-full bg-white/20" />
            <TicketPercent size={22} />
            <h3 className="mt-5 text-base font-extrabold">{coupon.title}</h3>
            <p className="mt-1 text-[10px] font-semibold opacity-70">
              {coupon.detail}
            </p>
          </div>
          <div className="flex items-center justify-between p-4">
            <code className="text-xs font-extrabold tracking-wider">
              {coupon.code}
            </code>
            <span className="flex items-center gap-1 rounded-full bg-[#e5ecd6] px-3 py-2 text-[9px] font-extrabold text-[#536a50]">
              <Check size={12} />
              Available
            </span>
          </div>
        </article>
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-slate-300 bg-[#fafbf8] px-6 py-14 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e5ecd6] text-[#61725c]">
        <Icon size={23} />
      </span>
      <h3 className="mt-4 text-sm font-extrabold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-400">{text}</p>
    </div>
  )
}

export function LogoutConfirmation({ onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onCancel()
      }
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        className="w-full max-w-sm rounded-[26px] bg-white p-6 text-center shadow-2xl"
      >
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-500">
          <LogOut size={23} />
        </span>
        <h2
          id="logout-title"
          className="mt-4 text-lg font-extrabold text-slate-950"
        >
          Log out of your account?
        </h2>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          You’ll need to log in again to access your profile, wishlist, and
          orders.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full bg-red-500 px-4 py-3 text-xs font-extrabold text-white"
          >
            Yes, logout
          </button>
        </div>
      </div>
    </div>
  )
}
