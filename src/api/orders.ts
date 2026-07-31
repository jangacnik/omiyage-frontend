import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { Condition, Currency, OrderDto, Page } from '../types/api'

export interface CreateOrderItemInput {
  inventoryItemId?: string
  title?: string
  description?: string
  imageKey?: string
  condition?: Condition
  currency: Currency
  maxPrice?: number
  quantity?: number
}

export interface CreateOrderInput {
  notes?: string
  items: CreateOrderItemInput[]
}

export function useMyOrders(page: number) {
  return useQuery({
    queryKey: ['orders', 'mine', page],
    queryFn: () => api.get<Page<OrderDto>>(`/api/orders/mine?page=${page}&size=20`),
    placeholderData: (previous) => previous,
  })
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => api.get<OrderDto>(`/api/orders/${id}`),
    enabled: id !== undefined,
  })
}

export function useCreateOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrderInput) => api.post<OrderDto>('/api/orders', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export interface UpdateMyOrderItemInput {
  title?: string
  description?: string
  imageKey?: string
  maxPrice?: number
  quantity?: number
}

export function useUpdateMyOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, ...input }: UpdateMyOrderItemInput & { orderId: string; itemId: string }) =>
      api.patch<OrderDto>(`/api/orders/${orderId}/items/${itemId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}
