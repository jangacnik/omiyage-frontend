import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { CreateOrderInput, CreateOrderItemInput, UpdateMyOrderItemInput } from './orders'
import type {
  AdminOrderSortBy,
  CombineRequestDto,
  Currency,
  OrderDto,
  OrderItemStatus,
  OrderStatus,
  Page,
  ShipmentDestination,
  ShipmentDto,
  ShipmentStatus,
  ShippingMethod,
  SortDirection,
} from '../types/api'

export function useAdminOrders(
  status: OrderStatus | '',
  page: number,
  sortBy: AdminOrderSortBy = 'UPDATED_AT',
  direction: SortDirection = 'DESC',
) {
  return useQuery({
    queryKey: ['admin', 'orders', status, page, sortBy, direction],
    queryFn: () =>
      api.get<Page<OrderDto>>(
        `/api/admin/orders?page=${page}&size=20&sortBy=${sortBy}&direction=${direction}${status ? `&status=${status}` : ''}`,
      ),
    placeholderData: (previous) => previous,
  })
}

export function useAdminCreateOrderForUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, ...input }: CreateOrderInput & { userId: string }) =>
      api.post<OrderDto>(`/api/admin/orders/for-user/${userId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<OrderDto>(`/api/admin/orders/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
    },
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      itemId,
      status,
      actualPrice,
      actualPriceCurrency,
      soldPrice,
      soldPriceCurrency,
      weight,
    }: {
      orderId: string
      itemId: string
      status: OrderItemStatus
      actualPrice?: number
      actualPriceCurrency?: Currency
      soldPrice?: number
      soldPriceCurrency?: Currency
      weight?: number
    }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}`, {
        status,
        actualPrice,
        actualPriceCurrency,
        soldPrice,
        soldPriceCurrency,
        weight,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
    },
  })
}

export function useAdminAddOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, ...input }: CreateOrderItemInput & { orderId: string }) =>
      api.post<OrderDto>(`/api/admin/orders/${orderId}/items`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
    },
  })
}

export function useAdminUpdateOrderItemContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, ...input }: UpdateMyOrderItemInput & { orderId: string; itemId: string }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}/details`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
    },
  })
}

export function useAdminRemoveOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      api.delete<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
    },
  })
}

export function useAdminMarkItemPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, paid }: { orderId: string; itemId: string; paid: boolean }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}/paid`, { paid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useAdminDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.delete<void>(`/api/admin/orders/${orderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
    },
  })
}

export function useAdminDeleteShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/api/admin/shipments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })
}

export function useAssignOrderShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, shipmentId }: { orderId: string; shipmentId: string | null }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/shipment`, { shipmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
    },
  })
}

export function useAdminShipments() {
  return useQuery({
    queryKey: ['admin', 'shipments'],
    queryFn: () => api.get<ShipmentDto[]>('/api/admin/shipments'),
  })
}

export function useCreateShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderIds: string[]) => api.post<ShipmentDto>('/api/admin/shipments', { orderIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
    },
  })
}

export function useUpdateShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      destination,
      shippingMethod,
      trackingNumber,
      notes,
      title,
    }: {
      id: string
      status?: ShipmentStatus
      destination?: ShipmentDestination
      shippingMethod?: ShippingMethod
      trackingNumber?: string
      notes?: string
      title?: string
    }) =>
      api.patch<ShipmentDto>(`/api/admin/shipments/${id}`, {
        status,
        destination,
        shippingMethod,
        trackingNumber,
        notes,
        title,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] }),
  })
}

export function useCombineShipments() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ shipmentIds, title }: { shipmentIds: string[]; title?: string }) =>
      api.post<ShipmentDto>('/api/admin/shipments/combine', { shipmentIds, title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })
}

export function useSplitShipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ shipmentId, orderIds, title }: { shipmentId: string; orderIds: string[]; title?: string }) =>
      api.post<ShipmentDto>(`/api/admin/shipments/${shipmentId}/split`, { orderIds, title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })
}

export function useAdminCombineRequests() {
  return useQuery({
    queryKey: ['admin', 'combine-requests'],
    queryFn: () => api.get<CombineRequestDto[]>('/api/admin/combine-requests'),
  })
}

export function useAdminForceAcceptCombineRequest() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<CombineRequestDto>(`/api/admin/combine-requests/${id}/force-accept`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'combine-requests'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    },
  })
}
