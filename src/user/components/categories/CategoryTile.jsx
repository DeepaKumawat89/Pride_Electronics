import {
  ArrowUpRight,
  Boxes,
  Cable,
  CircuitBoard,
  Clock3,
  Cpu,
  Gauge,
  Lightbulb,
  Network,
  PlugZap,
  RadioTower,
  ShieldCheck,
  ToggleLeft,
  Workflow,
} from 'lucide-react'
import { slugify } from '../../../utils/slugify'

const categoryVisuals = [
  { keywords: ['industrial', 'automation'], icon: Workflow },
  { keywords: ['integrated circuit', 'microcontroller'], icon: Cpu },
  { keywords: ['semiconductor', 'transistor'], icon: CircuitBoard },
  { keywords: ['power', 'rectifier', 'diode'], icon: PlugZap },
  { keywords: ['protection', 'fuse'], icon: ShieldCheck },
  { keywords: ['connector', 'interconnect', 'cable'], icon: Cable },
  { keywords: ['switch', 'electromechanical'], icon: ToggleLeft },
  { keywords: ['opto', 'led', 'light'], icon: Lightbulb },
  { keywords: ['frequency', 'timing', 'clock'], icon: Clock3 },
  { keywords: ['interface', 'communication'], icon: Network },
  { keywords: ['passive', 'capacitor', 'inductor', 'coil'], icon: RadioTower },
  { keywords: ['sensor', 'measurement'], icon: Gauge },
]

const tileTones = [
  'bg-[#e4f1e7] text-[#326341]',
  'bg-[#f4e7df] text-[#a94b2e]',
  'bg-[#e5ebf4] text-[#365b86]',
  'bg-[#eee9f4] text-[#655080]',
  'bg-[#f2eddc] text-[#7a6428]',
]

const stableIndex = (value, length) => {
  let hash = 0
  for (const character of String(value || '')) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }
  return hash % length
}

const categoryIcon = (name) => {
  const normalizedName = String(name || '').toLowerCase()
  return (
    categoryVisuals.find(({ keywords }) =>
      keywords.some((keyword) => normalizedName.includes(keyword)),
    )?.icon || Boxes
  )
}

export default function CategoryTile({
  category,
  productCount = 0,
  compact = false,
  onSelect,
}) {
  const Icon = categoryIcon(category.name)
  const image = category.image || category.imageUrl || category.thumbnail || ''
  const categoryPath = `/category/${encodeURIComponent(slugify(category.name))}`
  const tone = tileTones[stableIndex(category.id || category.name, tileTones.length)]

  return (
    <a
      href={categoryPath}
      onClick={(event) => {
        if (!onSelect) return
        event.preventDefault()
        onSelect(category)
      }}
      className={`group relative flex min-w-0 overflow-hidden border border-white/80 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#9bcaa6] hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#397a4a]/20 ${
        compact
          ? 'h-[88px] w-[148px] shrink-0 snap-start items-center gap-3 rounded-[20px] p-3.5 sm:w-auto lg:h-[92px]'
          : 'min-h-36 flex-col justify-between rounded-[24px] p-4 sm:min-h-40 sm:p-5'
      }`}
      aria-label={`Browse ${category.name}`}
    >
      <span
        className={`grid shrink-0 place-items-center overflow-hidden rounded-2xl transition duration-300 group-hover:scale-105 ${tone} ${
          compact ? 'size-11' : 'size-12'
        }`}
      >
        {image ? (
          <img
            src={image}
            alt=""
            width="96"
            height="96"
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        ) : (
          <Icon size={compact ? 20 : 22} strokeWidth={1.9} />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <strong
          className={`block text-slate-900 ${
            compact
              ? 'line-clamp-2 text-[11px] font-extrabold leading-4 sm:text-xs'
              : 'text-sm font-extrabold leading-5'
          }`}
        >
          {category.name}
        </strong>
        <span className="mt-1 block text-[9px] font-bold text-slate-400">
          {productCount} {productCount === 1 ? 'product' : 'products'}
        </span>
      </span>

      {!compact && (
        <span className="mt-5 flex items-center gap-1.5 text-[10px] font-extrabold text-[#397a4a]">
          Explore category <ArrowUpRight size={13} />
        </span>
      )}
    </a>
  )
}
