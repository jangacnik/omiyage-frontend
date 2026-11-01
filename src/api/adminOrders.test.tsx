import { http, HttpResponse } from 'msw'
import { QueryClient, QueryClientProvider, type UseQueryResult } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import {
  useAdminAddOrderItem,
  useAdminCombineRequests,
  useAdminCreateOrderForUser,
  useAdminDeleteOrder,
  useAdminDeleteShipment,
  useAdminDeliveredShipments,
  useAdminForceAcceptCombineRequest,
  useAdminMarkItemPaid,
  useAdminMarkOrderPaid,
  useAdminMarkShipmentPaid,
  useAdminMergeOrders,
  useAdminMoveOrderItems,
  useAdminOrders,
  useAdminOrdersForUser,
  useAdminRemoveOrderItem,
  useAdminShipmentById,
  useAdminShipments,
  useAdminUpdateOrderItemContent,
  useAdminUpdateOrderNickname,
  useAssignOrderShipment,
  useCombineShipments,
  useCreateShipment,
  useSplitShipment,
  useUpdateOrderItem,
  useUpdateOrderStatus,
  useUpdateShipment,
} from './adminOrders'

const BASE = 'http://localhost:8081'

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

interface Captured {
  method: string
  path: string
  search: string
  body: unknown
}

function captureAll(response: unknown = {}) {
  const captured: Captured[] = []
  server.use(
    http.all(`${BASE}/api/*`, async ({ request }) => {
      const url = new URL(request.url)
      const text = await request.text()
      captured.push({ method: request.method, path: url.pathname, search: url.search, body: text ? JSON.parse(text) : undefined })
      return HttpResponse.json(response as object)
    }),
  )
  return captured
}

describe('adminOrders queries', () => {
  it('builds the admin orders URL with sort, status and delivered filter', async () => {
    const captured = captureAll({ content: [] })
    const { result } = renderHook(() => useAdminOrders('PURCHASED', 2, 'CREATED_AT', 'ASC', true), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(captured[0].method).toBe('GET')
    expect(captured[0].path).toBe('/api/admin/orders')
    expect(new URLSearchParams(captured[0].search).toString()).toBe(
      'page=2&size=20&sortBy=CREATED_AT&direction=ASC&status=PURCHASED&excludeStatus=DELIVERED',
    )
  })

  it('omits status and excludeStatus when unfiltered', async () => {
    const captured = captureAll({ content: [] })
    const { result } = renderHook(() => useAdminOrders('', 0), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(captured[0].search).toBe('?page=0&size=20&sortBy=UPDATED_AT&direction=DESC')
  })

  it.each<[string, () => UseQueryResult<unknown>, string]>([
    ['useAdminShipments', () => useAdminShipments(), '/api/admin/shipments'],
    ['useAdminDeliveredShipments', () => useAdminDeliveredShipments(true), '/api/admin/shipments/delivered'],
    ['useAdminShipmentById', () => useAdminShipmentById('s-1'), '/api/admin/shipments/s-1'],
    ['useAdminOrdersForUser', () => useAdminOrdersForUser('u-1'), '/api/admin/orders/by-user/u-1'],
    ['useAdminCombineRequests', () => useAdminCombineRequests(), '/api/admin/combine-requests'],
  ])('%s GETs %s', async (_name, hook, path) => {
    const captured = captureAll([])
    const { result } = renderHook(hook, { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(captured).toEqual([{ method: 'GET', path, search: '', body: undefined }])
  })

  it('does not fetch delivered shipments, a shipment or a user\'s orders while disabled', async () => {
    const captured = captureAll([])
    renderHook(() => useAdminDeliveredShipments(false), { wrapper })
    renderHook(() => useAdminShipmentById(undefined), { wrapper })
    renderHook(() => useAdminOrdersForUser(undefined), { wrapper })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(captured).toEqual([])
  })
})

describe('adminOrders mutations', () => {
  const cases: [string, () => { mutateAsync: (v: never) => Promise<unknown> }, unknown, string, string, unknown][] = [
    ['useAdminCreateOrderForUser', useAdminCreateOrderForUser, { userId: 'u-1', items: [] }, 'POST', '/api/admin/orders/for-user/u-1', { items: [] }],
    ['useUpdateOrderStatus', useUpdateOrderStatus, { id: 'o-1', status: 'PURCHASED' }, 'PATCH', '/api/admin/orders/o-1', { status: 'PURCHASED' }],
    ['useAdminUpdateOrderNickname', useAdminUpdateOrderNickname, { id: 'o-1', nickname: 'Gifts' }, 'PATCH', '/api/admin/orders/o-1/nickname', { nickname: 'Gifts' }],
    ['useUpdateOrderItem', useUpdateOrderItem, { orderId: 'o-1', itemId: 'i-1', status: 'PURCHASED', actualPrice: 500 }, 'PATCH', '/api/admin/orders/o-1/items/i-1', { status: 'PURCHASED', actualPrice: 500 }],
    ['useAdminAddOrderItem', useAdminAddOrderItem, { orderId: 'o-1', title: 'Pocky' }, 'POST', '/api/admin/orders/o-1/items', { title: 'Pocky' }],
    ['useAdminUpdateOrderItemContent', useAdminUpdateOrderItemContent, { orderId: 'o-1', itemId: 'i-1', title: 'New' }, 'PATCH', '/api/admin/orders/o-1/items/i-1/details', { title: 'New' }],
    ['useAdminRemoveOrderItem', useAdminRemoveOrderItem, { orderId: 'o-1', itemId: 'i-1' }, 'DELETE', '/api/admin/orders/o-1/items/i-1', undefined],
    ['useAdminMarkItemPaid', useAdminMarkItemPaid, { orderId: 'o-1', itemId: 'i-1', paid: true }, 'PATCH', '/api/admin/orders/o-1/items/i-1/paid', { paid: true }],
    ['useAdminMarkOrderPaid', useAdminMarkOrderPaid, { orderId: 'o-1', paid: false }, 'PATCH', '/api/admin/orders/o-1/paid', { paid: false }],
    ['useAdminDeleteOrder', useAdminDeleteOrder, 'o-1', 'DELETE', '/api/admin/orders/o-1', undefined],
    ['useAdminDeleteShipment', useAdminDeleteShipment, 's-1', 'DELETE', '/api/admin/shipments/s-1', undefined],
    ['useAssignOrderShipment', useAssignOrderShipment, { orderId: 'o-1', shipmentId: null }, 'PATCH', '/api/admin/orders/o-1/shipment', { shipmentId: null }],
    ['useCreateShipment', useCreateShipment, ['o-1', 'o-2'], 'POST', '/api/admin/shipments', { orderIds: ['o-1', 'o-2'] }],
    ['useAdminMergeOrders', useAdminMergeOrders, ['o-1', 'o-2'], 'POST', '/api/admin/orders/merge', { orderIds: ['o-1', 'o-2'] }],
    ['useAdminMoveOrderItems', useAdminMoveOrderItems, { orderId: 'o-1', itemIds: ['i-1'], targetOrderId: 'o-2' }, 'POST', '/api/admin/orders/o-1/items/move', { itemIds: ['i-1'], targetOrderId: 'o-2' }],
    ['useUpdateShipment', useUpdateShipment, { id: 's-1', status: 'SHIPPED', trackingNumber: 'T1' }, 'PATCH', '/api/admin/shipments/s-1', { status: 'SHIPPED', trackingNumber: 'T1' }],
    ['useCombineShipments', useCombineShipments, { shipmentIds: ['s-1', 's-2'], title: 'Box' }, 'POST', '/api/admin/shipments/combine', { shipmentIds: ['s-1', 's-2'], title: 'Box' }],
    ['useAdminMarkShipmentPaid', useAdminMarkShipmentPaid, { shipmentId: 's-1', paid: true }, 'PATCH', '/api/admin/shipments/s-1/paid', { paid: true }],
    ['useSplitShipment', useSplitShipment, { shipmentId: 's-1', orderIds: ['o-1'], title: 'Half' }, 'POST', '/api/admin/shipments/s-1/split', { orderIds: ['o-1'], title: 'Half' }],
    ['useAdminForceAcceptCombineRequest', useAdminForceAcceptCombineRequest, 'r-1', 'POST', '/api/admin/combine-requests/r-1/force-accept', undefined],
  ]

  it.each(cases)('%s sends %s %s with the expected body', async (_name, hook, input, method, path, body) => {
    const captured = captureAll({})
    const { result } = renderHook(hook, { wrapper })

    await act(() => result.current.mutateAsync(input as never))

    expect(captured).toEqual([{ method, path, search: '', body }])
  })
})
