import { Link, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function Layout() {
  const claims = useAuthStore((s) => s.claims)
  const logout = useAuthStore((s) => s.logout)

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center gap-4 border-b border-gray-200 px-4 py-3">
        <Link to="/inventory" className="font-semibold">
          Omiyage
        </Link>
        <Link to="/inventory">Inventory</Link>
        <Link to="/orders">My orders</Link>
        <Link to="/profile">Profile</Link>
        {claims?.role === 'ADMIN' && (
          <>
            <Link to="/admin/inventory">Admin: inventory</Link>
            <Link to="/admin/categories">Admin: categories</Link>
            <Link to="/admin/orders">Admin: orders</Link>
          </>
        )}
        <span className="ml-auto flex items-center gap-3">
          {claims && <span>{claims.nickname}</span>}
          <button type="button" onClick={logout}>
            Log out
          </button>
        </span>
      </nav>
      <main className="flex-1 p-4">
        <Outlet />
      </main>
    </div>
  )
}
