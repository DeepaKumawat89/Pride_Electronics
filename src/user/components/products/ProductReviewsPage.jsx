import { ArrowLeft, ChevronRight, MessageSquareText } from 'lucide-react'
import ProductReviews, { RatingSummary } from './ProductReviews'

export default function ProductReviewsPage({ product, reviews = [], onBack }) {
  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1220px] px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
        <nav className="mb-5 flex items-center gap-2 overflow-hidden text-[11px] font-bold text-slate-400 sm:mb-7" aria-label="Breadcrumb">
          <button type="button" onClick={onBack} className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-slate-700 shadow-sm transition hover:bg-slate-950 hover:text-white"><ArrowLeft size={14} /> Product details</button>
          <span className="hidden truncate sm:inline">{product.name}</span><ChevronRight size={13} className="hidden shrink-0 sm:inline" /><span className="truncate text-slate-600">Reviews</span>
        </nav>

        <div className="mb-6 grid gap-5 md:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
          <header className="relative overflow-hidden rounded-[28px] bg-[#dcebdd] px-5 py-7 sm:px-8 sm:py-9">
            <div className="absolute -right-12 -top-20 size-60 rounded-full bg-[#9bcaa6]/35 blur-3xl" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#aacfb3]/45 to-transparent" />
            <div className="relative flex h-full flex-col justify-between gap-6">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#397a4a]">Verified customer feedback</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-4xl">All Reviews</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Read what customers say about {product.name}.</p></div>
              <div className="flex w-fit items-center gap-3 rounded-2xl bg-white/75 px-4 py-3 shadow-sm backdrop-blur"><span className="grid size-10 place-items-center rounded-xl bg-[#397a4a] text-white"><MessageSquareText size={18} /></span><div><p className="text-lg font-extrabold text-slate-950">{reviews.length}</p><p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Featured reviews</p></div></div>
            </div>
          </header>
          <RatingSummary product={product} reviews={reviews} showTitle />
        </div>

        <ProductReviews product={product} reviews={reviews} showAll reviewsOnly />
      </div>
    </div>
  )
}
