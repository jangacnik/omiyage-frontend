import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { OrderDto, UserDashboardEntryDto } from '../types/api'

export function useUserDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'users'],
    queryFn: () => api.get<UserDashboardEntryDto[]>('/api/admin/dashboard/users'),
  })
}

export function useUserDeliveredOrders(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'users', userId, 'delivered-orders'],
    queryFn: () => api.get<OrderDto[]>(`/api/admin/dashboard/users/${userId}/delivered-orders`),
    enabled,
  })
}
