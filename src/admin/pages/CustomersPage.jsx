import { useState } from 'react'
import {
  Award,
  Check,
  Copy,
  IndianRupee,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import { EmptyState, PageHeader, StatCard } from '../components/ui/AdminUI'
import {
  formatAdminCurrency,
  getInitials,
  moneyValue,
} from '../utils/adminFormatters'

export default function CustomersPage({ customers = [], searchQuery = '' }) {
  const [copiedId, setCopiedId] = useState(null)
  const filtered = customers.filter(
    (customer) =>
      !searchQuery ||
      `${customer.name} ${customer.email} ${customer.role}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )
  const spend = customers.reduce(
    (sum, customer) => sum + moneyValue(customer.totalSpent),
    0,
  )
  const premium = customers.filter((customer) =>
    /vip|pro/i.test(customer.role),
  ).length
  const active = customers.filter((customer) =>
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
        title={`${customers.length + 1280} customer accounts`}
        description="Understand customer value, membership tiers, purchase activity, and account verification at a glance."
      />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total accounts"
          value={customers.length + 1280}
          detail="Registered shoppers"
        />
        <StatCard
          icon={Award}
          label="VIP & Pro"
          value={premium + 142}
          detail="Premium members"
          tone="violet"
        />
        <StatCard
          icon={IndianRupee}
          label="Average spend"
          value={formatAdminCurrency(spend / (customers.length || 1))}
          detail="Lifetime value"
          tone="orange"
        />
        <StatCard
          icon={UserCheck}
          label="Active accounts"
          value={`${Math.round((active / (customers.length || 1)) * 100)}%`}
          detail="Verified and active"
          tone="amber"
        />
      </section>
      {!filtered.length ? (
        <EmptyState title="No matching customers" />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[930px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {[
                    'Customer',
                    'Account ID',
                    'Membership',
                    'Orders',
                    'Lifetime spend',
                    'Status',
                    'Joined',
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
                {filtered.map((customer, index) => {
                  const percent = Math.min(
                    100,
                    Math.max(10, moneyValue(customer.totalSpent) / 3500),
                  )
                  const activeAccount = /active/i.test(customer.status)
                  return (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-[#fafcf9]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`grid size-11 shrink-0 place-items-center rounded-full text-[9px] font-extrabold ${index % 3 === 0 ? 'bg-[#dcebdd] text-[#397a4a]' : index % 3 === 1 ? 'bg-[#ffe9e2] text-[#b33b20]' : 'bg-violet-50 text-violet-700'}`}
                          >
                            {getInitials(customer.name)}
                          </span>
                          <span className="min-w-0">
                            <strong className="block max-w-48 truncate text-[10px] text-slate-900">
                              {customer.name}
                            </strong>
                            <span className="mt-0.5 block max-w-48 truncate text-[8px] text-slate-400">
                              {customer.email}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <strong className="text-[9px] text-[#397a4a]">
                            {customer.id}
                          </strong>
                          <button
                            type="button"
                            onClick={() => copy(customer.id)}
                            className="text-slate-400 hover:text-[#397a4a]"
                          >
                            {copiedId === customer.id ? (
                              <Check size={12} />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1.5 text-[8px] font-extrabold ${customer.role.includes('VIP') ? 'bg-violet-50 text-violet-700' : customer.role.includes('Pro') ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-600'}`}
                        >
                          {customer.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[10px] font-extrabold text-slate-700">
                        {customer.ordersCount} orders
                      </td>
                      <td className="px-5 py-4">
                        <strong className="text-[10px] text-slate-900">
                          {customer.totalSpent}
                        </strong>
                        <div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-[#397a4a]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[8px] font-extrabold ring-1 ring-inset ${activeAccount ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-amber-200'}`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${activeAccount ? 'bg-emerald-500' : 'bg-amber-500'}`}
                          />
                          {customer.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">
                        {customer.joinedDate}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <section className="grid gap-4 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-[28px] bg-[#17251c] p-6 text-white">
          <div className="absolute -right-14 -top-16 size-48 rounded-full bg-[#9bcaa6]/15 blur-2xl" />
          <ShieldCheck size={22} className="text-[#9bcaa6]" />
          <h3 className="mt-5 text-xl font-extrabold">
            Customer data stays protected
          </h3>
          <p className="mt-2 max-w-md text-xs leading-6 text-white/50">
            Account information is shown only inside the authenticated
            management workspace.
          </p>
        </article>
        <article className="rounded-[28px] bg-[#dcebdd] p-6">
          <Award size={22} className="text-[#397a4a]" />
          <h3 className="mt-5 text-xl font-extrabold text-[#253329]">
            Premium audience is growing
          </h3>
          <p className="mt-2 text-xs leading-6 text-[#5d705e]">
            VIP and Pro members represent a high-value segment worth nurturing
            with targeted offers.
          </p>
        </article>
      </section>
    </div>
  )
}
