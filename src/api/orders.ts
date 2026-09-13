import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { Condition, Currency, OrderDto, OrderItemDto, Page, SplitOrderResponseDto } from '../types/api'

// An item that's already been bought or shipped is settled - its content can't be edited or
// removed anymore. Single source of truth so this set can't drift between call sites.
const LOCKED_ITEM_STATUSES: OrderItemDto['status'][] = ['BOUGHT', 'SHIPPED']

export function isItemLocked(item: Pick<OrderItemDto, 'status'>): boolean {
  return LOCKED_ITEM_STATUSES.includes(item.status)
}

export interface CreateOrderItemInput {
  inventoryItemId?: string
  title?: string
  description?: string
  imageKey?: string
  condition?: Condition
  currency: Currency
  maxPrice?: number
  quantity?: number
  link?: string
  isPreorder?: boolean
  expectedReleaseDate?: string
}

export interface CreateOrderInput {
  notes?: string
  nickname?: string
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
  link?: string
}

export function useAddMyOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, ...input }: CreateOrderItemInput & { orderId: string }) =>
      api.post<OrderDto>(`/api/orders/${orderId}/items`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
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

export function useCancelMyOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.post<OrderDto>(`/api/orders/${orderId}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useSubmitForShipping() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.post<OrderDto>(`/api/orders/${orderId}/submit-for-shipping`),
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

export function useSplitMyOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemIds }: { orderId: string; itemIds: string[] }) =>
      api.post<SplitOrderResponseDto>(`/api/orders/${orderId}/split`, { itemIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
  })
}

export function useLeaveShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.post<OrderDto>(`/api/orders/${orderId}/leave-shipment`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['shipments', 'mine'] })
    },
  })
}
