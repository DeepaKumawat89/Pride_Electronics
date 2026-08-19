import { ArrowRight, Camera, Mail, MessageCircle, Send } from 'lucide-react'
import Brand from '../common/Brand'

const columns = [
  { title: 'Shop', links: ['New arrivals', 'Audio', 'Wearables', 'PC components', 'Smart power'] },
  { title: 'Help', links: ['Order tracking', 'Shipping & delivery', 'Returns & refunds', 'Warranty', 'Contact us'] },
  { title: 'Company', links: ['Our story', 'Journal', 'Careers', 'Pride+ rewards', 'Sell with us'] },
]

const pageLinks = {
  'Shipping & delivery': 'shipping',
  'Returns & refunds': 'refunds',
  'Contact us': 'contact',
  Privacy: 'privacy',
  Terms: 'terms',
}

export default function Footer({ onBeSellerClick, onPageOpen }) {
  return (
    <footer className="bg-[#17211d] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1.3fr_2fr]">
          <div><Brand inverse/><p className="mt-5 max-w-sm text-sm leading-7 text-white/50">Better electronics, thoughtfully chosen. Built for curious minds, creators, and everyday life.</p><div className="mt-6 flex gap-2">{[Camera, MessageCircle, Send].map((Icon, index) => <a key={index} href="#" aria-label="Social profile" className="grid size-9 place-items-center rounded-full border border-white/10 text-white/60 transition hover:border-white hover:text-white"><Icon size={15}/></a>)}</div></div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">{columns.map((column) => <div key={column.title}><h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white/35">{column.title}</h3><ul className="mt-5 space-y-3">{column.links.map((link) => <li key={link}><button type="button" onClick={pageLinks[link] ? () => onPageOpen?.(pageLinks[link]) : link === 'Sell with us' ? onBeSellerClick : undefined} className="text-xs font-semibold text-white/65 transition hover:text-white">{link}</button></li>)}</ul></div>)}</div>
        </div>
        <div className="grid gap-8 border-b border-white/10 py-10 lg:grid-cols-2 lg:items-end"><div><h3 className="text-xl font-extrabold tracking-tight">Good tech. Good emails.</h3><p className="mt-2 text-xs text-white/45">Product drops, useful guides, and offers worth opening.</p></div><form onSubmit={(event) => event.preventDefault()} className="flex max-w-lg overflow-hidden rounded-full border border-white/15 bg-white/5 p-1 lg:ml-auto lg:w-full"><span className="grid w-11 place-items-center text-white/35"><Mail size={16}/></span><input required type="email" placeholder="Email address" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30"/><button className="grid size-10 place-items-center rounded-full bg-[#ffb000] text-slate-950"><ArrowRight size={16}/></button></form></div>
        <div className="flex flex-col gap-3 pt-7 text-[10px] font-semibold text-white/35 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 Pride Electronics India Pvt. Ltd.</p><div className="flex gap-5"><button type="button" onClick={() => onPageOpen?.(pageLinks.Privacy)} className="transition hover:text-white">Privacy</button><button type="button" onClick={() => onPageOpen?.(pageLinks.Terms)} className="transition hover:text-white">Terms</button><a href="#">Accessibility</a></div></div>
      </div>
    </footer>
  )
}
