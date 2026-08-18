import { useState } from 'react'
import { CheckCircle2, EyeOff, MessageSquareText, Star, Trash2 } from 'lucide-react'
import { EmptyState, PageHeader, StatCard } from '../components/ui/AdminUI'

const filters = ['All', 'Published', 'Hidden', 'Pending']

export default function ReviewsPage({ reviews = [], onUpdateReview, onDeleteReview, searchQuery = '' }) {
  const [filter, setFilter] = useState('All')
  const filtered = reviews.filter((review) =>
    (filter === 'All' || review.status === filter) &&
    (!searchQuery || `${review.name} ${review.title} ${review.text}`.toLowerCase().includes(searchQuery.toLowerCase())),
  )
  const count = (status) => reviews.filter((review) => review.status === status).length

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Customer feedback" title={`${reviews.length} product reviews`} description="Publish, hide, or remove customer reviews while keeping approved feedback visible on the storefront." />
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard icon={MessageSquareText} label="All reviews" value={reviews.length} detail="Submitted feedback" />
        <StatCard icon={CheckCircle2} label="Published" value={count('Published')} detail="Visible to customers" tone="amber" />
        <StatCard icon={EyeOff} label="Needs attention" value={count('Pending') + count('Hidden')} detail="Pending or hidden" tone="orange" />
      </section>
      <div className="flex gap-2 overflow-x-auto pb-2">{filters.map((status) => <button key={status} type="button" onClick={() => setFilter(status)} className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[9px] font-extrabold transition ${filter === status ? 'bg-[#397a4a] text-white' : 'border border-slate-200 bg-white text-slate-500'}`}>{status}<span className={`rounded-full px-1.5 py-0.5 text-[7px] ${filter === status ? 'bg-white/15' : 'bg-slate-100'}`}>{status === 'All' ? reviews.length : count(status)}</span></button>)}</div>
      {!filtered.length ? (
        <EmptyState title={reviews.length ? 'No matching reviews' : 'No reviews yet'} text={reviews.length ? 'Try another search or status.' : 'Customer reviews will appear here for moderation.'} />
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm">
          {filtered.map((review) => (
            <article key={review.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className={`grid size-11 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${review.tone || 'bg-[#dcebdd] text-[#366643]'}`}>{review.initials || review.name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2)}</span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><strong className="text-xs text-slate-900">{review.name}</strong><span className={`rounded-full px-2 py-1 text-[7px] font-extrabold ${review.status === 'Published' ? 'bg-emerald-50 text-emerald-700' : review.status === 'Pending' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{review.status}</span><span className="text-[9px] text-slate-400">{review.date}</span></div><div className="mt-2 flex items-center gap-2"><span className="flex">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={12} className={star <= review.rating ? 'fill-[#ffb000] text-[#ffb000]' : 'text-slate-200'} />)}</span><strong className="text-[10px] text-slate-700">{review.title}</strong></div><p className="mt-2 text-xs leading-6 text-slate-500">{review.text}</p></div>
                <div className="flex shrink-0 gap-2"><button type="button" onClick={() => onUpdateReview({ ...review, status: review.status === 'Published' ? 'Hidden' : 'Published' })} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-100 px-3 text-[8px] font-extrabold text-slate-600 hover:text-[#397a4a]">{review.status === 'Published' ? <EyeOff size={12} /> : <CheckCircle2 size={12} />}{review.status === 'Published' ? 'Hide' : 'Publish'}</button><button type="button" onClick={() => onDeleteReview(review.id)} className="grid size-9 place-items-center rounded-full bg-red-50 text-red-500 hover:bg-red-100" aria-label={`Delete review by ${review.name}`}><Trash2 size={13} /></button></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
