import { ChevronDown, LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getInitials } from '../../../utils/text'
import { accountMenuItems } from './accountMenuItems'

export default function ProfileMenu({ user, wishlistCount, cartCount, onSelect, onLogout }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const closeMenu = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', closeMenu)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenu)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const selectItem = (id) => {
    setOpen(false)
    onSelect(id)
  }

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className={`flex h-11 items-center gap-2 rounded-full border bg-white p-1 pr-2 transition sm:pr-3 ${open ? 'border-[#ff5c35] ring-4 ring-[#ff5c35]/10' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`} aria-expanded={open} aria-haspopup="menu">
        {user.photo ? <img src={user.photo} alt={`${user.name}'s profile`} className="size-9 shrink-0 rounded-full object-cover"/> : <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#17211d] text-xs font-extrabold text-white">{getInitials(user.name)}</span>}
        <span className="hidden max-w-28 truncate text-xs font-extrabold text-slate-800 sm:block">{user.name.split(' ')[0]}</span>
        <ChevronDown size={14} className={`hidden text-slate-400 transition sm:block ${open ? 'rotate-180' : ''}`}/>
      </button>

      {open && (
        <div role="menu" className="fixed left-3 right-3 top-[116px] z-50 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.22)] sm:absolute sm:left-auto sm:right-0 sm:top-[calc(100%+12px)] sm:w-80">
          <div className="rounded-[18px] bg-[#f4f6f2] px-4 py-4">
            <div className="flex items-center gap-3">
              {user.photo ? <img src={user.photo} alt={`${user.name}'s profile`} className="size-11 shrink-0 rounded-full object-cover"/> : <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#ff5c35] text-sm font-extrabold text-white">{getInitials(user.name)}</span>}
              <span className="min-w-0"><strong className="block truncate text-sm font-extrabold text-slate-900">{user.name}</strong><span className="mt-0.5 block truncate text-[11px] text-slate-500">{user.email}</span></span>
            </div>
          </div>

          <div className="mt-2 grid gap-1">
            {accountMenuItems.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" role="menuitem" onClick={() => selectItem(id)} className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold text-slate-600 transition hover:bg-[#f4f6f2] hover:text-slate-950">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-white group-hover:text-[#ff5c35]"><Icon size={15}/></span>
                <span className="flex-1">{label}</span>
                {id === 'wishlist' && wishlistCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-[#ffe9e2] px-1.5 py-0.5 text-[9px] font-extrabold text-[#d84220]">{wishlistCount}</span>}
                {id === 'cart' && cartCount > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-[#fff1c9] px-1.5 py-0.5 text-[9px] font-extrabold text-[#7a5700]">{cartCount}</span>}
              </button>
            ))}
          </div>

          <div className="mt-2 border-t border-slate-100 pt-2">
            <button type="button" role="menuitem" onClick={() => { setOpen(false); onLogout() }} className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-xs font-bold text-red-500 transition hover:bg-red-50">
              <span className="grid size-8 place-items-center rounded-xl bg-red-50 transition group-hover:bg-white"><LogOut size={15}/></span>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
