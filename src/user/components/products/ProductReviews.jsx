import { ArrowRight, BadgeCheck, Star, ThumbsUp } from 'lucide-react'

export function RatingSummary({ product, reviews = [], showTitle = false }) {
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
      reviews.length
    : Number(product.rating || 0)
  const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((review) => Number(review.rating) === stars).length
    return {
      stars,
      percent: reviews.length ? Math.round((count / reviews.length) * 100) : 0,
    }
  })
  return (
    <div className="flex h-full flex-col rounded-[24px] bg-[#183020] p-6 text-white sm:p-7">
      {showTitle && <p className="mb-4 text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#9bcaa6]">Average Rating</p>}
      <div className="flex items-end gap-2"><strong className="text-5xl font-extrabold tracking-tight">{average.toFixed(1)}</strong><span className="pb-1.5 text-sm font-bold text-white/45">/ 5</span></div>
      <div className="mt-3 flex gap-1">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} className="fill-[#f8bd4f] text-[#f8bd4f]" />)}</div>
      <p className="mt-2 text-[11px] font-semibold text-white/55">Excellent customer rating</p>
      <div className="mt-6 space-y-3 lg:mt-auto lg:pt-8">
        {ratingBreakdown.map((item) => (
          <div key={item.stars} className="grid grid-cols-[24px_1fr_30px] items-center gap-2 text-[10px] font-bold">
            <span>{item.stars}</span><div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#9bcaa6]" style={{ width: `${item.percent}%` }} /></div><span className="text-right text-white/45">{item.percent}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewCard({ review }) {
  return (
    <article className="rounded-[22px] border border-slate-100 bg-[#fafbfa] p-4 transition hover:border-[#dcebdd] hover:bg-white hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3"><span className={`grid size-10 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${review.tone}`}>{review.initials}</span><div className="min-w-0"><p className="truncate text-xs font-extrabold text-slate-900">{review.name}</p><p className="mt-0.5 flex items-center gap-1 text-[9px] font-bold text-emerald-700"><BadgeCheck size={11} /> Verified purchase</p></div></div>
        <time className="shrink-0 text-[9px] font-semibold text-slate-400">{review.date}</time>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2"><span className="flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={12} className={star <= review.rating ? 'fill-[#ffb000] text-[#ffb000]' : 'fill-slate-200 text-slate-200'} />)}</span><strong className="text-[11px] text-slate-800">{review.title}</strong></div>
      <p className="mt-2 text-xs leading-6 text-slate-600">{review.text}</p>
      <button type="button" className="mt-3 flex items-center gap-1.5 text-[9px] font-bold text-slate-400 transition hover:text-[#397a4a]"><ThumbsUp size={12} /> Helpful</button>
    </article>
  )
}

export default function ProductReviews({ product, reviews = [], showAll = false, reviewsOnly = false, onViewAll }) {
  const visibleReviews = showAll ? reviews : reviews.slice(0, 2)

  if (reviewsOnly) {
    return (
      <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">Verified customer feedback</p><h2 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-slate-950">User Reviews</h2></div>
          <p className="text-xs font-semibold text-slate-400">Showing {visibleReviews.length} featured reviews</p>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {visibleReviews.map((review) => <ReviewCard key={review.id || review.name} review={review} />)}
          {!visibleReviews.length && <p className="col-span-full rounded-[22px] border border-dashed border-slate-200 px-5 py-10 text-center text-xs font-semibold text-slate-400">No published reviews yet.</p>}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">Real customer experiences</p><h2 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-slate-950">Customer Reviews & Ratings</h2></div>
        <p className="text-xs font-semibold text-slate-400">Based on {reviews.length} verified purchases</p>
      </div>

      <div className={`mt-7 grid gap-5 ${showAll ? 'lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start' : 'lg:grid-cols-[360px_minmax(0,1fr)]'}`}>
        <RatingSummary product={product} reviews={reviews} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          {visibleReviews.map((review) => <ReviewCard key={review.id || review.name} review={review} />)}
          {!visibleReviews.length && <p className="rounded-[22px] border border-dashed border-slate-200 px-5 py-10 text-center text-xs font-semibold text-slate-400 sm:col-span-2 lg:col-span-1">No published reviews yet.</p>}
          {!showAll && (
            <button type="button" onClick={onViewAll} className="flex h-12 items-center justify-center gap-2 rounded-full border border-[#b9d4bf] bg-[#f2f8f3] text-xs font-extrabold text-[#397a4a] transition hover:border-[#397a4a] hover:bg-[#397a4a] hover:text-white sm:col-span-2 lg:col-span-1">
              View All Reviews <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
