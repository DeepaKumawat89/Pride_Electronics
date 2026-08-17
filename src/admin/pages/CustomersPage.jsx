import { useMemo, useState } from 'react'
import {
  Award,
  Check,
  Copy,
  CreditCard,
  Eye,
  Heart,
  IndianRupee,
  MapPin,
  MessageSquareText,
  Package,
  RotateCcw,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import { EmptyState, Modal, PageHeader, StatCard } from '../components/ui/AdminUI'
import {
  formatAdminCurrency,
  getInitials,
  moneyValue,
} from '../utils/adminFormatters'
import { buildCustomerProfile } from '../utils/customers'

const profileSections = [
  ['orders', 'Orders', Package],
  ['wishlist', 'Wishlist', Heart],
  ['addresses', 'Addresses', MapPin],
  ['reviews', 'Reviews', MessageSquareText],
  ['returns', 'Returns', RotateCcw],
  ['payments', 'Payments', CreditCard],
]

export default function CustomersPage({
  customers = [],
  orders = [],
  refunds = [],
  searchQuery = '',
}) {
  const [copiedId, setCopiedId] = useState(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState(null)
  const [profileSection, setProfileSection] = useState('orders')
  const profiles = useMemo(
    () =>
      customers.map((customer) =>
        buildCustomerProfile(customer, orders, refunds),
      ),
    [customers, orders, refunds],
  )
  const selectedCustomer = profiles.find(
    (customer) => customer.id === selectedCustomerId,
  )
  const filtered = profiles.filter(
    (customer) =>
      !searchQuery ||
      `${customer.name} ${customer.email} ${customer.phone} ${customer.role}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )
  const spend = profiles.reduce(
    (sum, customer) => sum + moneyValue(customer.totalSpending),
    0,
  )
  const premium = profiles.filter((customer) =>
    /vip|pro/i.test(customer.role),
  ).length
  const active = profiles.filter((customer) =>
    /active/i.test(customer.status),
  ).length
  const copy = (text) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 1800)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audience management"
        title={`${profiles.length + 1280} customer accounts`}
        description="Understand customer value, membership tiers, purchase activity, and account verification at a glance."
      />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard icon={Users} label="Total accounts" value={profiles.length + 1280} detail="Registered shoppers" />
        <StatCard icon={Award} label="VIP & Pro" value={premium + 142} detail="Premium members" tone="violet" />
        <StatCard icon={IndianRupee} label="Average spend" value={formatAdminCurrency(spend / (profiles.length || 1))} detail="Lifetime value" tone="orange" />
        <StatCard icon={UserCheck} label="Active accounts" value={`${Math.round((active / (profiles.length || 1)) * 100)}%`} detail="Verified and active" tone="amber" />
      </section>
      {!filtered.length ? (
        <EmptyState title="No matching customers" />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {['Customer', 'Account ID', 'Membership', 'Orders', 'Lifetime spend', 'Status', 'Joined', 'Action'].map((head) => (
                    <th key={head} className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Action' ? 'text-right' : ''}`}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((customer, index) => {
                  const percent = Math.min(100, Math.max(10, moneyValue(customer.totalSpending) / 3500))
                  const activeAccount = /active/i.test(customer.status)
                  return (
                    <tr key={customer.id} className="transition hover:bg-[#fafcf9]">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-full text-[9px] font-extrabold ${index % 3 === 0 ? 'bg-[#dcebdd] text-[#397a4a]' : index % 3 === 1 ? 'bg-[#ffe9e2] text-[#b33b20]' : 'bg-violet-50 text-violet-700'}`}>{getInitials(customer.name)}</span><span className="min-w-0"><strong className="block max-w-48 truncate text-[10px] text-slate-900">{customer.name}</strong><span className="mt-0.5 block max-w-48 truncate text-[8px] text-slate-400">{customer.email}</span></span></div></td>
                      <td className="px-5 py-4"><div className="flex items-center gap-2"><strong className="text-[9px] text-[#397a4a]">{customer.id}</strong><button type="button" onClick={() => copy(customer.id)} className="text-slate-400 hover:text-[#397a4a]">{copiedId === customer.id ? <Check size={12} /> : <Copy size={12} />}</button></div></td>
                      <td className="px-5 py-4"><span className={`rounded-full px-3 py-1.5 text-[8px] font-extrabold ${customer.role.includes('VIP') ? 'bg-violet-50 text-violet-700' : customer.role.includes('Pro') ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>{customer.role}</span></td>
                      <td className="px-5 py-4 text-[10px] font-extrabold text-slate-700">{customer.totalOrders} orders</td>
                      <td className="px-5 py-4"><strong className="text-[10px] text-slate-900">{customer.totalSpending}</strong><div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#397a4a]" style={{ width: `${percent}%` }} /></div></td>
                      <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[8px] font-extrabold ring-1 ring-inset ${activeAccount ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}><span className={`size-1.5 rounded-full ${activeAccount ? 'bg-emerald-500' : 'bg-amber-500'}`} />{customer.status}</span></td>
                      <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">{customer.registrationDate}</td>
                      <td className="px-5 py-4 text-right"><button type="button" onClick={() => { setSelectedCustomerId(customer.id); setProfileSection('orders') }} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#17251c] px-3 text-[8px] font-extrabold text-white transition hover:bg-[#397a4a]"><Eye size={12} /> View profile</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <section className="grid gap-4 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-[28px] bg-[#17251c] p-6 text-white"><div className="absolute -right-14 -top-16 size-48 rounded-full bg-[#9bcaa6]/15 blur-2xl" /><ShieldCheck size={22} className="text-[#9bcaa6]" /><h3 className="mt-5 text-xl font-extrabold">Customer data stays protected</h3><p className="mt-2 max-w-md text-xs leading-6 text-white/50">Account information is shown only inside the authenticated management workspace.</p></article>
        <article className="rounded-[28px] bg-[#dcebdd] p-6"><Award size={22} className="text-[#397a4a]" /><h3 className="mt-5 text-xl font-extrabold text-[#253329]">Premium audience is growing</h3><p className="mt-2 text-xs leading-6 text-[#5d705e]">VIP and Pro members represent a high-value segment worth nurturing with targeted offers.</p></article>
      </section>

      <Modal open={Boolean(selectedCustomer)} onClose={() => setSelectedCustomerId(null)} eyebrow="Customer profile" title={selectedCustomer?.name || ''} maxWidth="max-w-4xl">
        {selectedCustomer && (
          <div className="p-5 sm:p-7">
            <div className="grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Email" value={selectedCustomer.email} />
              <Detail label="Phone" value={selectedCustomer.phone || 'Not provided'} />
              <Detail label="Registration date" value={selectedCustomer.registrationDate} />
              <Detail label="Account status" value={selectedCustomer.status} />
              <Detail label="Total orders" value={selectedCustomer.totalOrders} />
              <Detail label="Total spending" value={selectedCustomer.totalSpending} />
              <Detail label="Last order" value={selectedCustomer.lastOrder ? `${selectedCustomer.lastOrder.id} · ${selectedCustomer.lastOrder.date}` : 'No linked orders'} />
              <Detail label="Customer ID" value={selectedCustomer.id} />
            </div>
            <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
              {profileSections.map(([id, label, Icon]) => (
                <button key={id} type="button" onClick={() => setProfileSection(id)} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2.5 text-[9px] font-extrabold transition ${profileSection === id ? 'bg-[#397a4a] text-white' : 'border border-slate-200 bg-white text-slate-500'}`}><Icon size={13} /> {label}<span className={`rounded-full px-1.5 py-0.5 text-[7px] ${profileSection === id ? 'bg-white/15' : 'bg-slate-100'}`}>{selectedCustomer[id].length}</span></button>
              ))}
            </div>
            <div className="mt-4 min-h-48"><ProfileContent customer={selectedCustomer} section={profileSection} /></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Detail({ label, value }) {
  return <div><p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p><strong className="mt-1.5 block break-words text-[10px] text-slate-800">{value || 'Not available'}</strong></div>
}

function ProfileContent({ customer, section }) {
  const items = customer[section]
  if (!items.length) return <ProfileEmpty section={section} />
  if (section === 'orders') return <ProfileList items={items} render={(order) => <><Detail label="Order ID" value={order.id} /><Detail label="Date" value={order.date} /><Detail label="Amount" value={order.total} /><Detail label="Status" value={order.status} /></>} />
  if (section === 'payments') return <ProfileList items={items} render={(payment) => <><Detail label="Transaction ID" value={payment.id} /><Detail label="Order ID" value={payment.orderId} /><Detail label="Amount" value={payment.amount} /><Detail label="Status" value={payment.status} /></>} />
  if (section === 'returns') return <ProfileList items={items} render={(order) => <><Detail label="Order ID" value={order.id} /><Detail label="Status" value={order.status} /><Detail label="Disposition" value={order.returnDisposition || 'Refunded'} /><Detail label="Amount" value={order.total} /></>} />
  if (section === 'addresses') return <ProfileList items={items} render={(address) => <><Detail label="Type" value={address.label || address.type || 'Address'} /><Detail label="Name" value={address.fullName || customer.name} /><Detail label="Phone" value={address.phone} /><Detail label="Address" value={formatAddress(address)} /></>} />
  if (section === 'reviews') return <ProfileList items={items} render={(review) => <><Detail label="Product" value={review.productName || review.product} /><Detail label="Rating" value={review.rating ? `${review.rating} / 5` : 'Not rated'} /><Detail label="Date" value={review.date} /><Detail label="Review" value={review.text || review.review} /></>} />
  return <ProfileList items={items} render={(product) => <><Detail label="Product" value={product.name || product.productName} /><Detail label="Category" value={product.category} /><Detail label="Price" value={product.price} /><Detail label="Stock" value={product.stock == null ? 'Not available' : product.stock > 0 ? 'In stock' : 'Out of stock'} /></>} />
}

function ProfileList({ items, render }) {
  return <div className="divide-y divide-slate-100 rounded-[22px] bg-white px-4 shadow-sm">{items.map((item, index) => <div key={item.id || item.orderId || item.productId || index} className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-4">{render(item)}</div>)}</div>
}

function ProfileEmpty({ section }) {
  return <div className="grid min-h-48 place-items-center rounded-[22px] border border-dashed border-slate-200 bg-white px-5 text-center"><div><Package size={20} className="mx-auto text-slate-300" /><p className="mt-3 text-[10px] font-bold text-slate-500">No {section} linked to this customer.</p></div></div>
}

function formatAddress(address) {
  if (typeof address === 'string') return address
  return [address.line1, address.city, address.state, address.pincode].filter(Boolean).join(', ')
}
