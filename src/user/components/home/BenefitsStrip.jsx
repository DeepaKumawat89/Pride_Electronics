import { Headphones, RefreshCcw, ShieldCheck } from 'lucide-react'

export default function BenefitsStrip() {
  const benefits = [
    [RefreshCcw, 'Easy 7-day returns', 'Simple, no-fuss process'],
    [ShieldCheck, 'Genuine guarantee', '100% original products'],
    [Headphones, 'Expert support', 'Real help, seven days a week'],
  ]
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-px px-3 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-10">
        {benefits.map(([Icon, title, subtitle]) => <div key={title} className="flex items-center gap-3 py-7 lg:justify-center"><Icon size={22} className="shrink-0 text-[#ff5c35]"/><span><strong className="block text-xs font-extrabold text-slate-900">{title}</strong><span className="mt-0.5 block text-[10px] font-medium text-slate-400 sm:text-[11px]">{subtitle}</span></span></div>)}
      </div>
    </section>
  )
}
