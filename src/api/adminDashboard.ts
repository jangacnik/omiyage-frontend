import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { UserDashboardEntryDto } from '../types/api'

export function useUserDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'users'],
    queryFn: () => api.get<UserDashboardEntryDto[]>('/api/admin/dashboard/users'),
  })
}
