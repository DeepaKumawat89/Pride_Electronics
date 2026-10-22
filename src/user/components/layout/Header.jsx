import {
  Grid2X2,
  Heart,
  Home,
  ShoppingBag,
  UserRound,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import prideCircuitLogo from '../../../../images/PRIDECIRCUIT Electronic Logo.png'
import ProfileMenu from '../profile/ProfileMenu'
import ProductSearch from './ProductSearch'

export default function Header({
  products,
  searchQuery,
  user,
  authStatus,
  cartCount,
  wishlistCount,
  accountSection,
  productsOpen,
  contentPageOpen,
  onHome,
  onProductsOpen,
  onCartOpen,
  onWishlistOpen,
  onSearch,
  onSearchSubmit,
  onProductSelect,
  onAuthOpen,
  onProfileSelect,
  onLogout,
  hidePhoneNavigation = false,
}) {
  const goHome = () => {
    onHome()
  }

  const openCart = () => {
    onCartOpen()
  }

  const openAccount = () => {
    if (authStatus === 'loading') return
    if (user) onProfileSelect('profile')
    else onAuthOpen()
  }

  const navigationItems = [
    {
      icon: Home,
      label: 'Home',
      active: !accountSection && !productsOpen && !contentPageOpen,
      onClick: goHome,
    },
    {
      icon: Grid2X2,
      label: 'Products',
      active: productsOpen && !accountSection,
      onClick: onProductsOpen,
    },
    {
      icon: ShoppingBag,
      label: 'Cart',
      count: cartCount,
      active: accountSection === 'cart',
      onClick: openCart,
      disabled: authStatus === 'loading',
    },
    {
      icon: UserRound,
      label: 'Account',
      active: Boolean(accountSection && accountSection !== 'cart'),
      onClick: openAccount,
      disabled: authStatus === 'loading',
    },
  ]

  return (
    <>
      <header
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
              <img
                src={prideCircuitLogo}
                alt="PrideCircuit Electronic Components & More"
                className="block h-auto w-56"
              />
            </button>

            <div className="ml-auto min-w-56 max-w-2xl flex-1">
              <ProductSearch
                products={products}
                value={searchQuery}
                onChange={onSearch}
                onSubmitQuery={onSearchSubmit}
                onSelect={onProductSelect}
                placeholder="Search products, brands..."
              />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {authStatus === 'loading' ? (
                <button
                  type="button"
                  disabled
                  className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-extrabold text-slate-400"
                  aria-label="Checking authentication"
                >
                  <span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#ff5c35]" />
                  Checking…
                </button>
              ) : user ? (
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
                  Login
                </button>
              )}

              <button
                type="button"
                disabled={authStatus === 'loading'}
                onClick={onWishlistOpen}
                className="relative grid size-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-[#ff5c35] hover:text-[#ff5c35] disabled:cursor-wait disabled:opacity-50"
                aria-label="Wishlist"
              >
                <Heart size={19} />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-[#ff5c35] text-[9px] font-bold text-white">
                    {wishlistCount}
                  </span>
                )}
              </button>

              <CartButton cartCount={cartCount} onClick={openCart} disabled={authStatus === 'loading'} />
            </div>
          </div>

          <div className="flex h-16 items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={goHome}
              aria-label="Pride Electronics home"
              className="shrink-0"
            >
              <img
                src={prideCircuitLogo}
                alt="PrideCircuit Electronic Components & More"
                className="block h-auto w-28 sm:w-36"
              />
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

            <CartButton cartCount={cartCount} onClick={openCart} compact disabled={authStatus === 'loading'} />
          </div>
        </div>
      </header>

      {!hidePhoneNavigation && <PhoneBottomNavigation items={navigationItems} />}

      <nav
        data-header-control
        aria-label="Tablet navigation"
        className="fixed inset-x-0 bottom-0 z-40 hidden grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:grid lg:hidden"
      >
        {navigationItems.map((item) => (
          <MobileNavItem key={item.label} {...item} />
        ))}
      </nav>
    </>
  )
}

function CartButton({ cartCount, onClick, compact = false, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative grid shrink-0 place-items-center rounded-full bg-slate-950 text-white transition hover:bg-[#ff5c35] disabled:cursor-wait disabled:opacity-50 ${compact ? 'size-10' : 'size-11'}`}
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

function MobileNavItem({ icon: Icon, label, onClick, active = false, count = 0, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`group flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[9px] font-extrabold transition disabled:cursor-wait disabled:opacity-50 ${active ? 'text-[#ff5c35]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-950'}`}
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

function PhoneBottomNavigation({ items }) {
  const navRef = useRef(null)
  const dragRef = useRef(null)
  const suppressClickRef = useRef(false)
  const [compact, setCompact] = useState(false)
  const [dragPosition, setDragPosition] = useState(null)
  const [dragging, setDragging] = useState(false)
  const activeIndex = items.findIndex((item) => item.active)

  useEffect(() => {
    const scrollAnchors = new WeakMap()
    scrollAnchors.set(window, Math.max(window.scrollY, 0))

    const handleScroll = (event) => {
      const scrollSource = event.target === document ? window : event.target
      const nextScrollY = Math.max(
        scrollSource === window ? window.scrollY : scrollSource.scrollTop,
        0,
      )
      const lastScrollY = scrollAnchors.get(scrollSource) ?? 0
      const distance = nextScrollY - lastScrollY

      if (nextScrollY <= 8) {
        setCompact(false)
        scrollAnchors.set(scrollSource, nextScrollY)
      } else if (distance >= 6) {
        setCompact(true)
        scrollAnchors.set(scrollSource, nextScrollY)
      } else if (distance <= -6) {
        setCompact(false)
        scrollAnchors.set(scrollSource, nextScrollY)
      }
    }

    window.addEventListener('scroll', handleScroll, {
      capture: true,
      passive: true,
    })
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [])

  const getDragPosition = (clientX) => {
    const nav = navRef.current
    if (!nav) return activeIndex

    const bounds = nav.getBoundingClientRect()
    const renderedScale = bounds.width / nav.offsetWidth || 1
    const localX = (clientX - bounds.left) / renderedScale
    const itemWidth = nav.clientWidth / items.length
    const position = localX / itemWidth - 0.5
    return Math.min(items.length - 1, Math.max(0, position))
  }

  const handlePointerDown = (event, index) => {
    if (index !== activeIndex || items[index].disabled) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
    suppressClickRef.current = false
    setDragging(false)
    setDragPosition(index)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const horizontalDistance = event.clientX - drag.startX
    const verticalDistance = event.clientY - drag.startY

    if (!drag.moved) {
      if (Math.abs(horizontalDistance) < 6) return
      if (Math.abs(verticalDistance) > Math.abs(horizontalDistance) * 1.25) return
      drag.moved = true
      setDragging(true)
    }

    event.preventDefault()
    setDragPosition(getDragPosition(event.clientX))
  }

  const finishDrag = (event, cancelled = false) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    dragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    if (!cancelled && drag.moved) {
      const nextIndex = Math.round(getDragPosition(event.clientX))
      const nextItem = items[nextIndex]

      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 0)

      if (nextIndex !== activeIndex && !nextItem.disabled) {
        nextItem.onClick()
      }
    }

    setDragging(false)
    setDragPosition(null)
  }

  const handleItemClick = (event, item) => {
    if (suppressClickRef.current) {
      event.preventDefault()
      return
    }
    item.onClick()
  }

  const indicatorPosition = dragPosition ?? activeIndex

  return (
    <nav
      ref={navRef}
      data-header-control
      data-compact={compact ? 'true' : 'false'}
      aria-label="Mobile navigation"
      className="fixed bottom-[max(0.65rem,env(safe-area-inset-bottom))] left-1/2 z-[60] grid w-[calc(100%-2rem)] max-w-sm origin-bottom grid-cols-4 overflow-hidden rounded-[34px] border border-white/80 bg-white/60 p-1 shadow-[0_16px_42px_rgba(23,33,29,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl transition-transform duration-300 ease-out motion-reduce:transition-none sm:hidden"
      style={{ transform: `translateX(-50%) scale(${compact ? 0.88 : 1})` }}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -left-7 -top-8 size-24 rounded-full bg-[#ff5c35]/15 blur-2xl" />
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-10 right-2 size-28 rounded-full bg-[#9bcaa6]/25 blur-2xl" />
      {activeIndex >= 0 && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-1 left-1 top-1 w-[calc((100%-0.5rem)/4)] rounded-[30px] border border-white/80 bg-white/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_5px_16px_rgba(23,33,29,0.1)] backdrop-blur-xl will-change-transform motion-reduce:transition-none ${dragging ? 'duration-75' : 'transition-transform duration-300 ease-out'}`}
          style={{ transform: `translate3d(${indicatorPosition * 100}%, 0, 0)` }}
        />
      )}
      {items.map((item, index) => (
        <PhoneNavItem
          key={item.label}
          {...item}
          dragging={dragging && index === activeIndex}
          onClick={(event) => handleItemClick(event, item)}
          onPointerDown={(event) => handlePointerDown(event, index)}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishDrag(event)}
          onPointerCancel={(event) => finishDrag(event, true)}
        />
      ))}
    </nav>
  )
}

function PhoneNavItem({
  icon: Icon,
  label,
  onClick,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  active = false,
  count = 0,
  disabled = false,
  dragging = false,
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      aria-current={active ? 'page' : undefined}
      className={`relative z-10 flex h-14 min-w-0 touch-pan-y flex-col items-center justify-center gap-0.5 rounded-[34px] border border-transparent px-1 text-[8px] font-extrabold transition-colors duration-300 disabled:cursor-wait disabled:opacity-50 ${active ? `${dragging ? 'cursor-grabbing' : 'cursor-grab'} text-slate-900` : 'text-slate-500 active:text-slate-950'}`}
    >
      <span className="relative z-10">
        <Icon size={18} strokeWidth={active ? 2.5 : 2} />
        {count > 0 && (
          <span className="absolute -right-3 -top-2 grid min-w-3.5 place-items-center rounded-full bg-[#ff5c35] px-1 text-[7px] font-extrabold leading-3.5 text-white shadow-sm ring-2 ring-white/80">
            {count}
          </span>
        )}
      </span>
      <span className="relative z-10 max-w-full truncate">{label}</span>
    </button>
  )
}
