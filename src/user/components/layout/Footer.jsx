import { ArrowRight, Camera, Mail, MessageCircle, Send } from 'lucide-react'
import prismCircuitTechLogo from '../../../../images/Prism Circuit Tech Logo.png'

const columns = [
  { title: 'Shop', links: ['New arrivals', 'Audio', 'Wearables', 'PC components', 'Smart power'] },
  { title: 'Help', links: ['Order tracking', 'Shipping & delivery', 'Returns & refunds', 'About Us', 'Contact us'] },
]

const pageLinks = {
  'About Us': 'about',
  'Shipping & delivery': 'shipping',
  'Returns & refunds': 'refunds',
  'Contact us': 'contact',
  'Privacy Policy': 'privacy',
  'Terms & Conditions': 'terms',
}

export default function Footer({ onBeSellerClick, onPageOpen }) {
  return (
    <footer className="bg-[#17211d] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1.3fr_2fr]">
          <div><img src={prismCircuitTechLogo} alt="Pride Electronics" className="block h-auto w-56 mix-blend-screen sm:w-64"/><p className="mt-5 max-w-sm text-sm leading-7 text-white/50">Better electronics, thoughtfully chosen. Built for curious minds, creators, and everyday life.</p><div className="mt-6 flex gap-2">{[Camera, MessageCircle, Send].map((Icon, index) => <a key={index} href="#" aria-label="Social profile" className="grid size-9 place-items-center rounded-full border border-white/10 text-white/60 transition hover:border-white hover:text-white"><Icon size={15}/></a>)}</div></div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">{columns.map((column) => <div key={column.title}><h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">{column.title}</h3><ul className="mt-5 space-y-3">{column.links.map((link) => <li key={link}><button type="button" onClick={pageLinks[link] ? () => onPageOpen?.(pageLinks[link]) : undefined} className="text-xs font-semibold text-white transition hover:text-white/80">{link}</button></li>)}</ul></div>)}<div className="col-span-2 sm:col-span-1"><h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-white">Company</h3><div className="mt-5 space-y-1.5 text-xs font-semibold leading-4 text-white"><p>Pride Automation</p><p><span className="font-extrabold">Office Address:</span> Office No. 237, 2nd Floor, XION Mall, Hinjewadi, Pune, Maharashtra – 411057</p><p><span className="font-extrabold">Email:</span> <a href="mailto:Support@pridecircuit.in" className="break-words transition hover:text-white/80">Support@pridecircuit.in</a></p><p><span className="font-extrabold">Contact:</span> <a href="tel:8574859658" className="transition hover:text-white/80">8574859658</a></p><p><span className="font-extrabold">GSTIN:</span> 27AFUPB6009F2ZG</p><button type="button" onClick={onBeSellerClick} className="text-left transition hover:text-white/80">Sell with us</button></div></div></div>
        </div>
        <div className="grid gap-8 border-b border-white/10 py-10 lg:grid-cols-2 lg:items-end"><div><h3 className="text-xl font-extrabold tracking-tight">Good tech. Good emails.</h3><p className="mt-2 text-xs text-white/45">Product drops, useful guides, and offers worth opening.</p></div><form onSubmit={(event) => event.preventDefault()} className="flex max-w-lg overflow-hidden rounded-full border border-white/15 bg-white/5 p-1 lg:ml-auto lg:w-full"><span className="grid w-11 place-items-center text-white/35"><Mail size={16}/></span><input required type="email" placeholder="Email address" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/30"/><button className="grid size-10 place-items-center rounded-full bg-[#ffb000] text-slate-950"><ArrowRight size={16}/></button></form></div>
        <div className="flex flex-col gap-3 pt-7 text-[10px] font-semibold text-white sm:flex-row sm:items-center sm:justify-between"><p>© 2026 Pride Circuit. Operated by Pride Automation.</p><div className="flex flex-wrap gap-x-5 gap-y-2"><button type="button" onClick={() => onPageOpen?.(pageLinks['Privacy Policy'])} className="transition hover:text-white/80">Privacy Policy</button><button type="button" onClick={() => onPageOpen?.(pageLinks['Terms & Conditions'])} className="transition hover:text-white/80">Terms &amp; Conditions</button></div></div>
      </div>
    </footer>
  )
}
