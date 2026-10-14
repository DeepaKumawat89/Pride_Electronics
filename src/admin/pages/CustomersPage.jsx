import { useMemo, useState } from 'react'
import {
  Check,
  Copy,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import { EmptyState, PageHeader, StatCard } from '../components/ui/AdminUI'
import {
  getInitials,
  moneyValue,
} from '../utils/adminFormatters'
import { buildCustomerProfile } from '../utils/customers'

export default function CustomersPage({
  customers = [],
  orders = [],
  searchQuery = '',
  onUpdateCustomer,
}) {
  const [copiedId, setCopiedId] = useState(null)
  const [updatingStatusId, setUpdatingStatusId] = useState(null)
  const [statusError, setStatusError] = useState('')
  const profiles = useMemo(
    () =>
      customers.map((customer) =>
        buildCustomerProfile(customer, orders),
      ),
    [customers, orders],
  )
  const filtered = profiles.filter(
    (customer) =>
      !searchQuery ||
      `${customer.name} ${customer.email} ${customer.phone}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )
  const active = profiles.filter((customer) =>
    String(customer.status).toLowerCase() === 'active',
  ).length
  const copy = (text) => {
    navigator.clipboard?.writeText(text)
    setCopiedId(text)
    setTimeout(() => setCopiedId(null), 1800)
  }

  const toggleStatus = async (customer) => {
    const nextStatus = String(customer.status).toLowerCase() === 'active'
      ? 'Disabled'
      : 'Active'
    setUpdatingStatusId(customer.id)
    setStatusError('')
    try {
      await onUpdateCustomer(customer.id, nextStatus)
    } catch (error) {
      setStatusError(error.message || 'Unable to update the customer account status.')
    } finally {
      setUpdatingStatusId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Audience management"
        title={`${profiles.length} customer accounts`}
        description="Review customer activity and securely manage account access."
      />
      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Total accounts" value={profiles.length} detail="Registered shoppers" />
        <StatCard icon={UserCheck} label="Active accounts" value={`${Math.round((active / (profiles.length || 1)) * 100)}%`} detail="Verified and active" tone="amber" />
      </section>
      {statusError && <p className="rounded-2xl bg-red-50 px-4 py-3 text-[9px] font-bold text-red-600">{statusError}</p>}
      {!filtered.length ? (
        <EmptyState title="No matching customers" />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {['Customer', 'Account ID', 'Orders', 'Lifetime spend', 'Status', 'Joined'].map((head) => (
                    <th key={head} className="px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((customer, index) => {
                  const percent = Math.min(100, Math.max(10, moneyValue(customer.totalSpending) / 3500))
                  const activeAccount = String(customer.status).toLowerCase() === 'active'
                  return (
                    <tr key={customer.id} className="transition hover:bg-[#fafcf9]">
                      <td className="px-5 py-4"><div className="flex items-center gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-full text-[9px] font-extrabold ${index % 3 === 0 ? 'bg-[#dcebdd] text-[#397a4a]' : index % 3 === 1 ? 'bg-[#ffe9e2] text-[#b33b20]' : 'bg-violet-50 text-violet-700'}`}>{getInitials(customer.name)}</span><span className="min-w-0"><strong className="block max-w-48 truncate text-[10px] text-slate-900">{customer.name}</strong><span className="mt-0.5 block max-w-48 truncate text-[8px] text-slate-400">{customer.email}</span></span></div></td>
                      <td className="px-5 py-4"><div className="flex items-center gap-2"><strong className="text-[9px] text-[#397a4a]">{customer.id}</strong><button type="button" onClick={() => copy(customer.id)} className="text-slate-400 hover:text-[#397a4a]">{copiedId === customer.id ? <Check size={12} /> : <Copy size={12} />}</button></div></td>
                      <td className="px-5 py-4 text-[10px] font-extrabold text-slate-700">{customer.totalOrders} orders</td>
                      <td className="px-5 py-4"><strong className="text-[10px] text-slate-900">{customer.totalSpending}</strong><div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#397a4a]" style={{ width: `${percent}%` }} /></div></td>
                      <td className="px-5 py-4"><button type="button" disabled={updatingStatusId === customer.id} onClick={() => toggleStatus(customer)} aria-label={`${activeAccount ? 'Disable' : 'Activate'} ${customer.name}'s account`} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[8px] font-extrabold ring-1 ring-inset transition disabled:cursor-wait disabled:opacity-60 ${activeAccount ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200'}`}><span className={`size-1.5 rounded-full ${activeAccount ? 'bg-emerald-500' : 'bg-slate-400'}`} />{updatingStatusId === customer.id ? 'Updating…' : activeAccount ? 'Active' : 'Disabled'}</button></td>
                      <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">{customer.registrationDate}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <section>
        <article className="relative overflow-hidden rounded-[28px] bg-[#17251c] p-6 text-white"><div className="absolute -right-14 -top-16 size-48 rounded-full bg-[#9bcaa6]/15 blur-2xl" /><ShieldCheck size={22} className="text-[#9bcaa6]" /><h3 className="mt-5 text-xl font-extrabold">Customer data stays protected</h3><p className="mt-2 max-w-md text-xs leading-6 text-white/50">Account information is shown only inside the authenticated management workspace.</p></article>
      </section>
    </div>
  )
}
