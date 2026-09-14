import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient'
import type { CreateOrderInput, CreateOrderItemInput, UpdateMyOrderItemInput } from './orders'
import type {
  AdminOrderSortBy,
  CombineRequestDto,
  MoveItemsResponseDto,
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

// AdminOrderDetailPage reads the order via useOrder(id), the member-facing hook keyed
// ['orders', id] - not ['admin', 'orders']. Every mutation below that acts on one order also
// invalidates that key, or the detail page silently keeps showing pre-edit data after a
// successful save (reproduced: markItemPaid persisted paid=true server-side while the button
// stayed on "Mark paid" indefinitely).
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      api.patch<OrderDto>(`/api/admin/orders/${id}`, { status }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['orders', id] })
    },
  })
}

export function useAdminUpdateOrderNickname() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, nickname }: { id: string; nickname: string | null }) =>
      api.patch<OrderDto>(`/api/admin/orders/${id}/nickname`, { nickname }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['orders', id] })
    },
  })
}

export function useUpdateOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    // actualPrice is always JPY and soldPrice is always EUR - fixed by policy, see
    // OrderService.updateItem on the backend, which ignores any currency sent here anyway.
    mutationFn: ({
      orderId,
      itemId,
      status,
      actualPrice,
      soldPrice,
      weight,
    }: {
      orderId: string
      itemId: string
      status: OrderItemStatus
      actualPrice?: number
      soldPrice?: number
      weight?: number
    }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}`, {
        status,
        actualPrice,
        soldPrice,
        weight,
      }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
    },
  })
}

export function useAdminAddOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, ...input }: CreateOrderItemInput & { orderId: string }) =>
      api.post<OrderDto>(`/api/admin/orders/${orderId}/items`, input),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
    },
  })
}

export function useAdminUpdateOrderItemContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, ...input }: UpdateMyOrderItemInput & { orderId: string; itemId: string }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}/details`, input),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
    },
  })
}

export function useAdminRemoveOrderItem() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId }: { orderId: string; itemId: string }) =>
      api.delete<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}`),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
    },
  })
}

export function useAdminMarkItemPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, itemId, paid }: { orderId: string; itemId: string; paid: boolean }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/items/${itemId}/paid`, { paid }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
    },
  })
}

export function useAdminMarkOrderPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, paid }: { orderId: string; paid: boolean }) =>
      api.patch<OrderDto>(`/api/admin/orders/${orderId}/paid`, { paid }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
    },
  })
}

export function useAdminDeleteOrder() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderId: string) => api.delete<void>(`/api/admin/orders/${orderId}`),
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
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
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
    },
  })
}

export function useAdminShipments() {
  return useQuery({
    queryKey: ['admin', 'shipments'],
    queryFn: () => api.get<ShipmentDto[]>('/api/admin/shipments'),
  })
}

// Delivered shipments are settled history - fetched separately, only once an admin actually asks
// to see them, instead of loading them alongside every other shipment on every page visit.
export function useAdminDeliveredShipments(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'shipments', 'delivered'],
    queryFn: () => api.get<ShipmentDto[]>('/api/admin/shipments/delivered'),
    enabled,
  })
}

export function useAdminShipmentById(id: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'shipments', id],
    queryFn: () => api.get<ShipmentDto>(`/api/admin/shipments/${id}`),
    enabled: id !== undefined,
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

export function useAdminMergeOrders() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderIds: string[]) => api.post<OrderDto>('/api/admin/orders/merge', { orderIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
    },
  })
}

export function useAdminOrdersForUser(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'orders', 'by-user', userId],
    queryFn: () => api.get<OrderDto[]>(`/api/admin/orders/by-user/${userId}`),
    enabled: userId !== undefined,
  })
}

export function useAdminMoveOrderItems() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      orderId,
      itemIds,
      targetOrderId,
    }: {
      orderId: string
      itemIds: string[]
      targetOrderId?: string
    }) => api.post<MoveItemsResponseDto>(`/api/admin/orders/${orderId}/items/move`, { itemIds, targetOrderId }),
    onSuccess: (_, { orderId, targetOrderId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders', orderId] })
      if (targetOrderId) queryClient.invalidateQueries({ queryKey: ['orders', targetOrderId] })
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

export function useAdminMarkShipmentPaid() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ shipmentId, paid }: { shipmentId: string; paid: boolean }) =>
      api.patch<ShipmentDto>(`/api/admin/shipments/${shipmentId}/paid`, { paid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'shipments'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
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
