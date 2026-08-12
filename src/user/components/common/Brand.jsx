import { Cpu } from 'lucide-react'

export default function Brand({ inverse = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`grid size-10 place-items-center rounded-xl ${inverse ? 'bg-white text-slate-950' : 'bg-[#ff5c35] text-white'}`}>
        <Cpu size={21} strokeWidth={2.4} />
      </span>
      <span className={`leading-none ${inverse ? 'text-white' : 'text-slate-950'}`}>
        <strong className="block text-base font-extrabold tracking-[-0.04em]">PRIDE</strong>
        <span className={`text-[9px] font-bold tracking-[0.22em] ${inverse ? 'text-white/60' : 'text-slate-500'}`}>ELECTRONICS</span>
      </span>
    </div>
  )
}
