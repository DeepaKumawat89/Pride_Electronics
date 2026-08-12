import { ArrowUpRight } from 'lucide-react'

export default function PromoBanner({ onShopNow }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10">
      <div className="relative overflow-hidden rounded-[30px] bg-[#17211d] px-7 py-10 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:px-16 lg:py-14">
        <div className="absolute -right-16 -top-32 size-80 rounded-full border-[55px] border-[#ff5c35]/20" />
        <div className="relative max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#8fd0a4]">Members get more</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-[-0.045em] sm:text-4xl">Join Pride+ and get ₹500 off your first order.</h2>
          <p className="mt-3 text-sm leading-6 text-white/60">Early access to drops, members-only prices, and free express delivery. No subscription needed.</p>
        </div>
        <button type="button" onClick={onShopNow} className="relative mt-7 inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-[#ffb000] px-6 text-sm font-extrabold text-[#17211d] transition hover:bg-white lg:ml-8 lg:mt-0">Get started <ArrowUpRight size={17} /></button>
      </div>
    </section>
  )
}
