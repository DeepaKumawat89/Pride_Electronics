import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Zap,
} from 'lucide-react'
import { formatCurrency, hasValidPrice, parsePrice } from '../../utils/currency'
import { getPinDeliveryAvailability } from '../../utils/address'
import {
  getDeliveryEstimate,
  getProductDetailInformation,
} from '../../utils/productDetails'
import ProductCard from './ProductCard'
import ProductReviews from './ProductReviews'
import { initialShippingSettings } from '../../../data/shipping'
import { initialInvoiceSettings } from '../../../data/invoice'
import { getDisplaySpecifications } from '../../../utils/productSpecifications'
import {
  getProductVariants,
  productForVariant,
} from '../../../utils/productVariants'

function TechnicalSpecificationsSection({ specifications }) {
  if (!specifications.length) return null

  return (
    <section className="mt-6 border-b border-slate-100 pb-6" aria-labelledby="technical-specifications-heading">
      <h3 id="technical-specifications-heading" className="text-sm font-extrabold text-slate-900">Technical Specifications</h3>
      <dl className="mt-4 grid gap-px overflow-hidden rounded-[22px] border border-[#dcebdd] bg-[#dcebdd] sm:grid-cols-2">
        {specifications.map((specification, index) => (
          <div key={`${specification.id}-${index}`} className="grid grid-cols-[minmax(100px,0.8fr)_minmax(0,1.2fr)] gap-3 bg-[#f8faf7] px-4 py-3 text-xs sm:px-5">
            <dt className="font-semibold text-slate-400">{specification.label}</dt>
            <dd className="min-w-0 break-words font-bold text-slate-700">{specification.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default function ProductDetailsPage({ product, relatedProducts = [], deliveryAddress, likedIds = [], reviews, onBack, onLike, onAdd, onBuyNow, onViewProduct, onViewAllReviews, shippingSettings = initialShippingSettings, taxSettings = initialInvoiceSettings.tax }) {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState('')

  const variants = getProductVariants(product)
  const requiresVariantSelection = variants.length > 0
  const selectedVariantProduct = productForVariant(product, selectedVariantId)
  const displayProduct = selectedVariantProduct || product
  const images = displayProduct.images?.length ? displayProduct.images : [displayProduct.image]
  const activeImage = images[activeImageIndex] || images[0]
  const stock = Math.max(0, Number(displayProduct.stock) || 0)
  const purchaseLimit = Math.min(stock, 100)
  const priceAvailable = hasValidPrice(displayProduct.price)
  const liked = likedIds.includes(product.id)
  const detailInformation = getProductDetailInformation(displayProduct)
  const displaySpecifications = getDisplaySpecifications(displayProduct)
  const pinDeliveryAvailability = deliveryAddress
    ? getPinDeliveryAvailability(deliveryAddress.pincode, new Date(), shippingSettings)
    : null
  const deliveryEstimate = deliveryAddress
    ? pinDeliveryAvailability?.estimatedDateLabel
    : getDeliveryEstimate(stock)
  const deliveryAvailable =
    stock > 0 && (!deliveryAddress || pinDeliveryAvailability?.available)
  const deliveryDestination = deliveryAddress
    ? `${deliveryAddress.city} ${deliveryAddress.pincode}`
    : 'your location'
  const productInformation = [
    ['Brand', detailInformation.brand],
    ['Model number', detailInformation.modelNumber],
    ['SKU', detailInformation.sku],
    ['Manufacturer', detailInformation.manufacturer],
    ['Country of origin', detailInformation.countryOfOrigin],
  ].filter(([, value]) => String(value || '').trim())
  const hasProductDetails =
    detailInformation.highlights.length > 0 ||
    displaySpecifications.length > 0 ||
    detailInformation.includedItems.length > 0 ||
    productInformation.length > 0 ||
    Boolean(detailInformation.warranty || detailInformation.returnPolicy)

  const updateQuantity = (amount) => {
    setQuantity((current) =>
      Math.min(Math.max(current + amount, 1), Math.max(purchaseLimit, 1)),
    )
  }

  const handleShare = async () => {
    const shareData = { title: product.name, text: displayProduct.description, url: window.location.href }
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

              {requiresVariantSelection && (
                <div className="mt-4">
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Select variant *</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {variants.map((variant) => {
                      const available = Math.max(0, Number(variant.stock) || 0)
                      const selected = String(selectedVariantId) === String(variant.id)
                      const variantProduct = productForVariant(product, variant.id)
                      return (
                        <button key={variant.id} type="button" disabled={!available} onClick={() => { setSelectedVariantId(variant.id); setActiveImageIndex(0); setQuantity(1) }} className={`rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${selected ? 'border-[#397a4a] bg-[#eef6ef] shadow-sm' : 'border-slate-200 bg-white hover:border-[#9bcaa6]'}`}>
                          <strong className="block text-[11px] text-slate-900">{variant.name}</strong>
                          <span className="mt-1 block text-[9px] font-bold text-[#397a4a]">{formatCurrency(parsePrice(variantProduct?.price))} · {available} available</span>
                        </button>
                      )
                    })}
                  </div>
                  {!selectedVariantProduct && <p className="mt-2 text-[9px] font-bold text-amber-700">Choose a variant before adding this product to your cart.</p>}
                </div>
              )}

              {product.reviewsCount > 0 ? (
                <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="flex items-center gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={14} className={star <= Math.round(Number(product.rating || 0)) ? 'fill-[#ffb000] text-[#ffb000]' : 'fill-slate-200 text-slate-200'} />)}</span>
                  <strong className="text-slate-900">{Number(product.rating || 0).toFixed(1)}</strong>
                  <span className="text-slate-400">{product.reviewsCount} {product.reviewsCount === 1 ? 'rating & review' : 'ratings & reviews'}</span>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold text-slate-500">No reviews yet</span>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-y border-slate-100 py-3.5">
                <strong className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{priceAvailable ? formatCurrency(parsePrice(displayProduct.price)) : 'Price unavailable'}</strong>
                <span className="text-sm font-semibold text-slate-400 line-through">{formatCurrency(parsePrice(displayProduct.originalPrice))}</span>
                {displayProduct.discount && <span className="rounded-full bg-[#e4f1e7] px-2.5 py-1 text-[10px] font-extrabold text-[#366643]">{displayProduct.discount}</span>}
                <p className="w-full text-[10px] font-bold text-slate-400">{taxSettings.pricesIncludeTax ? 'Inclusive of all taxes' : 'Taxes calculated at checkout'}</p>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Quantity</p>
                  <div className="flex h-12 w-36 items-center justify-between rounded-full border border-slate-200 bg-slate-50 p-1">
                    <button type="button" onClick={() => updateQuantity(-1)} disabled={quantity <= 1} className="grid size-9 place-items-center rounded-full text-slate-600 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30" aria-label="Decrease quantity"><Minus size={15} /></button>
                    <strong className="text-sm text-slate-950">{quantity}</strong>
                    <button type="button" onClick={() => updateQuantity(1)} disabled={quantity >= purchaseLimit} className="grid size-9 place-items-center rounded-full text-slate-600 transition hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30" aria-label="Increase quantity"><Plus size={15} /></button>
                  </div>
                </div>
                <p className={`pb-3 text-[11px] font-extrabold ${stock > 0 && stock < 10 ? 'text-amber-600' : stock > 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  {stock === 0 ? 'Currently unavailable' : stock < 10 ? `Only ${stock} units left` : `${stock} units available`}
                </p>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <button type="button" disabled={!stock || !priceAvailable || (requiresVariantSelection && !selectedVariantProduct)} onClick={() => onAdd(displayProduct, quantity)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-xs font-extrabold text-white transition hover:bg-[#ff5c35] disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-[52px]">
                  <ShoppingBag size={17} /> {requiresVariantSelection && !selectedVariantProduct ? 'Select a variant' : 'Add to cart'}
                </button>
                <button type="button" disabled={!stock || !priceAvailable || (requiresVariantSelection && !selectedVariantProduct)} onClick={() => onBuyNow(displayProduct, quantity)} className="flex h-12 items-center justify-center gap-2 rounded-full bg-[#397a4a] px-4 text-xs font-extrabold text-white transition hover:bg-[#2f663d] disabled:cursor-not-allowed disabled:bg-slate-300 sm:h-[52px]">
                  <Zap size={17} fill="currentColor" /> Buy now
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4">
                {[
                  [
                    Truck,
                    stock <= 0
                      ? 'Delivery unavailable'
                      : deliveryAddress && !pinDeliveryAvailability?.available
                        ? 'Not deliverable to this address'
                        : 'Delivery available',
                  ],
                  [
                    ShieldCheck,
                    detailInformation.warranty || 'Warranty details unavailable',
                  ],
                  [RotateCcw, 'Easy returns'],
                ].map(([Icon, label]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 px-2 py-3 text-center text-[9px] font-extrabold text-slate-600 sm:flex sm:items-center sm:justify-center sm:gap-2 sm:text-[10px]">
                    <Icon size={16} className="mx-auto mb-1 text-[#4f8a5d] sm:mx-0 sm:mb-0" /> {label}
                  </div>
                ))}
              </div>
              <p className={`mt-3 text-center text-[10px] font-bold ${deliveryAvailable ? 'text-slate-500' : 'text-red-600'}`}>
                {stock <= 0
                  ? 'Delivery estimate will be available when this product is back in stock.'
                  : deliveryAddress && !pinDeliveryAvailability.available
                    ? pinDeliveryAvailability.message
                    : deliveryEstimate
                      ? `Estimated delivery to ${deliveryDestination}: ${deliveryEstimate}`
                      : 'Add a delivery address to check availability and estimated delivery.'}
              </p>
            </div>
          </div>
        </section>

        {hasProductDetails && <section className="mx-auto mt-6 max-w-[1220px] overflow-hidden rounded-[28px] bg-white shadow-sm">
          <div className="relative overflow-hidden bg-gradient-to-r from-[#dcebdd] via-[#edf5ee] to-white px-5 py-6 sm:px-8 sm:py-8">
            <div className="absolute -right-12 -top-20 size-52 rounded-full bg-[#9bcaa6]/30 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-2xl bg-[#397a4a] text-white shadow-lg shadow-[#397a4a]/20"><Sparkles size={19} /></span>
              <div><p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-[#397a4a]">Everything you need to know</p><h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">Product Highlights & Specifications</h2></div>
            </div>
          </div>
          <div className="p-5 sm:p-8">
            {!!detailInformation.highlights.length && <section className="border-b border-slate-100 pb-6">
              <h3 className="text-sm font-extrabold text-slate-900">
                Product Highlights
              </h3>
              <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {detailInformation.highlights.map((highlight) => (
                  <div key={highlight} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#eef6ef] text-[#397a4a]">
                      <Check size={11} />
                    </span>
                    <span className="text-xs font-semibold leading-5 text-slate-600">
                      {highlight}
                    </span>
                  </div>
                ))}
              </div>
            </section>}

            <TechnicalSpecificationsSection specifications={displaySpecifications} />

            {(detailInformation.includedItems.length > 0 || productInformation.length > 0) && (
            <div className="mt-8 grid gap-8 border-t border-slate-100 pt-7 md:grid-cols-2">
              {!!detailInformation.includedItems.length && <section>
                <h3 className="text-sm font-extrabold text-slate-900">
                  What's Included / In the Box
                </h3>
                <ul className="mt-4 grid gap-2.5">
                  {detailInformation.includedItems.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-xs font-semibold leading-5 text-slate-600">
                      <Check size={13} className="mt-1 shrink-0 text-[#397a4a]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>}

              {!!productInformation.length && <section>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Product Information
                </h3>
                <dl className="mt-4 divide-y divide-slate-100">
                  {productInformation.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-2.5 text-xs">
                      <dt className="font-semibold text-slate-400">{label}</dt>
                      <dd className="min-w-0 break-words font-bold text-slate-700">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>}
            </div>
            )}

            {(detailInformation.warranty || detailInformation.returnPolicy) && (
            <div className="mt-7 grid gap-6 border-t border-slate-100 pt-7 md:grid-cols-2">
              {detailInformation.warranty && <section>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Warranty
                </h3>
                <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
                  {detailInformation.warranty}
                </p>
              </section>}
              {detailInformation.returnPolicy && <section>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Return / Replacement Policy
                </h3>
                <p className="mt-2 text-xs font-medium leading-6 text-slate-500">
                  {detailInformation.returnPolicy}
                </p>
              </section>}
            </div>
            )}
          </div>
        </section>}

        <div className="mx-auto mt-6 max-w-[1220px]">
          <ProductReviews product={product} reviews={reviews} onViewAll={onViewAllReviews} />
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
