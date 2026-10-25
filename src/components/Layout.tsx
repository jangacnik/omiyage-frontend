import { useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useMyProfile } from '../api/profile'
import { useAuthStore } from '../store/authStore'
import { cartItemCount, useCartStore } from '../store/cartStore'
import { Avatar } from './Avatar'
import { BrandMark } from './BrandMark'
import { CartIcon } from './icons'
import { OnboardingModal } from './OnboardingModal'

function CartNavLink({ count, onClick }: { count: number; onClick?: () => void }) {
  return (
    <NavLink
      to="/cart"
      onClick={onClick}
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}
      className={({ isActive }) =>
        `relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper ${isActive ? 'bg-paper/10 text-paper' : ''}`
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
      <div className="absolute right-0 z-30 mt-2 flex w-36 flex-col overflow-hidden rounded-lg bg-ink shadow-lg ring-1 ring-paper/15">
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
  const cartCount = useCartStore((s) => cartItemCount(s.items))
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const location = useLocation()
  const isFullWidth = FULL_WIDTH_PATHS.has(location.pathname)

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      {!isAdmin && <OnboardingModal />}
      <nav className="sticky top-0 z-20 bg-ink text-paper shadow-[0_1px_0_0_rgba(0,26,35,0.15)]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:px-6">
          <Link
            to="/inventory"
            className="mr-2 flex shrink-0 items-center gap-2 text-base font-bold text-paper transition-transform duration-200 ease-[var(--ease-out-soft)] hover:-rotate-2"
            style={{ fontFamily: 'var(--font-display)' }}
            onClick={closeMenu}
          >
            <BrandMark /> Omiyage
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {!isAdmin && (
              <>
                <TopNavLink to="/inventory">Inventory</TopNavLink>
                <TopNavLink to="/orders">My orders</TopNavLink>
                <TopNavLink to="/shipments">Shipments</TopNavLink>
              </>
            )}
            {isAdmin && (
              <>
                <span className="mx-1 h-4 w-px bg-paper/20" aria-hidden="true" />
                <TopNavLink to="/admin/inventory">Inventory</TopNavLink>
                <TopNavLink to="/admin/orders">Orders</TopNavLink>
                <TopNavLink to="/admin/shipments">Shipments</TopNavLink>
                <TopNavLink to="/admin/settings">Settings</TopNavLink>
                <TopNavLink to="/admin/dashboard">Dashboard</TopNavLink>
                <TopNavLink to="/admin/combine-requests">Combine requests</TopNavLink>
              </>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            {!isAdmin && <CartNavLink count={cartCount} />}

            <span className="hidden items-center md:flex">
              {claims && <AccountMenu nickname={claims.nickname} onLogout={logout} />}
            </span>

            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-paper transition-colors hover:bg-paper/10 md:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path
                  d="M4 7 H20"
                  className="origin-center transition-transform duration-300 ease-[var(--ease-out-soft)]"
                  style={menuOpen ? { transform: 'translateY(5px) rotate(45deg)' } : undefined}
                />
                <path
                  d="M4 12 H20"
                  className="transition-opacity duration-200"
                  style={menuOpen ? { opacity: 0 } : undefined}
                />
                <path
                  d="M4 17 H20"
                  className="origin-center transition-transform duration-300 ease-[var(--ease-out-soft)]"
                  style={menuOpen ? { transform: 'translateY(-5px) rotate(-45deg)' } : undefined}
                />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="animate-sheet-in flex flex-col items-start gap-1 border-t border-paper/15 px-4 pb-4 pt-3 md:hidden">
            {!isAdmin && (
              <>
                <TopNavLink to="/inventory" onClick={closeMenu}>
                  Inventory
                </TopNavLink>
                <TopNavLink to="/orders" onClick={closeMenu}>
                  My orders
                </TopNavLink>
                <TopNavLink to="/shipments" onClick={closeMenu}>
                  Shipments
                </TopNavLink>
              </>
            )}
            {isAdmin && (
              <>
                <TopNavLink to="/admin/inventory" onClick={closeMenu}>
                  Inventory
                </TopNavLink>
                <TopNavLink to="/admin/orders" onClick={closeMenu}>
                  Orders
                </TopNavLink>
                <TopNavLink to="/admin/shipments" onClick={closeMenu}>
                  Shipments
                </TopNavLink>
                <TopNavLink to="/admin/settings" onClick={closeMenu}>
                  Settings
                </TopNavLink>
                <TopNavLink to="/admin/dashboard" onClick={closeMenu}>
                  Dashboard
                </TopNavLink>
                <TopNavLink to="/admin/combine-requests" onClick={closeMenu}>
                  Combine requests
                </TopNavLink>
              </>
            )}
            <div className="mt-3 flex w-full items-center border-t border-paper/15 pt-3">
              {claims && <AccountMenu nickname={claims.nickname} onLogout={logout} onNavigate={closeMenu} />}
            </div>
          </div>
        )}
      </nav>
      <main
        key={location.pathname}
        className={`animate-rise flex flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 ${isFullWidth ? 'w-full' : 'mx-auto max-w-6xl'}`}
      >
        <Outlet />
      </main>
    </div>
  )
}
