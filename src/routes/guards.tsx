import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { loginPathFor } from '../lib/returnPath'
import { useAuthStore } from '../store/authStore'

export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  const { pathname, search, hash } = useLocation()
  if (!token) return <Navigate to={loginPathFor(pathname + search + hash)} replace />
  return <Outlet />
}

export function RequireAdmin() {
  const claims = useAuthStore((s) => s.claims)
  if (claims?.role !== 'ADMIN') return <Navigate to="/inventory" replace />
  return <Outlet />
}
