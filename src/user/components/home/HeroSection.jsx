import { ArrowRight, CheckCircle2, Play, Sparkles } from 'lucide-react'
import { initialMarketingSettings } from '../../../data/marketing'
import StorefrontImage from '../common/StorefrontImage'

export default function HeroSection({
  onShopNow,
  banner = initialMarketingSettings.homeBanner,
}) {
  if (banner.enabled === false) return null
  return (
    <section className="mx-auto max-w-[1440px] px-3 pt-4 sm:px-6 lg:px-10 lg:pt-8">
      <div className="relative isolate overflow-hidden rounded-[22px] bg-[#dcebdd] px-4 py-7 sm:rounded-[28px] sm:px-10 sm:py-9 lg:min-h-[520px] lg:px-16 lg:py-14">
        <div className="absolute -right-32 -top-48 -z-10 size-[600px] rounded-full bg-[#9bcaa6]/35 blur-3xl" />
        <div className="absolute bottom-0 right-0 -z-10 h-[62%] w-full bg-gradient-to-t from-[#aacfb3]/45 to-transparent lg:w-[58%]" />

        <div className="relative z-10 max-w-xl lg:pt-5">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#6d9877]/25 bg-white/55 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#365a40]">
            <Sparkles size={13} /> {banner.eyebrow}
          </div>
          <h1 className="max-w-2xl text-[35px] font-extrabold leading-[0.98] tracking-[-0.055em] text-[#17211d] sm:text-6xl lg:text-[72px]">
            Pride Circuit: {banner.title}{' '}<span className="font-serif italic text-[#ff5c35]">{banner.accent}</span>
          </h1>
          <p className="mt-4 max-w-lg text-[13px] font-medium leading-6 text-[#44554a] sm:mt-6 sm:text-base sm:leading-7">
            Pride Circuit is an online store in India for electronic and industrial automation components. {banner.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2.5 sm:mt-8 sm:gap-3">
            <button type="button" onClick={onShopNow} className="group inline-flex h-12 items-center gap-3 rounded-full bg-[#17211d] px-6 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#ff5c35] hover:shadow-xl">
              {banner.primaryAction} <ArrowRight size={17} className="transition group-hover:translate-x-1" />
            </button>
            <button type="button" className="inline-flex h-12 items-center gap-2 rounded-full border border-[#17211d]/15 bg-white/45 px-5 text-sm font-bold text-[#17211d] transition hover:bg-white">
              <span className="grid size-7 place-items-center rounded-full bg-white"><Play size={12} fill="currentColor" /></span> {banner.secondaryAction}
            </button>
          </div>
          <div className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-bold text-[#4a6251] sm:text-xs">
            {['2-year warranty', 'Genuine products', 'Easy returns'].map((item) => <span key={item} className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-[#ff5c35]" />{item}</span>)}
          </div>
        </div>

        <div className="relative mt-7 h-[245px] sm:mt-9 sm:h-[280px] lg:absolute lg:bottom-0 lg:right-0 lg:mt-0 lg:h-full lg:w-[52%]">
          <div className="absolute left-3 top-3 z-10 rounded-2xl bg-white/90 p-3 shadow-xl backdrop-blur sm:left-8 sm:top-14">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{banner.productLabel}</p>
            <p className="mt-1 text-sm font-extrabold text-slate-900">{banner.productName}</p>
            <p className="mt-0.5 text-xs font-bold text-[#ff5c35]">{banner.productPrice}</p>
          </div>
          <StorefrontImage
            src={banner.image}
            alt={banner.productName}
            width="680"
            height="560"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="absolute bottom-[-45px] right-[-70px] h-[310px] w-[400px] rotate-[-8deg] object-contain mix-blend-multiply drop-shadow-[0_35px_30px_rgba(23,33,29,0.28)] sm:bottom-[-70px] sm:right-4 sm:h-[370px] sm:w-[520px] lg:bottom-[-35px] lg:right-[-30px] lg:h-[560px] lg:w-[680px]"
          />
          <span className="absolute bottom-8 right-5 rounded-full bg-[#ffb000] px-4 py-3 text-center text-[10px] font-extrabold uppercase leading-3 text-slate-950 shadow-lg sm:right-12 lg:bottom-14 lg:right-16">Save<br/><span className="text-base">{banner.discountLabel}</span></span>
        </div>
      </div>
    </section>
  )
}
