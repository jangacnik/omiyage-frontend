import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function TopNavLink({ to, children, onClick }: { to: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => `nav-link ${isActive ? 'bg-stone-light text-ink' : ''}`}
    >
      {children}
    </NavLink>
  )
}

function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" width="22" height="22" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#262220" />
      <rect x="14" y="14" width="36" height="36" rx="3" fill="none" stroke="#f7f1e4" strokeWidth="4" strokeLinejoin="round" />
      <path d="M38 14 L50 14 L50 26 Z" fill="#bd5b3a" />
      <circle cx="27" cy="38" r="3.4" fill="#bd5b3a" />
    </svg>
  )
}

export function Layout() {
  const claims = useAuthStore((s) => s.claims)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = claims?.role === 'ADMIN'
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <div className="min-h-screen bg-paper">
      <nav className="sticky top-0 z-10 border-b border-stone-light bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/inventory" className="mr-2 flex items-center gap-1.5 text-base font-bold text-ink" style={{ fontFamily: 'var(--font-display)' }}>
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
                <span className="mx-1 h-4 w-px bg-stone-light" aria-hidden="true" />
                <TopNavLink to="/admin/inventory">Inventory</TopNavLink>
                <TopNavLink to="/admin/categories">Categories</TopNavLink>
                <TopNavLink to="/admin/orders">Orders</TopNavLink>
              </>
            )}
          </div>

          <span className="ml-auto hidden items-center gap-3 md:flex">
            {claims && <span className="text-sm font-medium text-ink/70">{claims.nickname}</span>}
            <button type="button" className="btn-secondary" onClick={logout}>
              Log out
            </button>
          </span>

          <button
            type="button"
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-ink md:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6 L18 18 M18 6 L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 7 H20 M4 12 H20 M4 17 H20" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-stone-light px-4 py-3 md:hidden">
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
              </>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-stone-light pt-3">
              {claims && <span className="text-sm font-medium text-ink/70">{claims.nickname}</span>}
              <button type="button" className="btn-secondary" onClick={logout}>
                Log out
              </button>
            </div>
          </div>
        )}
      </nav>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
