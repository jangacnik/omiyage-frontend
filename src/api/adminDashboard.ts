import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { OrderDto, UserDashboardEntryDto } from '../types/api'

export function useUserDashboard() {
  return useQuery({
    queryKey: ['admin', 'dashboard', 'users'],
    queryFn: () => api.get<UserDashboardEntryDto[]>('/api/admin/dashboard/users'),
  })
}

export function useSetOrderItemPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, paid }: { orderId: string; itemId: string; paid: boolean }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}/paid`, { paid }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
  })
}
