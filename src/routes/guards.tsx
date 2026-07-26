import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function RequireAuth() {
  const token = useAuthStore((s) => s.token)
  if (!token) return <Navigate to="/login" replace />
  return <Outlet />
}

export function RequireAdmin() {
  const claims = useAuthStore((s) => s.claims)
  if (claims?.role !== 'ADMIN') return <Navigate to="/inventory" replace />
  return <Outlet />
}
