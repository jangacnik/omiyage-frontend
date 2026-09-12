import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useCurrencyPreference } from '../lib/currency'
import { BrandMark } from './BrandMark'
import { OnboardingModal } from './OnboardingModal'

function CurrencyToggle() {
  const { displayCurrency, setDisplayCurrency } = useCurrencyPreference()
  return (
    <div className="flex rounded-lg bg-paper/10 p-0.5 text-sm font-medium" role="group" aria-label="Display currency">
      {(['JPY', 'EUR'] as const).map((currency) => (
        <button
          key={currency}
          type="button"
          onClick={() => setDisplayCurrency(currency)}
          aria-pressed={displayCurrency === currency}
          className={`rounded-md px-2 py-1 transition-colors ${
            displayCurrency === currency ? 'bg-paper text-ink' : 'text-paper/70 hover:text-paper'
          }`}
        >
          {currency}
        </button>
      ))}
    </div>
  )
}

function TopNavLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
      {children}
    </NavLink>
  )
}

export function Layout() {
  const claims = useAuthStore((s) => s.claims)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = claims?.role === 'ADMIN'
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const location = useLocation()

  return (
    <div className="min-h-screen bg-paper">
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
              </>
            )}
            <TopNavLink to="/profile">Profile</TopNavLink>
            {isAdmin && (
              <>
                <span className="mx-1 h-4 w-px bg-paper/20" aria-hidden="true" />
                <TopNavLink to="/admin/inventory">Inventory</TopNavLink>
                <TopNavLink to="/admin/categories">Categories</TopNavLink>
                <TopNavLink to="/admin/orders">Orders</TopNavLink>
                <TopNavLink to="/admin/shipments">Shipments</TopNavLink>
                <TopNavLink to="/admin/shipping-rates">Shipping rates</TopNavLink>
                <TopNavLink to="/admin/dashboard">Dashboard</TopNavLink>
              </>
            )}
          </div>

          <span className="ml-auto hidden items-center gap-3 md:flex">
            <CurrencyToggle />
            {claims && <span className="text-sm font-medium text-paper/65">{claims.nickname}</span>}
            <button type="button" className="btn-ghost-inverse" onClick={logout}>
              Log out
            </button>
          </span>

          <button
            type="button"
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-lg text-paper transition-colors hover:bg-paper/10 md:hidden"
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
              </>
            )}
            <TopNavLink to="/profile" onClick={closeMenu}>
              Profile
            </TopNavLink>
            {isAdmin && (
              <>
                <TopNavLink to="/admin/inventory" onClick={closeMenu}>
                  Inventory
                </TopNavLink>
                <TopNavLink to="/admin/categories" onClick={closeMenu}>
                  Categories
                </TopNavLink>
                <TopNavLink to="/admin/orders" onClick={closeMenu}>
                  Orders
                </TopNavLink>
                <TopNavLink to="/admin/shipments" onClick={closeMenu}>
                  Shipments
                </TopNavLink>
                <TopNavLink to="/admin/shipping-rates" onClick={closeMenu}>
                  Shipping rates
                </TopNavLink>
                <TopNavLink to="/admin/dashboard" onClick={closeMenu}>
                  Dashboard
                </TopNavLink>
              </>
            )}
            <div className="mt-3 flex w-full items-center justify-between border-t border-paper/15 pt-3">
              <CurrencyToggle />
              <button type="button" className="btn-ghost-inverse" onClick={logout}>
                Log out
              </button>
            </div>
            {claims && <span className="text-sm font-medium text-paper/65">{claims.nickname}</span>}
          </div>
        )}
      </nav>
      <main key={location.pathname} className="animate-rise mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
