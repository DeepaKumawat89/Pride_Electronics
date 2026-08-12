import {
  ArrowLeft, Check, CheckCircle2, ChevronRight, CreditCard, Heart, LogOut,
  MapPin, Minus, Package, Plus, ShieldCheck, ShoppingBag, Sparkles,
  TicketPercent, Trash2, Truck, UserRound,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatCurrency, parsePrice } from '../../utils/currency'

const menuItems = [
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'cart', label: 'Cart', icon: ShoppingBag },
  { id: 'address', label: 'Saved Address', icon: MapPin },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'coupons', label: 'Coupons', icon: TicketPercent },
]

const sectionMeta = {
  profile: { title: 'My Profile', subtitle: 'Your personal account details', icon: UserRound },
  wishlist: { title: 'Wishlist', subtitle: 'Products you saved for later', icon: Heart },
  orders: { title: 'Orders', subtitle: 'Track and review your purchases', icon: Package },
  cart: { title: 'Cart', subtitle: 'Review the items in your bag', icon: ShoppingBag },
  address: { title: 'Saved Address', subtitle: 'Your preferred delivery location', icon: MapPin },
  payment: { title: 'Payment', subtitle: 'Your saved payment preferences', icon: CreditCard },
  coupons: { title: 'Coupons', subtitle: 'Available offers for your next order', icon: TicketPercent },
}

const coupons = [
  { code: 'PRIDE500', title: '₹500 off your first order', detail: 'Minimum purchase of ₹2,499', tone: 'bg-[#fff1c9] text-[#765400]' },
  { code: 'FREESHIP', title: 'Free express delivery', detail: 'Valid on all Pride+ member orders', tone: 'bg-[#e4f1e7] text-[#366643]' },
  { code: 'AUDIO15', title: '15% off audio products', detail: 'Maximum discount ₹1,500', tone: 'bg-[#ffe9e2] text-[#b33b20]' },
]

function getInitials(name) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

export default function AccountPanel({
  section, user, wishlistProducts, orders, cartItems, cartSubtotal,
  onSectionChange, onClose, onAddToCart, onChangeQuantity, onRemoveCartItem,
  onCheckout, onLogout,
}) {
  const [logoutOpen, setLogoutOpen] = useState(false)

  useEffect(() => {
    if (!section) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [section, onClose])

  if (!section) return null
  const meta = sectionMeta[section]
  const SectionIcon = meta.icon

  return (
    <div className="fixed inset-0 z-50 isolate overflow-hidden bg-[#dcebdd]">
      <div className="pointer-events-none absolute -right-32 -top-48 -z-10 size-[600px] rounded-full bg-[#9bcaa6]/35 blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[62%] bg-gradient-to-t from-[#aacfb3]/45 to-transparent" />
      <div className="relative z-10 flex h-full flex-col gap-3 p-3 sm:gap-4 sm:p-4 md:flex-row md:gap-5 md:p-5 lg:gap-7 lg:px-8 lg:py-7 xl:px-10 xl:py-8">
        <aside className="shrink-0 rounded-[24px] bg-white/30 shadow-[0_16px_45px_rgba(40,68,48,0.08)] backdrop-blur-md md:w-64 md:rounded-[28px] lg:w-72">
          <div className="flex h-14 items-center gap-3 px-3 sm:px-4 md:h-20 md:px-5">
            <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/80 text-[#253329] shadow-sm transition hover:-translate-x-0.5 hover:bg-white" aria-label="Back to store"><ArrowLeft size={19}/></button>
            <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#5d705e]">Your account</p><p className="truncate text-sm font-extrabold text-[#253329]">{user.name}</p></div>
          </div>

          <div className="hidden px-4 pb-5 md:block lg:px-5">
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-white/55 p-3 shadow-sm">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#253329] text-xs font-extrabold text-white">{getInitials(user.name)}</span>
              <span className="min-w-0"><strong className="block truncate text-xs text-[#253329]">{user.name}</strong><span className="mt-0.5 block truncate text-[9px] text-[#5d705e]">{user.email}</span></span>
            </div>
            <nav className="grid gap-1.5">
              {menuItems.map(({ id, label, icon: Icon }) => (
                <button key={id} type="button" onClick={() => onSectionChange(id)} className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-bold transition ${section === id ? 'bg-[#253329] text-white shadow-md' : 'text-[#425443] hover:bg-white/65 hover:shadow-sm'}`}>
                  <Icon size={16} className={section === id ? 'text-[#ffb000]' : 'text-[#647765] transition group-hover:text-[#ff5c35]'}/><span className="flex-1">{label}</span>{section === id && <ChevronRight size={14}/>} 
                </button>
              ))}
              <button type="button" onClick={() => setLogoutOpen(true)} className="group mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-bold text-red-600 transition hover:bg-red-50/70 hover:shadow-sm"><LogOut size={16}/>Logout</button>
            </nav>
          </div>

          <nav className="flex gap-2 overflow-x-auto px-3 pb-3 sm:px-4 md:hidden">
            {menuItems.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => onSectionChange(id)} className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2.5 text-[10px] font-extrabold transition ${section === id ? 'bg-[#253329] text-white' : 'bg-white/55 text-[#425443]'}`}><Icon size={14}/>{label}</button>
            ))}
            <button type="button" onClick={() => setLogoutOpen(true)} className="flex shrink-0 items-center gap-2 rounded-full bg-red-50/70 px-3.5 py-2.5 text-[10px] font-extrabold text-red-600"><LogOut size={14}/>Logout</button>
          </nav>
        </aside>

        <main className="min-h-0 flex-1">
          <div className="flex h-full flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_24px_70px_rgba(40,68,48,0.14)] md:rounded-[30px]">
            <header className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5 lg:px-9">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#eff3e7] text-[#536a50]"><SectionIcon size={20}/></span>
              <span className="min-w-0"><h1 className="truncate text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">{meta.title}</h1><p className="truncate text-[10px] text-slate-400 sm:text-[11px]">{meta.subtitle}</p></span>
            </header>
            <div className="flex-1 overflow-y-auto p-5 sm:p-7 lg:p-9">
              <SectionContent
                section={section}
                user={user}
                wishlistProducts={wishlistProducts}
                orders={orders}
                cartItems={cartItems}
                cartSubtotal={cartSubtotal}
                onAddToCart={onAddToCart}
                onChangeQuantity={onChangeQuantity}
                onRemoveCartItem={onRemoveCartItem}
                onCheckout={onCheckout}
              />
            </div>
          </div>
        </main>
      </div>

      {logoutOpen && <LogoutConfirmation onCancel={() => setLogoutOpen(false)} onConfirm={onLogout}/>} 
    </div>
  )
}

function SectionContent({ section, user, wishlistProducts, orders, cartItems, cartSubtotal, onAddToCart, onChangeQuantity, onRemoveCartItem, onCheckout }) {
  if (section === 'profile') {
    return <div className="mx-auto max-w-5xl space-y-5"><div className="relative isolate overflow-hidden rounded-[28px] bg-[#e5ecd6] px-5 py-8 sm:px-8 sm:py-10"><div className="absolute -right-14 -top-20 -z-10 size-64 rounded-full bg-[#9bcaa6]/35 blur-3xl"/><div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left"><span className="grid size-24 shrink-0 place-items-center rounded-full border-4 border-white/60 bg-[#253329] text-2xl font-extrabold text-white shadow-xl">{getInitials(user.name)}</span><div className="min-w-0 flex-1"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#4f7659]"><Sparkles size={11}/>Pride+ member</span><h2 className="mt-3 truncate text-2xl font-extrabold tracking-tight text-[#253329] sm:text-3xl">{user.name}</h2><p className="mt-1 truncate text-sm text-[#5d705e]">{user.email}</p></div><span className="hidden rounded-2xl bg-white/55 px-4 py-3 text-center sm:block"><strong className="block text-lg font-extrabold text-[#253329]">Active</strong><span className="text-[9px] font-bold uppercase tracking-wider text-[#647765]">Account status</span></span></div></div><div className="grid gap-4 sm:grid-cols-2"><InfoCard icon={UserRound} label="Full name" value={user.name}/><InfoCard icon={CreditCard} label="Email address" value={user.email}/></div><div className="grid gap-3 sm:grid-cols-3"><FeatureCard icon={ShieldCheck} title="Secure account" text="Mock session protection"/><FeatureCard icon={Truck} title="Fast delivery" text="Priority member service"/><FeatureCard icon={Heart} title={`${wishlistProducts.length} saved`} text="Items in your wishlist"/></div></div>
  }

  if (section === 'wishlist') {
    return wishlistProducts.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{wishlistProducts.map((product) => <article key={product.id} className="group overflow-hidden rounded-[24px] border border-slate-100 bg-[#fafbf8] transition hover:-translate-y-1 hover:shadow-xl"><div className="relative aspect-[16/10] overflow-hidden"><img src={product.image} alt={product.name} className="size-full object-cover transition duration-500 group-hover:scale-105"/><span className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-white/90 text-[#ff5c35] shadow-sm"><Heart size={14} fill="currentColor"/></span></div><div className="p-4"><p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{product.category}</p><h3 className="mt-1 line-clamp-2 min-h-10 text-xs font-extrabold leading-5">{product.name}</h3><div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-[#ff5c35]">{formatCurrency(parsePrice(product.price))}</p><button type="button" onClick={() => onAddToCart(product)} className="grid size-9 place-items-center rounded-full bg-[#253329] text-white transition hover:bg-[#ff5c35]" aria-label={`Add ${product.name} to cart`}><ShoppingBag size={14}/></button></div></div></article>)}</div> : <EmptyState icon={Heart} title="Your wishlist is empty" text="Tap the heart on a product to save it here."/>
  }

  if (section === 'orders') {
    return orders.length ? <div className="mx-auto max-w-5xl space-y-4">{orders.map((order) => <article key={order.id} className="overflow-hidden rounded-[24px] border border-slate-100 bg-[#fafbf8] transition hover:shadow-lg"><div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e5ecd6] text-[#536a50]"><Package size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold text-slate-900">Order {order.id}</h3><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[8px] font-extrabold uppercase tracking-wider text-amber-700">{order.status}</span></div><p className="mt-1 text-[10px] text-slate-400">Placed on {order.date} · {order.itemsCount} {order.itemsCount === 1 ? 'item' : 'items'}</p></div><div className="flex items-center justify-between gap-4 sm:block sm:text-right"><span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:block">Order total</span><strong className="text-base font-extrabold text-slate-950">{order.total}</strong></div></div><div className="flex items-center gap-2 bg-white px-5 py-3 text-[10px] font-semibold text-[#536a50]"><CheckCircle2 size={14}/>Order received and awaiting processing</div></article>)}</div> : <EmptyState icon={Package} title="No orders yet" text="Your completed orders will appear here."/>
  }

  if (section === 'cart') {
    return cartItems.length ? <div className="mx-auto grid max-w-5xl gap-5 xl:grid-cols-[1fr_300px]"><div className="space-y-3">{cartItems.map(({ product, quantity }) => <article key={product.id} className="flex gap-3 rounded-[22px] border border-slate-100 bg-[#fafbf8] p-3 transition hover:shadow-md sm:gap-4 sm:p-4"><img src={product.image} alt={product.name} className="size-20 rounded-2xl object-cover sm:size-24"/><div className="min-w-0 flex-1"><p className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{product.category}</p><h3 className="mt-1 line-clamp-2 text-xs font-extrabold leading-5 sm:text-sm">{product.name}</h3><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-extrabold text-[#ff5c35]">{formatCurrency(parsePrice(product.price))}</p><div className="flex items-center gap-3"><div className="flex items-center rounded-full border border-slate-200 bg-white shadow-sm"><button type="button" onClick={() => onChangeQuantity(product.id, -1)} className="grid size-8 place-items-center transition hover:text-[#ff5c35]"><Minus size={12}/></button><span className="w-7 text-center text-xs font-bold">{quantity}</span><button type="button" onClick={() => onChangeQuantity(product.id, 1)} className="grid size-8 place-items-center transition hover:text-[#ff5c35]"><Plus size={12}/></button></div><button type="button" onClick={() => onRemoveCartItem(product.id)} className="grid size-8 place-items-center rounded-full text-slate-300 transition hover:bg-red-50 hover:text-red-500"><Trash2 size={15}/></button></div></div></div></article>)}</div><aside className="h-fit rounded-[24px] bg-[#e5ecd6] p-5"><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#687963]">Order summary</p><div className="mt-5 flex items-center justify-between text-xs text-[#5d705e]"><span>Subtotal</span><strong className="text-base text-[#253329]">{formatCurrency(cartSubtotal)}</strong></div><div className="mt-3 flex items-center justify-between text-xs text-[#5d705e]"><span>Shipping</span><span className="font-bold text-[#4f7659]">Calculated next</span></div><div className="my-5 h-px bg-[#253329]/10"/><button type="button" onClick={onCheckout} className="w-full rounded-full bg-[#253329] px-5 py-3.5 text-xs font-extrabold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#ff5c35]">Proceed to checkout</button><p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-semibold text-[#687963]"><ShieldCheck size={12}/>Secure checkout</p></aside></div> : <EmptyState icon={ShoppingBag} title="Your cart is empty" text="Items you add to your cart will appear here."/>
  }

  if (section === 'address') {
    return <div className="mx-auto max-w-4xl"><div className="overflow-hidden rounded-[28px] border border-[#7f9574]/35 bg-[#fafbf8] shadow-sm"><div className="h-2 bg-gradient-to-r from-[#536a50] via-[#9bcaa6] to-[#aacfb3]"/><div className="flex flex-col gap-5 p-5 sm:flex-row sm:p-7"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#e5ecd6] text-[#536a50]"><MapPin size={21}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-extrabold">Home address</h3><span className="rounded-full bg-[#e4f1e7] px-2.5 py-1 text-[8px] font-extrabold uppercase text-[#366643]">Default delivery</span></div><p className="mt-3 text-xs leading-6 text-slate-500">42 Silicon Avenue, Hinjawadi<br/>Pune, Maharashtra 411057<br/>India</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold text-slate-500 shadow-sm">Home</span><span className="rounded-full bg-white px-3 py-1.5 text-[9px] font-bold text-slate-500 shadow-sm">411057</span></div></div><span className="flex h-fit items-center gap-1.5 text-[9px] font-extrabold text-[#536a50]"><CheckCircle2 size={14}/>Verified</span></div></div></div>
  }

  if (section === 'payment') {
    return <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1.15fr_.85fr]"><div className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#253329] to-[#536a50] p-6 text-white shadow-xl sm:p-7"><div className="absolute -right-16 -top-16 -z-10 size-52 rounded-full border-[35px] border-white/5"/><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-white/10"><CreditCard size={21}/></span><span className="text-sm font-extrabold italic tracking-wider">VISA</span></div><p className="mt-12 font-mono text-base tracking-[0.14em] sm:text-lg">•••• •••• •••• 4242</p><div className="mt-6 flex justify-between text-[9px] uppercase tracking-wider text-white/50"><span><span className="block">Card holder</span><strong className="mt-1 block text-[10px] text-white">{user.name}</strong></span><span><span className="block">Expires</span><strong className="mt-1 block text-[10px] text-white">12/28</strong></span></div></div><div className="flex flex-col justify-between rounded-[24px] bg-[#fafbf8] p-5"><div><span className="grid size-10 place-items-center rounded-2xl bg-[#e5ecd6] text-[#536a50]"><ShieldCheck size={18}/></span><h3 className="mt-4 text-sm font-extrabold">Secure payment method</h3><p className="mt-2 text-[11px] leading-5 text-slate-500">This temporary card is shown for the mock storefront. No real payment details are stored.</p></div><div className="mt-6 flex items-center gap-2 rounded-2xl bg-white p-3 text-[9px] font-bold text-[#536a50] shadow-sm"><CheckCircle2 size={14}/>Protected checkout</div></div></div>
  }

  return <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 xl:grid-cols-3">{coupons.map((coupon) => <article key={coupon.code} className="group overflow-hidden rounded-[26px] border border-dashed border-slate-300 bg-[#fafbf8] transition hover:-translate-y-1 hover:shadow-xl"><div className={`${coupon.tone} relative overflow-hidden p-5`}><div className="absolute -right-5 -top-5 size-24 rounded-full bg-white/20"/><span className="grid size-10 place-items-center rounded-2xl bg-white/55"><TicketPercent size={20}/></span><h3 className="mt-5 text-base font-extrabold">{coupon.title}</h3><p className="mt-1 text-[10px] font-semibold opacity-70">{coupon.detail}</p></div><div className="flex items-center justify-between p-4"><div><p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">Coupon code</p><code className="mt-1 block text-xs font-extrabold tracking-wider">{coupon.code}</code></div><button type="button" className="flex items-center gap-1 rounded-full bg-[#e5ecd6] px-3 py-2 text-[9px] font-extrabold text-[#536a50] transition group-hover:bg-[#253329] group-hover:text-white"><Check size={12}/>Available</button></div></article>)}</div>
}

function InfoCard({ icon: Icon, label, value }) {
  return <div className="flex items-center gap-4 rounded-[22px] border border-slate-100 bg-[#fafbf8] p-4 transition hover:shadow-md"><span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#e5ecd6] text-[#536a50]"><Icon size={17}/></span><span className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 truncate text-sm font-bold">{value}</p></span></div>
}

function FeatureCard({ icon: Icon, title, text }) {
  return <div className="flex items-center gap-3 rounded-[20px] bg-[#fafbf8] p-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-[#536a50] shadow-sm"><Icon size={16}/></span><span><strong className="block text-[11px] text-slate-800">{title}</strong><span className="mt-0.5 block text-[9px] text-slate-400">{text}</span></span></div>
}

function EmptyState({ icon: Icon, title, text }) {
  return <div className="mx-auto max-w-xl rounded-3xl border border-dashed border-slate-300 bg-[#fafbf8] px-6 py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e5ecd6] text-[#61725c]"><Icon size={23}/></span><h3 className="mt-4 text-sm font-extrabold">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p></div>
}

export function LogoutConfirmation({ onCancel, onConfirm }) {
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}><div role="alertdialog" aria-modal="true" aria-labelledby="logout-title" className="w-full max-w-sm rounded-[26px] bg-white p-6 text-center shadow-2xl"><span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-500"><LogOut size={23}/></span><h2 id="logout-title" className="mt-4 text-lg font-extrabold text-slate-950">Log out of your account?</h2><p className="mt-2 text-xs leading-5 text-slate-500">You’ll need to log in again to access your profile, wishlist, and orders.</p><div className="mt-6 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="rounded-full border border-slate-200 px-4 py-3 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50">Cancel</button><button type="button" onClick={onConfirm} className="rounded-full bg-red-500 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-red-600">Yes, logout</button></div></div></div>
}
