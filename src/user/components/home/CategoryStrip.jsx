import { Cable, Headphones, Monitor, Watch, Zap } from 'lucide-react'

const categoryDefinitions = [
  { name: 'Audio', label: 'Audio & sound', icon: Headphones, color: 'bg-[#f3e4dd]' },
  { name: 'Wearables', label: 'Smart wearables', icon: Watch, color: 'bg-[#e2ebf4]' },
  { name: 'Peripherals', label: 'Workspace gear', icon: Monitor, color: 'bg-[#efe9d7]' },
  { name: 'Components & DIY', label: 'Components & DIY', icon: Cable, color: 'bg-[#e5e1ef]' },
  { name: 'Smart Power', label: 'Power & charging', icon: Zap, color: 'bg-[#dfeee4]' },
]

export default function CategoryStrip({ onSelect, promotions = [] }) {
  const categories = categoryDefinitions
    .map((category) => ({
      ...category,
      ...(promotions.find((item) => item.name === category.name) || {}),
    }))
    .filter((category) => category.enabled !== false)
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
      <div className="mb-7 flex items-end justify-between">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff5c35]">Browse the store</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-0.04em] sm:text-3xl">Shop by category</h2></div>
        <button type="button" onClick={() => onSelect('All')} className="hidden text-xs font-bold text-slate-500 underline decoration-slate-300 underline-offset-4 sm:block">View all products</button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {categories.map(({ name, label, icon: Icon, color }) => (
          <button key={name} type="button" onClick={() => onSelect(name)} className={`${color} group flex min-h-36 flex-col items-start justify-between overflow-hidden rounded-3xl p-5 text-left transition duration-300 hover:-translate-y-1 hover:shadow-xl`}>
            <span className="grid size-11 place-items-center rounded-2xl bg-white/75 text-slate-800 transition group-hover:rotate-[-5deg] group-hover:scale-110"><Icon size={22} /></span>
            <span><strong className="block text-sm font-extrabold text-slate-900">{label}</strong><span className="mt-1 block text-[11px] font-semibold text-slate-500">Explore collection →</span></span>
          </button>
        ))}
      </div>
    </section>
  )
}
