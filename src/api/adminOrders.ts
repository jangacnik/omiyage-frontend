import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { OrderDto, OrderStatus, Page } from '../types/api'

export function useAdminOrders(status: OrderStatus | '', page: number) {
  return useQuery({
    queryKey: ['admin', 'orders', status, page],
    queryFn: () => api.get<Page<OrderDto>>(`/api/admin/orders?page=${page}&size=20${status ? `&status=${status}` : ''}`),
    placeholderData: (previous) => previous,
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<OrderDto>(`/api/admin/orders/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, purchased, actualPrice }: { orderId: string; itemId: string; purchased: boolean; actualPrice?: number }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}`, { purchased, actualPrice }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  })
}
