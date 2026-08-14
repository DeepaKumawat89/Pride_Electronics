import {
  ChevronDown,
  Grid2X2,
  Heart,
  Home,
  Menu,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Brand from '../common/Brand'
import ProfileMenu from '../profile/ProfileMenu'
import ProductSearch from './ProductSearch'

const categories = [
  'Audio',
  'Wearables',
  'Peripherals',
  'Components & DIY',
  'Smart Power',
]

export default function Header({
  products,
  searchQuery,
  user,
  cartCount,
  wishlistCount,
  accountSection,
  onHome,
  onCartOpen,
  onSearch,
  onSearchSubmit,
  onProductSelect,
  onAuthOpen,
  onCategoryChange,
  onProfileSelect,
  onLogout,
}) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const headerRef = useRef(null)

  useEffect(() => {
    const closeMenus = (event) => {
      if (
        !headerRef.current?.contains(event.target) &&
        !event.target.closest?.('[data-header-control]')
      ) {
        setMobileOpen(false)
        setCategoriesOpen(false)
      }
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        setCategoriesOpen(false)
      }
    }
    document.addEventListener('mousedown', closeMenus)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeMenus)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  const selectCategory = (category) => {
    onCategoryChange(category)
    setCategoriesOpen(false)
    setMobileOpen(false)
  }

  const goHome = () => {
    setMobileOpen(false)
    setCategoriesOpen(false)
    onHome()
  }

  const openCart = () => {
    setMobileOpen(false)
    setCategoriesOpen(false)
    onCartOpen()
  }

  const openAccount = () => {
    if (user) onProfileSelect('profile')
    else onAuthOpen()
    setMobileOpen(false)
  }

  return (
    <>
      <header
        ref={headerRef}
        className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f7f8f5]/95 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-[1440px] px-3 sm:px-6 lg:px-10">
          <div className="hidden h-[76px] items-center gap-4 lg:flex xl:gap-6">
            <button
              type="button"
              onClick={goHome}
              aria-label="Pride Electronics home"
              className="shrink-0"
            >
              <Brand />
            </button>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCategoriesOpen((current) => !current)}
                className={`flex h-11 items-center gap-2 rounded-full border bg-white px-4 text-xs font-extrabold transition ${categoriesOpen ? 'border-[#ff5c35] text-[#ff5c35] ring-4 ring-[#ff5c35]/10' : 'border-slate-200 text-slate-700 hover:border-slate-300'}`}
                aria-expanded={categoriesOpen}
                aria-haspopup="menu"
              >
                <Grid2X2 size={16} />
                Categories
                <ChevronDown
                  size={14}
                  className={`transition ${categoriesOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {categoriesOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+12px)] z-50 w-64 rounded-[22px] border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
                >
                  <p className="px-3 pb-2 pt-1 text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
                    Shop by category
                  </p>
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      role="menuitem"
                      onClick={() => selectCategory(category)}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-xs font-bold text-slate-600 transition hover:bg-[#f2f7f2] hover:text-[#397a4a]"
                    >
                      <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-500">
                        <Grid2X2 size={14} />
                      </span>
                      {category}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="min-w-56 max-w-2xl flex-1">
              <ProductSearch
                products={products}
                value={searchQuery}
                onChange={onSearch}
                onSubmitQuery={onSearchSubmit}
                onSelect={onProductSelect}
                placeholder="Search products, brands..."
              />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {user ? (
                <ProfileMenu
                  user={user}
                  wishlistCount={wishlistCount}
                  cartCount={cartCount}
                  onSelect={onProfileSelect}
                  onLogout={onLogout}
                />
              ) : (
                <button
                  type="button"
                  onClick={onAuthOpen}
                  className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-700 transition hover:border-[#ff5c35] hover:text-[#ff5c35]"
                  aria-label="Login or sign up"
                >
                  <UserRound size={17} />
                  Account
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  user ? onProfileSelect('wishlist') : onAuthOpen()
                }
                className="relative grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-[#ff5c35] hover:text-[#ff5c35]"
                aria-label="Wishlist"
              >
                <Heart size={19} />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-[#ff5c35] text-[9px] font-bold text-white">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <CartButton cartCount={cartCount} onClick={openCart} />
            </div>
          </div>

          <div className="flex h-16 items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              className="grid size-10 shrink-0 place-items-center rounded-full text-slate-700 transition hover:bg-white"
              aria-label="Toggle categories menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>

            <button
              type="button"
              onClick={goHome}
              aria-label="Pride Electronics home"
              className="shrink-0"
            >
              <Brand compact />
            </button>

            <div className="min-w-0 flex-1">
              <ProductSearch
                products={products}
                value={searchQuery}
                onChange={onSearch}
                onSubmitQuery={onSearchSubmit}
                onSelect={onProductSelect}
                placeholder="Search..."
                mobile
              />
            </div>

            <CartButton cartCount={cartCount} onClick={openCart} compact />
          </div>

          {mobileOpen && (
            <nav className="grid gap-1 border-t border-slate-200 py-3 lg:hidden">
              <p className="px-3 pb-1 text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-400">
                Shop by category
              </p>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => selectCategory(category)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-white"
                >
                  <Grid2X2 size={15} className="text-slate-400" />
                  {category}
                </button>
              ))}
              <button
                type="button"
                onClick={openAccount}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-white"
              >
                <UserRound size={15} className="text-slate-400" />
                {user ? 'My Account' : 'Login / Sign Up'}
              </button>
            </nav>
          )}
        </div>
      </header>

      <nav
        data-header-control
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
      >
        <MobileNavItem
          icon={Home}
          label="Home"
          active={!accountSection && !mobileOpen}
          onClick={goHome}
        />
        <MobileNavItem
          icon={Grid2X2}
          label="Categories"
          active={mobileOpen}
          onClick={() => setMobileOpen((current) => !current)}
        />
        <MobileNavItem
          icon={ShoppingBag}
          label="Cart"
          count={cartCount}
          active={accountSection === 'cart'}
          onClick={openCart}
        />
        <MobileNavItem
          icon={UserRound}
          label="Account"
          active={Boolean(accountSection && accountSection !== 'cart')}
          onClick={openAccount}
        />
      </nav>
    </>
  )
}

function CartButton({ cartCount, onClick, compact = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative grid shrink-0 place-items-center rounded-full bg-slate-950 text-white transition hover:bg-[#ff5c35] ${compact ? 'size-10' : 'size-11'}`}
      aria-label="Open cart"
    >
      <ShoppingBag size={18} />
      {cartCount > 0 && (
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-[#ffb000] text-[10px] font-extrabold text-slate-950">
          {cartCount}
        </span>
      )}
    </button>
  )
}

function MobileNavItem({ icon: Icon, label, onClick, active = false, count = 0 }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[9px] font-extrabold transition ${active ? 'text-[#ff5c35]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'}`}
    >
      <span className="relative">
        <Icon size={19} strokeWidth={active ? 2.5 : 2} />
        {count > 0 && (
          <span className="absolute -right-3 -top-2 grid min-w-4 place-items-center rounded-full bg-[#ffb000] px-1 text-[8px] font-extrabold leading-4 text-slate-950">
            {count}
          </span>
        )}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}
