import { useMemo } from 'react'
import {
  CheckCircle2,
  RotateCcw,
} from 'lucide-react'
import { EmptyState, PageHeader, StatCard } from '../components/ui/AdminUI'
import { createPaymentRecords } from '../utils/payments'

const paymentTone = {
  Successful: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Failed: 'bg-red-50 text-red-700 ring-red-200',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  Refunded: 'bg-violet-50 text-violet-700 ring-violet-200',
}

const formatDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value || 'Not available'
    : date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
}

export default function PaymentsPage({
  orders = [],
  refunds = [],
  searchQuery = '',
}) {
  const payments = useMemo(
    () => createPaymentRecords(orders, refunds),
    [orders, refunds],
  )
  const filtered = payments.filter(
    (payment) =>
      !searchQuery ||
        `${payment.id} ${payment.orderId} ${payment.customer} ${payment.email} ${payment.method}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
  )
  const count = (status) =>
    payments.filter((payment) => payment.status === status).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance operations"
        title={`${payments.length} payment records`}
        description="Review every payment and refund with its originating order."
      />

      <section className="grid grid-cols-2 gap-3">
        <StatCard icon={CheckCircle2} label="Successful" value={count('Successful')} detail="Verified payments" />
        <StatCard icon={RotateCcw} label="Refunded" value={count('Refunded')} detail="Linked refund records" tone="violet" />
      </section>

      {!filtered.length ? (
        <EmptyState title="No matching payments" />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {['Transaction ID', 'Order ID', 'Customer', 'Amount', 'Method', 'Status', 'Date'].map((head) => (
                    <th key={head} className="px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((payment) => (
                  <tr key={payment.id} className="transition hover:bg-[#fafcf9]">
                    <td className="px-5 py-4 font-mono text-[9px] font-bold text-[#397a4a]">{payment.id}</td>
                    <td className="px-5 py-4 text-[9px] font-extrabold text-slate-700">{payment.orderId}</td>
                    <td className="px-5 py-4"><strong className="block text-[10px] text-slate-800">{payment.customer}</strong><span className="mt-1 block text-[8px] text-slate-400">{payment.email}</span></td>
                    <td className="px-5 py-4 text-xs font-extrabold text-slate-900">{payment.amount}</td>
                    <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">{payment.method}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[8px] font-extrabold ring-1 ring-inset ${paymentTone[payment.status]}`}>{payment.status}</span></td>
                    <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">{formatDate(payment.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
