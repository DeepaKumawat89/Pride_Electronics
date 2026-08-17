import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  CreditCard,
  Eye,
  ReceiptText,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'
import { EmptyState, Modal, PageHeader, StatCard } from '../components/ui/AdminUI'
import { createPaymentRecords } from '../utils/payments'

const filters = ['All', 'Successful', 'Failed', 'Pending', 'Refunded']

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
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const payments = useMemo(
    () => createPaymentRecords(orders, refunds),
    [orders, refunds],
  )
  const filtered = payments.filter(
    (payment) =>
      (statusFilter === 'All' || payment.status === statusFilter) &&
      (!searchQuery ||
        `${payment.id} ${payment.orderId} ${payment.customer} ${payment.email} ${payment.method}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())),
  )
  const count = (status) =>
    payments.filter((payment) => payment.status === status).length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance operations"
        title={`${payments.length} payment records`}
        description="Review transactions and reconcile every payment and refund with its originating order."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Successful" value={count('Successful')} detail="Verified payments" />
        <StatCard icon={ReceiptText} label="Pending" value={count('Pending')} detail="Awaiting completion" tone="amber" />
        <StatCard icon={TriangleAlert} label="Failed" value={count('Failed')} detail="Unsuccessful payments" tone="orange" />
        <StatCard icon={RotateCcw} label="Refunded" value={count('Refunded')} detail="Linked refund records" tone="violet" />
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[9px] font-extrabold transition ${statusFilter === status ? 'bg-[#397a4a] text-white' : 'border border-slate-200 bg-white text-slate-500'}`}
          >
            {status}
            <span className={`rounded-full px-1.5 py-0.5 text-[7px] ${statusFilter === status ? 'bg-white/15' : 'bg-slate-100'}`}>
              {status === 'All' ? payments.length : count(status)}
            </span>
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <EmptyState title="No matching payments" />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]">
                <tr>
                  {['Transaction ID', 'Order ID', 'Customer', 'Amount', 'Method', 'Status', 'Date', 'Action'].map((head) => (
                    <th key={head} className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Action' ? 'text-right' : ''}`}>{head}</th>
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
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedPayment(payment)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#17251c] px-3 text-[8px] font-extrabold text-white transition hover:bg-[#397a4a]"><Eye size={12} /> Reconcile</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(selectedPayment)}
        onClose={() => setSelectedPayment(null)}
        eyebrow="Payment reconciliation"
        title={selectedPayment ? selectedPayment.id : ''}
        maxWidth="max-w-2xl"
      >
        {selectedPayment && (
          <div className="space-y-5 p-5 sm:p-7">
            <ReconciliationSection icon={CreditCard} title="Payment">
              <ReconciliationField label="Transaction ID" value={selectedPayment.id} mono />
              <ReconciliationField label="Amount" value={selectedPayment.amount} />
              <ReconciliationField label="Method" value={selectedPayment.method} />
              <ReconciliationField label="Status" value={selectedPayment.status} />
              <ReconciliationField label="Date" value={formatDate(selectedPayment.date)} />
            </ReconciliationSection>
            <ReconciliationSection icon={ReceiptText} title="Linked order">
              <ReconciliationField label="Order ID" value={selectedPayment.orderId} mono />
              <ReconciliationField label="Customer" value={selectedPayment.customer} />
              <ReconciliationField label="Order status" value={selectedPayment.orderStatus} />
            </ReconciliationSection>
            <ReconciliationSection icon={RotateCcw} title="Linked refund">
              {selectedPayment.refund ? (
                <>
                  <ReconciliationField label="Refund ID" value={selectedPayment.refund.id} mono />
                  <ReconciliationField label="Payment ID" value={selectedPayment.refund.paymentId} mono />
                  <ReconciliationField label="Amount" value={selectedPayment.refund.amount} />
                  <ReconciliationField label="Status" value={selectedPayment.refund.status} />
                  <ReconciliationField label="Date" value={formatDate(selectedPayment.refund.date)} />
                </>
              ) : (
                <p className="text-[10px] text-slate-400">No refund is linked to this payment.</p>
              )}
            </ReconciliationSection>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ReconciliationSection({ icon: Icon, title, children }) {
  return (
    <section className="border-b border-slate-100 pb-5 last:border-0 last:pb-0">
      <h4 className="flex items-center gap-2 text-xs font-extrabold text-slate-900"><Icon size={15} className="text-[#397a4a]" /> {title}</h4>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">{children}</dl>
    </section>
  )
}

function ReconciliationField({ label, value, mono = false }) {
  return <div><dt className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">{label}</dt><dd className={`mt-1 break-all text-[10px] font-bold text-slate-700 ${mono ? 'font-mono' : ''}`}>{value || 'Not available'}</dd></div>
}
