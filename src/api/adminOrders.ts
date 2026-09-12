import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { OrderDto, OrderItemStatus, OrderStatus, Page, ShipmentDto, ShipmentStatus } from '../types/api'

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
    mutationFn: ({
      orderId,
      itemId,
      status,
      actualPrice,
      weight,
    }: {
      orderId: string
      itemId: string
      status: OrderItemStatus
      actualPrice?: number
      weight?: number
    }) => api.patch<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}`, { status, actualPrice, weight }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
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
      trackingNumber,
      notes,
    }: {
      id: string
      status?: ShipmentStatus
      trackingNumber?: string
      notes?: string
    }) => api.patch<ShipmentDto>(`/api/admin/shipments/${id}`, { status, trackingNumber, notes }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] }),
  })
}
