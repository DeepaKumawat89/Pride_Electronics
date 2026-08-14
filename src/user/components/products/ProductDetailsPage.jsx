import { useState } from 'react'
import {
  ArrowLeft,
  BatteryCharging,
  Check,
  ChevronDown,
  ChevronRight,
  Cpu,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Settings2,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Wifi,
  Zap,
} from 'lucide-react'
import { formatCurrency, parsePrice } from '../../utils/currency'
import ProductCard from './ProductCard'
import ProductReviews from './ProductReviews'

function getSpecificationMeta(spec) {
  const value = spec.toLowerCase()
  if (/battery|charge|power/.test(value)) return { title: 'Power & Battery', description: 'Power efficiency, charging, and usage information', icon: BatteryCharging }
  if (/wifi|bluetooth|gps|usb|pcie|wireless|codec|connect/.test(value)) return { title: 'Connectivity & Interfaces', description: 'Wireless standards, ports, and compatible connections', icon: Wifi }
  if (/processor|core|ai |audio|driver|display|resolution|hz|tops/.test(value)) return { title: 'Performance & Technology', description: 'Core performance, processing, and product technology', icon: Cpu }
  return { title: 'Features & Compatibility', description: 'Design details, supported features, and everyday usability', icon: Settings2 }
}

export default function ProductDetailsPage({ product, relatedProducts = [], likedIds = [], onBack, onLike, onAdd, onBuyNow, onViewProduct, onViewAllReviews }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [expandedSpec, setExpandedSpec] = useState(null)

  const images = product.images?.length ? product.images : [product.image]
  const activeImage = images[activeImageIndex] || images[0]
  const stock = Number(product.stock) || 0
  const liked = likedIds.includes(product.id)

  const updateQuantity = (amount) => {
    setQuantity((current) => Math.min(Math.max(current + amount, 1), Math.max(stock, 1)))
  }

  const handleShare = async () => {
    const shareData = { title: product.name, text: product.description, url: window.location.href }
    try {
      if (navigator.share) await navigator.share(shareData)
      else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href)
    } catch {
      return
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-[#f7f8f5]">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-10">
        <nav className="mb-5 flex items-center gap-2 overflow-hidden text-[11px] font-bold text-slate-400 sm:mb-7" aria-label="Breadcrumb">
          <button type="button" onClick={onBack} className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3.5 py-2 text-slate-700 shadow-sm transition hover:bg-slate-950 hover:text-white">
            <ArrowLeft size={14} /> Back
          </button>
          <span className="hidden sm:inline">Home</span>
          <ChevronRight size={13} className="hidden shrink-0 sm:inline" />
          <span className="hidden sm:inline">{product.category}</span>
          <ChevronRight size={13} className="hidden shrink-0 sm:inline" />
          <span className="truncate text-slate-600">{product.name}</span>
        </nav>

        <section className="mx-auto max-w-[1220px] overflow-hidden rounded-[26px] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)] lg:rounded-[32px]">
          <div className="grid lg:grid-cols-[1.08fr_.92fr]">
            <div className="bg-[#eef4ed] p-4 sm:p-6 lg:p-7">
              <div className="relative overflow-hidden rounded-[22px] bg-white sm:rounded-[26px]">
                <img src={activeImage} alt={product.name} className="aspect-[4/3] size-full object-cover transition duration-500 lg:aspect-[11/10]" />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-800 shadow-sm backdrop-blur">{product.badge}</span>
                <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/90 p-1.5 shadow-lg backdrop-blur">
                  <button type="button" onClick={() => onLike(product.id)} className={`grid size-9 place-items-center rounded-full transition ${liked ? 'bg-[#ff5c35] text-white' : 'text-slate-600 hover:bg-[#ffe9e2] hover:text-[#ff5c35]'}`} aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'} title={liked ? 'Remove from wishlist' : 'Add to wishlist'}>
                    <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
                  </button>
                  <button type="button" onClick={handleShare} className="grid size-9 place-items-center rounded-full text-slate-600 transition hover:bg-[#e4f1e7] hover:text-[#366643]" aria-label="Share product" title="Share product">
                    <Share2 size={17} />
                  </button>
                </div>
                <span className={`absolute bottom-4 left-4 rounded-full px-3 py-1.5 text-[10px] font-extrabold shadow-sm backdrop-blur ${stock > 0 ? 'bg-emerald-50/95 text-emerald-700' : 'bg-red-50/95 text-red-700'}`}>
                  {stock > 0 ? 'In stock' : 'Out of stock'}
                </span>
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 flex max-w-[58%] -translate-x-1/2 gap-1.5 rounded-2xl bg-white/85 p-1.5 shadow-xl backdrop-blur-md sm:bottom-4 sm:gap-2 sm:p-2">
                  {images.map((image, index) => (
                    <button key={`${image}-${index}`} type="button" onClick={() => setActiveImageIndex(index)} className={`size-10 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-0.5 transition hover:-translate-y-0.5 sm:size-12 ${activeImageIndex === index ? 'border-[#ff5c35] shadow-md' : 'border-transparent opacity-75 hover:border-slate-200 hover:opacity-100'}`} aria-label={`View product image ${index + 1}`}>
                      <img src={image} alt={`${product.name} view ${index + 1}`} className="size-full rounded-lg object-cover" />
                    </button>
                  ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-8">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">{product.category}</span>

              <h1 className="mt-3 text-3xl font-extrabold leading-[1.1] tracking-[-0.045em] text-slate-950 sm:text-4xl">{product.name}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">{product.description}</p>

              <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-slate-600">
                <span className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} className="fill-[#ffb000] text-[#ffb000]" />)}</span>
                <strong className="text-slate-900">{product.rating}</strong>
                <span className="text-slate-400">{product.reviewsCount} ratings & reviews</span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-slate-100 py-3.5">
                <strong className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{formatCurrency(parsePrice(product.price))}</strong>
                <span className="text-sm font-semibold text-slate-400 line-through">{formatCurrency(parsePrice(product.originalPrice))}</span>
                <span className="rounded-full bg-[#e4f1e7] px-2.5 py-1 text-[10px] font-extrabold text-[#366643]">{product.discount}</span>
                <p className="w-full text-[10px] font-bold text-slate-400">Inclusive of all taxes</p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Quantity</p>
                  <div className="flex h-12 w-36 items-center justify-between rounded-full border border-slate-200 bg-slate-50 p-1">
                    <button type="button" onClick={() => updateQuantity(-1)} disabled={quantity <= 1} className="grid size-9 place-items-center rounded-full text-slate-600 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30" aria-label="Decrease quantity"><Minus size={15} /></button>
                    <strong className="text-sm text-slate-950">{quantity}</strong>
                    <button type="button" onClick={() => updateQuantity(1)} disabled={quantity >= stock} className="grid size-9 place-items-center rounded-full text-slate-600 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30" aria-label="Increase quantity"><Plus size={15} /></button>
                  </div>
                </div>
                <p className={`pb-3 text-[11px] font-extrabold ${stock > 0 && stock < 10 ? 'text-amber-600' : stock > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {stock === 0 ? 'Currently unavailable' : stock < 10 ? `Only ${stock} units left` : `${stock} units available`}
                </p>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <button type="button" disabled={!stock} onClick={() => onAdd(product, quantity)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-extrabold text-white transition hover:bg-[#ff5c35] disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-[52px]">
                  <ShoppingBag size={17} /> Add to cart
                </button>
                <button type="button" disabled={!stock} onClick={() => onBuyNow(product, quantity)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#397a4a] px-4 text-xs font-extrabold text-white transition hover:bg-[#2f663d] disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-[52px]">
                  <Zap size={17} fill="currentColor" /> Buy now
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                {[
                  [Truck, 'Fast delivery'],
                  [ShieldCheck, '2-year warranty'],
                  [RotateCcw, 'Easy returns'],
                ].map(([Icon, label]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 px-2 py-3 text-center text-[9px] font-extrabold text-slate-600 sm:flex sm:items-center sm:justify-center sm:gap-2 sm:text-[10px]">
                    <Icon size={16} className="mx-auto mb-1 text-[#4f8a5d] sm:mx-0 sm:mb-0" /> {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-6 max-w-[1220px] overflow-hidden rounded-[28px] bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-r from-[#dcebdd] via-[#edf5ee] to-white px-5 py-6 sm:px-8 sm:py-8">
            <div className="absolute -right-12 -top-20 size-52 rounded-full bg-[#9bcaa6]/30 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#397a4a] text-white shadow-lg shadow-[#397a4a]/20"><Sparkles size={19} /></span>
              <div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#397a4a]">Everything you need to know</p><h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">Product Specifications</h2></div>
            </div>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-8">
            {(product.specs?.length ? product.specs : ['Premium quality construction', 'Designed for reliable everyday performance']).map((spec, index) => {
              const meta = getSpecificationMeta(spec)
              const Icon = meta.icon
              const isExpanded = expandedSpec === index
              return (
                <article key={spec} className={`self-start overflow-hidden rounded-[22px] border transition ${isExpanded ? 'border-[#9bcaa6] bg-white shadow-lg shadow-slate-900/5' : 'border-[#dcebdd] bg-[#f8faf7] hover:border-[#9bcaa6] hover:bg-white'}`}>
                  <button type="button" onClick={() => setExpandedSpec(isExpanded ? null : index)} className="flex w-full items-center gap-3 p-4 text-left sm:p-5" aria-expanded={isExpanded}>
                    <span className={`grid size-10 shrink-0 place-items-center rounded-2xl transition ${isExpanded ? 'bg-[#397a4a] text-white' : 'bg-white text-[#397a4a] shadow-sm'}`}><Icon size={18} /></span>
                    <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-900">{meta.title}</strong><span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-400">{meta.description}</span></span>
                    <span className={`grid size-8 shrink-0 place-items-center rounded-full border transition ${isExpanded ? 'rotate-180 border-[#397a4a] bg-[#397a4a] text-white' : 'border-slate-200 bg-white text-slate-500'}`}><ChevronDown size={15} /></span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-[#dcebdd] px-4 pb-5 pt-4 sm:px-5">
                      <div className="flex items-start gap-3 rounded-2xl bg-[#eef6ef] p-4"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-white text-[#397a4a] shadow-sm"><Check size={12} /></span><p className="text-xs font-bold leading-6 text-slate-700">{spec}</p></div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>

        <div className="mx-auto mt-6 max-w-[1220px]">
          <ProductReviews product={product} onViewAll={onViewAllReviews} />
        </div>

        {!!relatedProducts.length && (
          <section className="py-12 sm:py-16">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">Picked for you</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-slate-950 sm:text-3xl">Related & recommended</h2><p className="mt-2 text-sm text-slate-500">More products from this category and other relevant picks.</p></div>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-x-3 gap-y-9 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} liked={likedIds.includes(related.id)} onLike={onLike} onAdd={onAdd} onBuyNow={onBuyNow} onView={onViewProduct} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
