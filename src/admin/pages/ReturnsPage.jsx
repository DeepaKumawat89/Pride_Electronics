import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  Eye,
  Image,
  PackageCheck,
  RotateCcw,
  Truck,
  XCircle,
} from 'lucide-react'
import { EmptyState, Modal, PageHeader, StatCard } from '../components/ui/AdminUI'

const filters = ['All', 'Requested', 'In Progress', 'Completed', 'Rejected']

const statusTone = (status) => {
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'Rejected') return 'bg-red-50 text-red-700 ring-red-200'
  if (status === 'Requested') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-violet-50 text-violet-700 ring-violet-200'
}

const matchesFilter = (request, filter) =>
  filter === 'All' ||
  request.status === filter ||
  (filter === 'In Progress' &&
    !['Requested', 'Completed', 'Rejected'].includes(request.status))

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

export default function ReturnsPage({
  returns = [],
  searchQuery = '',
  onUpdateReturn,
  pickupSettings,
}) {
  const [filter, setFilter] = useState('All')
  const [selectedId, setSelectedId] = useState(null)
  const selectedReturn = returns.find((request) => request.id === selectedId)
  const filtered = useMemo(
    () =>
      returns.filter(
        (request) =>
          matchesFilter(request, filter) &&
          (!searchQuery ||
            `${request.id} ${request.orderId} ${request.customer} ${request.email} ${request.reason}`
              .toLowerCase()
              .includes(searchQuery.toLowerCase())),
      ),
    [returns, filter, searchQuery],
  )
  const count = (status) =>
    returns.filter((request) => matchesFilter(request, status)).length
  const update = (action, options) => {
    onUpdateReturn(selectedReturn.id, action, options)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reverse logistics"
        title={`${returns.length} return requests`}
        description="Review customer evidence, coordinate pickup and inspection, and complete refunds or replacements."
      />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={RotateCcw} label="Requested" value={count('Requested')} detail="Awaiting admin review" tone="amber" />
        <StatCard icon={Truck} label="In progress" value={count('In Progress')} detail="Pickup or inspection" tone="violet" />
        <StatCard icon={CheckCircle2} label="Completed" value={count('Completed')} detail="Resolved requests" />
        <StatCard icon={XCircle} label="Rejected" value={count('Rejected')} detail="Declined requests" tone="orange" />
      </section>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((status) => (
          <button key={status} type="button" onClick={() => setFilter(status)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[9px] font-extrabold transition ${filter === status ? 'bg-[#397a4a] text-white' : 'border border-slate-200 bg-white text-slate-500'}`}>{status}<span className={`rounded-full px-1.5 py-0.5 text-[7px] ${filter === status ? 'bg-white/15' : 'bg-slate-100'}`}>{count(status)}</span></button>
        ))}
      </div>
      {!filtered.length ? (
        <EmptyState title="No matching return requests" />
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] border-collapse text-left">
              <thead className="bg-[#f3f7f2]"><tr>{['Return ID', 'Order ID', 'Customer', 'Reason', 'Requested', 'Status', 'Resolution', 'Action'].map((head) => <th key={head} className={`px-5 py-4 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500 ${head === 'Action' ? 'text-right' : ''}`}>{head}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((request) => (
                  <tr key={request.id} className="transition hover:bg-[#fafcf9]">
                    <td className="px-5 py-4 font-mono text-[9px] font-bold text-[#397a4a]">{request.id}</td>
                    <td className="px-5 py-4 text-[9px] font-extrabold text-slate-700">{request.orderId}</td>
                    <td className="px-5 py-4"><strong className="block text-[10px] text-slate-800">{request.customer}</strong><span className="mt-1 block text-[8px] text-slate-400">{request.email}</span></td>
                    <td className="px-5 py-4"><span className="block max-w-48 truncate text-[9px] font-semibold text-slate-500">{request.reason}</span></td>
                    <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">{formatDate(request.requestedAt)}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1.5 text-[8px] font-extrabold ring-1 ring-inset ${statusTone(request.status)}`}>{request.status}</span></td>
                    <td className="px-5 py-4 text-[9px] font-semibold text-slate-500">{request.resolution || 'Not decided'}</td>
                    <td className="px-5 py-4 text-right"><button type="button" onClick={() => setSelectedId(request.id)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#17251c] px-3 text-[8px] font-extrabold text-white transition hover:bg-[#397a4a]"><Eye size={12} /> Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={Boolean(selectedReturn)} onClose={() => setSelectedId(null)} eyebrow="Return review" title={selectedReturn?.id || ''} maxWidth="max-w-3xl">
        {selectedReturn && (
          <div className="space-y-5 p-5 sm:p-7">
            <div className="grid gap-4 border-b border-slate-200 pb-5 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Order ID" value={selectedReturn.orderId} />
              <Detail label="Customer" value={selectedReturn.customer} />
              <Detail label="Amount" value={selectedReturn.amount} />
              <Detail label="Status" value={selectedReturn.status} />
              <Detail label="Return reason" value={selectedReturn.reason} />
              <Detail label="Inspection" value={selectedReturn.inspectionResult || 'Pending'} />
              <Detail label="Resolution" value={selectedReturn.resolution || 'Not decided'} />
              <Detail label="Refund status" value={selectedReturn.refundStatus} />
              <Detail
                label="Pickup service"
                value={
                  pickupSettings?.enabled
                    ? `${pickupSettings.processingHours}h · ${pickupSettings.address}`
                    : 'Disabled in shipping settings'
                }
              />
            </div>
            <section>
              <h4 className="flex items-center gap-2 text-xs font-extrabold text-slate-900"><Image size={15} className="text-[#397a4a]" /> Customer images</h4>
              {selectedReturn.images?.length ? (
                <div className="mt-3 flex flex-wrap gap-3">{selectedReturn.images.map((image, index) => <a key={`${image.name}-${index}`} href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.name || `Return evidence ${index + 1}`} className="size-24 rounded-2xl border border-slate-200 object-cover" /></a>)}</div>
              ) : <p className="mt-3 text-[10px] text-slate-400">No customer images were attached.</p>}
            </section>
            <section className="border-t border-slate-100 pt-5">
              <h4 className="text-xs font-extrabold text-slate-900">Return progress</h4>
              <div className="mt-3 divide-y divide-slate-100">{selectedReturn.history?.map((event, index) => <div key={`${event.timestamp}-${index}`} className="flex items-start justify-between gap-4 py-3"><div><strong className="text-[10px] text-slate-700">{event.status}</strong><p className="mt-1 text-[8px] text-slate-400">{event.note}</p></div><span className="shrink-0 text-[8px] text-slate-400">{formatDate(event.timestamp)}</span></div>)}</div>
            </section>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5"><ReturnActions request={selectedReturn} onUpdate={update} pickupEnabled={pickupSettings?.enabled !== false} /></div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function ReturnActions({ request, onUpdate, pickupEnabled }) {
  const button = 'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[9px] font-extrabold transition'
  if (request.status === 'Requested') return <><button type="button" onClick={() => onUpdate('approve')} className={`${button} bg-[#397a4a] text-white hover:bg-[#2f663d]`}><CheckCircle2 size={14} /> Approve</button><button type="button" onClick={() => onUpdate('reject')} className={`${button} bg-red-50 text-red-600 hover:bg-red-100`}><XCircle size={14} /> Reject</button></>
  if (request.status === 'Approved') return <button type="button" disabled={!pickupEnabled} onClick={() => onUpdate('schedule_pickup')} className={`${button} bg-[#17251c] text-white disabled:cursor-not-allowed disabled:opacity-40`}><Truck size={14} /> {pickupEnabled ? 'Schedule pickup' : 'Pickup disabled'}</button>
  if (request.status === 'Pickup Scheduled') return <button type="button" onClick={() => onUpdate('receive_product')} className={`${button} bg-[#397a4a] text-white`}><PackageCheck size={14} /> Product received</button>
  if (request.status === 'Product Received') return <><button type="button" onClick={() => onUpdate('inspect', { inspectionResult: 'Sellable' })} className={`${button} bg-[#397a4a] text-white`}><CheckCircle2 size={14} /> Pass inspection</button><button type="button" onClick={() => onUpdate('inspect', { inspectionResult: 'Damaged' })} className={`${button} bg-red-50 text-red-600`}><XCircle size={14} /> Mark damaged</button></>
  if (request.status === 'Inspected') return <><button type="button" onClick={() => onUpdate('request_refund')} className={`${button} bg-[#17251c] text-white`}><RotateCcw size={14} /> Refund</button><button type="button" onClick={() => onUpdate('create_replacement')} className={`${button} bg-[#397a4a] text-white`}><PackageCheck size={14} /> Replacement</button></>
  if (request.status === 'Refund Requested') return <button type="button" onClick={() => onUpdate('start_refund')} className={`${button} bg-[#17251c] text-white`}><RotateCcw size={14} /> Start refund</button>
  if (request.status === 'Refund Processing') return <button type="button" onClick={() => onUpdate('complete_refund')} className={`${button} bg-[#397a4a] text-white`}><CheckCircle2 size={14} /> Complete refund</button>
  if (request.status === 'Replacement Processing') return <button type="button" onClick={() => onUpdate('complete_replacement')} className={`${button} bg-[#397a4a] text-white`}><CheckCircle2 size={14} /> Complete replacement</button>
  return <p className="text-[10px] font-bold text-slate-400">No further action is required.</p>
}

function Detail({ label, value }) {
  return <div><p className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p><strong className="mt-1.5 block break-words text-[10px] text-slate-800">{value || 'Not available'}</strong></div>
}
