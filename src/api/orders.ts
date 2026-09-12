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

export function useMergeMyOrders() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderIds: string[]) => api.post<OrderDto>('/api/orders/merge', { orderIds }),
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

export function useRemoveMyOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      api.delete<OrderDto>(`/api/orders/${orderId}/items/${itemId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useUpdateOrderNickname() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, nickname }: { orderId: string; nickname: string | null }) =>
      api.patch<OrderDto>(`/api/orders/${orderId}/nickname`, { nickname }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function orderDisplayName(order: Pick<OrderDto, 'id' | 'nickname'>): string {
  return order.nickname ?? order.id.slice(0, 8)
}
