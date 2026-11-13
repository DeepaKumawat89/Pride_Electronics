import { ArrowUpRight } from 'lucide-react'
import { initialMarketingSettings } from '../../../data/marketing'

export default function PromoBanner({
  onShopNow,
  banner = initialMarketingSettings.promotionalBanner,
}) {
  if (banner.enabled === false) return null
  return (
    <section className="mx-auto max-w-[1440px] px-3 py-10 sm:px-6 sm:py-16 lg:px-10">
      <div className="relative overflow-hidden rounded-[24px] bg-[#17211d] px-5 py-7 text-white sm:rounded-[30px] sm:px-12 sm:py-10 lg:flex lg:items-center lg:justify-between lg:px-16 lg:py-14">
        <div className="absolute -right-16 -top-32 size-80 rounded-full border-[55px] border-[#ff5c35]/20" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#8fd0a4]">{banner.eyebrow}</p>
          <h2 className="mt-2 text-[27px] font-extrabold tracking-[-0.045em] sm:mt-3 sm:text-4xl">{banner.title}</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">{banner.description}</p>
        </div>
        <button type="button" onClick={onShopNow} className="relative mt-6 inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#ffb000] px-5 text-[13px] font-extrabold text-[#17211d] transition hover:bg-white sm:mt-7 sm:px-6 sm:text-sm lg:ml-8 lg:mt-0">{banner.actionLabel} <ArrowUpRight size={17} /></button>
      </div>
    </section>
  )
}
