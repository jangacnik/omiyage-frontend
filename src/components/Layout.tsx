import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

function TopNavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'bg-indigo-50 text-indigo-700' : ''}`}>
      {children}
    </NavLink>
  )
}

export function Layout() {
  const claims = useAuthStore((s) => s.claims)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/inventory" className="mr-2 flex items-center gap-1.5 text-base font-bold text-slate-900">
            <span aria-hidden="true">🎁</span> Omiyage
          </Link>
          <TopNavLink to="/inventory">Inventory</TopNavLink>
          <TopNavLink to="/orders">My orders</TopNavLink>
          <TopNavLink to="/profile">Profile</TopNavLink>
          {claims?.role === 'ADMIN' && (
            <>
              <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden="true" />
              <TopNavLink to="/admin/inventory">Inventory</TopNavLink>
              <TopNavLink to="/admin/categories">Categories</TopNavLink>
              <TopNavLink to="/admin/orders">Orders</TopNavLink>
            </>
          )}
          <span className="ml-auto flex items-center gap-3">
            {claims && <span className="text-sm font-medium text-slate-600">{claims.nickname}</span>}
            <button type="button" className="btn-secondary" onClick={logout}>
              Log out
            </button>
          </span>
        </div>
      </nav>
      <main className="mx-auto max-w-6xl p-4">
        <Outlet />
      </main>
    </div>
  )
}
