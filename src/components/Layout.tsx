import { useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useMyProfile } from '../api/profile'
import { useAuthStore } from '../store/authStore'
import { cartItemCount, useCartStore } from '../store/cartStore'
import { Avatar } from './Avatar'
import { BrandMark } from './BrandMark'
import { useBasket } from '../api/basket'
import { BASKET_ENABLED } from '../lib/features'
import { CartIcon } from './icons'
import { OnboardingModal } from './OnboardingModal'

function CartNavLink({ count, onClick }: { count: number; onClick?: () => void }) {
  const name = BASKET_ENABLED ? 'Basket' : 'Cart'
  return (
    <NavLink
      to={BASKET_ENABLED ? '/basket' : '/cart'}
      onClick={onClick}
      aria-label={count > 0 ? `${name}, ${count} item${count === 1 ? '' : 's'}` : name}
      className={({ isActive }) =>
        `relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-paper/80 hover:bg-paper/10 hover:text-paper ${isActive ? 'bg-paper/10 text-paper' : ''}`
      }
    >
      <CartIcon size={22} />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-mint px-1 text-[0.65rem] font-semibold text-ink"
        >
          {count}
        </span>
      )}
    </NavLink>
  )
}

const NAV_ITEMS = [
  { to: '/inventory', label: 'Inventory', admin: false },
  { to: '/orders', label: 'My orders', admin: false },
  { to: '/shipments', label: 'Shipments', admin: false },
  { to: '/combine-requests', label: 'Combine requests', admin: false },
  { to: '/admin/inventory', label: 'Inventory', admin: true },
  { to: '/admin/orders', label: 'Orders', admin: true },
  { to: '/admin/shipments', label: 'Shipments', admin: true },
  { to: '/admin/settings', label: 'Settings', admin: true },
  { to: '/admin/dashboard', label: 'Dashboard', admin: true },
  { to: '/admin/combine-requests', label: 'Combine requests', admin: true },
]

function TopNavLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
      {children}
    </NavLink>
  )
}

/** Nickname dropdown holding Profile and Log out - a native <details> needs no open/close state,
 *  just a ref to collapse it after a selection is made. */
function AccountMenu({ nickname, onLogout, onNavigate }: { nickname: string; onLogout: () => void; onNavigate?: () => void }) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const { data: profile } = useMyProfile()

  function select(action?: () => void) {
    return () => {
      if (detailsRef.current) detailsRef.current.open = false
      onNavigate?.()
      action?.()
    }
  }

  return (
    <details ref={detailsRef} className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-medium text-paper/80 hover:text-paper">
        <Avatar imageKey={profile?.avatarKey} nickname={nickname} size="sm" />
        <span>{nickname}</span>
        <span aria-hidden="true" className="text-[0.6rem]">▾</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 flex w-36 flex-col overflow-hidden rounded-lg bg-ink ring-1 ring-paper/15">
        <Link to="/profile" className="flex min-h-11 items-center px-3 py-2 text-sm text-paper hover:bg-paper/10" onClick={select()}>
          Profile
        </Link>
        <button type="button" className="min-h-11 px-3 py-2 text-left text-sm text-paper hover:bg-paper/10" onClick={select(onLogout)}>
          Log out
        </button>
      </div>
    </details>
  )
}

// Content-heavy grid pages (the inventory catalog, which doubles as the site's home page under
// "/") benefit from the full viewport width - everything else (forms, detail views, admin
// settings) reads better narrow and centered, so this is an opt-in list rather than a global
// change to every page.
const FULL_WIDTH_PATHS = new Set(['/inventory', '/admin/inventory'])

export function Layout() {
  const claims = useAuthStore((s) => s.claims)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = claims?.role === 'ADMIN'
  const navItems = NAV_ITEMS.filter((item) => item.admin === isAdmin)
  const localCartCount = useCartStore((s) => cartItemCount(s.items))
  const { data: basketLines } = useBasket(BASKET_ENABLED)
  const cartCount = BASKET_ENABLED ? (basketLines ?? []).reduce((sum, line) => sum + line.quantity, 0) : localCartCount
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const location = useLocation()
  const isFullWidth = FULL_WIDTH_PATHS.has(location.pathname)

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-ink">
        Skip to content
      </a>
      {!isAdmin && <OnboardingModal />}
      <nav className="sticky top-0 z-20 bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <Link
            to="/inventory"
            className="mr-2 flex shrink-0 items-center gap-2 text-base font-bold text-paper"
            style={{ fontFamily: 'var(--font-display)' }}
            onClick={closeMenu}
          >
            <BrandMark /> Omiyage
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {isAdmin && <span className="mx-1 h-4 w-px bg-paper/20" aria-hidden="true" />}
            {navItems.map((item) => (
              <TopNavLink key={item.to} to={item.to}>
                {item.label}
              </TopNavLink>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {!isAdmin && <CartNavLink count={cartCount} />}

            <span className="hidden items-center lg:flex">
              {claims && <AccountMenu nickname={claims.nickname} onLogout={logout} />}
            </span>

            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-paper hover:bg-paper/10 lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {menuOpen ? (
                  <path d="M6 6 L18 18 M18 6 L6 18" />
                ) : (
                  <path d="M4 7 H20 M4 12 H20 M4 17 H20" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="flex flex-col items-start gap-1 border-t border-paper/15 px-4 pb-4 pt-3 lg:hidden">
            {navItems.map((item) => (
              <TopNavLink key={item.to} to={item.to} onClick={closeMenu}>
                {item.label}
              </TopNavLink>
            ))}
            <div className="mt-3 flex w-full flex-col items-start gap-1 border-t border-paper/15 pt-3">
              <TopNavLink to="/profile" onClick={closeMenu}>
                Profile
              </TopNavLink>
              <button
                type="button"
                className="nav-link"
                onClick={() => {
                  closeMenu()
                  logout()
                }}
              >
                Log out
              </button>
            </div>
          </div>
        )}
      </nav>
      <main
        id="main"
        tabIndex={-1}
        className={`flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 ${isFullWidth ? 'w-full' : 'mx-auto max-w-6xl'}`}
      >
        <Outlet />
      </main>
    </div>
  )
}
