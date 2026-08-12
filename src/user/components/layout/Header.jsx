import { Heart, MapPin, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { useState } from 'react'
import Brand from '../common/Brand'
import ProfileMenu from '../profile/ProfileMenu'

const navItems = ['New arrivals', 'Best sellers', 'Audio', 'Wearables', 'Components']

export default function Header({ user, cartCount, wishlistCount, onCartOpen, onSearch, onAuthOpen, onCategoryChange, onProfileSelect, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const selectNav = (label) => {
    if (['Audio', 'Wearables'].includes(label)) onCategoryChange(label)
    else if (label === 'Components') onCategoryChange('Components & DIY')
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' })
    setMobileOpen(false)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f8f5]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        <div className="flex h-[76px] items-center gap-5">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Pride Electronics home"><Brand /></button>

          <nav className="ml-5 hidden items-center gap-6 xl:flex">
            {navItems.map((item) => (
              <button key={item} type="button" onClick={() => selectNav(item)} className="text-xs font-bold text-slate-600 transition hover:text-[#ff5c35]">{item}</button>
            ))}
          </nav>

          <label className="relative ml-auto hidden w-full max-w-sm lg:block">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input onChange={(event) => onSearch(event.target.value)} className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#ff5c35] focus:ring-4 focus:ring-[#ff5c35]/10" placeholder="Search products, brands..." />
          </label>

          <div className="flex items-center gap-1 sm:gap-2">
            <button type="button" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-left text-xs text-slate-600 transition hover:bg-white md:flex">
              <MapPin size={18} /><span><span className="block text-[10px] text-slate-400">Deliver to</span><strong className="text-slate-800">Pune 411057</strong></span>
            </button>
            {user ? (
              <ProfileMenu user={user} wishlistCount={wishlistCount} cartCount={cartCount} onSelect={onProfileSelect} onLogout={onLogout}/>
            ) : (
              <button type="button" onClick={onAuthOpen} className="flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 text-xs font-extrabold text-slate-700 transition hover:border-[#ff5c35] hover:text-[#ff5c35] sm:px-4" aria-label="Login or sign up"><UserRound size={17} /><span className="hidden sm:inline">Login / Signup</span></button>
            )}
            <button type="button" onClick={() => user ? onProfileSelect('wishlist') : onAuthOpen()} className="relative hidden size-10 place-items-center rounded-full transition hover:bg-white sm:grid" aria-label="Wishlist"><Heart size={19} />{wishlistCount > 0 && <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-[#ff5c35] text-[9px] font-bold text-white">{wishlistCount}</span>}</button>
            <button type="button" onClick={onCartOpen} className="relative grid size-10 place-items-center rounded-full bg-slate-950 text-white transition hover:bg-[#ff5c35]" aria-label="Open cart"><ShoppingBag size={18} />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#ffb000] text-[10px] font-extrabold text-slate-950">{cartCount}</span>}</button>
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="grid size-10 place-items-center rounded-full xl:hidden" aria-label="Toggle menu">{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
          </div>
        </div>

        <label className="relative mb-3 block lg:hidden">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input onChange={(event) => onSearch(event.target.value)} className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-[#ff5c35]" placeholder="Search products..." />
        </label>

        {mobileOpen && <nav className="grid gap-1 border-t border-slate-200 py-3 xl:hidden">{navItems.map((item) => <button key={item} type="button" onClick={() => selectNav(item)} className="rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-white">{item}</button>)}</nav>}
      </div>
    </header>
  )
}
