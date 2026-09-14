import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminShipmentsPage } from './AdminShipmentsPage'
import type { OrderDto, ShipmentDto } from '../../types/api'

const BASE = 'http://localhost:8081'

function shipment(overrides: Partial<ShipmentDto> = {}): ShipmentDto {
  return {
    id: 'ship-1',
    status: 'PREPARING',
    title: null,
    destination: 'SLOVENIA',
    shippingMethod: 'EMS',
    trackingNumber: null,
    notes: null,
    ownerUserId: 'user-1',
    totalWeightGrams: 500,
    shippingCostJpy: 4400,
    shippingCostEur: 32.34,
    estimatedDays: 7,
    shippedAt: null,
    arrivedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    orders: [],
    profit: 0,
    ...overrides,
  }
}

function order(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
    id: 'order-1',
    userId: 'user-1',
    status: 'PREPARING_SHIPPING',
    open: false,
    notes: null,
    nickname: null,
    shipmentId: 'ship-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    items: [
      {
        id: 'item-1',
        inventoryItemId: null,
        title: 'Ghibli museum ticket',
        description: null,
        imageKey: null,
        condition: 'NEW',
        currency: 'JPY',
        maxPrice: 2000,
        actualPrice: null,
        weight: null,
        status: 'REQUESTED',
        paid: false,
        paidAt: null,
        link: null,
        purchasedAt: null,
        quantity: 1,
        isPreorder: false,
        expectedReleaseDate: null,
        actualPriceCurrency: null,
        soldPrice: null,
        soldPriceCurrency: null,
        profit: null,
      },
    ],
    ...overrides,
  }
}

function renderAt(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/shipments" element={<AdminShipmentsPage />} />
      <Route path="/admin/shipments/:id" element={<AdminShipmentsPage />} />
    </Routes>,
    [path],
  )
}

describe('AdminShipmentsPage', () => {
  it('lists existing shipments', async () => {
    server.use(http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment()])))

    renderWithProviders(<AdminShipmentsPage />)

    expect(await screen.findByText(/Shipment ship-1/)).toBeInTheDocument()
  })

  it('shows the shipping cost in both JPY and EUR', async () => {
    server.use(http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment()])))

    renderWithProviders(<AdminShipmentsPage />)

    expect(await screen.findByText(/¥4,400/)).toBeInTheDocument()
    // Appears twice: once as the shipping-cost EUR conversion, once as the combined items+shipping
    // total (no items on this fixture, so the two figures happen to match).
    expect(screen.getAllByText(/€32.34/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows the combined items+shipping total, per order and for the whole shipment', async () => {
    const priced = order({
      items: [{ ...order().items[0], maxPrice: 20, soldPrice: 25, soldPriceCurrency: 'EUR' }],
      shippingCostShareJpy: 4400,
      shippingCostShareEur: 32.34,
    })
    server.use(http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment({ orders: [priced] })])))

    renderWithProviders(<AdminShipmentsPage />)

    // Per-order: soldPrice (25) takes priority over maxPrice, + its shipping share (32.34) = 57.34.
    expect(await screen.findByText(/€57\.34 total/)).toBeInTheDocument()
    // Shipment-wide: same one order's items (25) + the shipment's total shipping cost (32.34).
    expect(screen.getByText(/€57\.34/, { selector: 'strong' })).toBeInTheDocument()
  })

  it('deletes a shipment after confirming', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment()])),
      http.delete(`${BASE}/api/admin/shipments/ship-1`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<AdminShipmentsPage />)
    await screen.findByText(/Shipment ship-1/)
    await user.click(screen.getByText('Delete'))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('shows an error message when deleting a shipment fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment()])),
      http.delete(`${BASE}/api/admin/shipments/ship-1`, () => HttpResponse.json({ message: 'conflict' }, { status: 409 })),
    )

    renderWithProviders(<AdminShipmentsPage />)
    await screen.findByText(/Shipment ship-1/)
    await user.click(screen.getByText('Delete'))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    expect(await screen.findByText('Could not delete this shipment.')).toBeInTheDocument()
  })

  it('shows a back button only when viewing a single shipment via its own route', async () => {
    server.use(http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment()])))

    renderAt('/admin/shipments')
    await screen.findByText(/Shipment ship-1/)
    expect(screen.queryByText('← Back to shipments')).not.toBeInTheDocument()
  })

  it('shows a working back button when reached via /admin/shipments/:id', async () => {
    const user = userEvent.setup()
    server.use(http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment()])))

    renderAt('/admin/shipments/ship-1')
    await screen.findByText(/Shipment ship-1/)
    const back = screen.getByText('← Back to shipments')

    await user.click(back)

    expect(screen.getByRole('heading', { name: 'Admin: Shipments' })).toBeInTheDocument()
  })

  it('lets an admin edit an order inline from the shipment view', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment({ orders: [order()] })])),
    )

    renderAt('/admin/shipments')
    await screen.findByText('Ghibli museum ticket')
    expect(screen.queryByLabelText('Update order status')).not.toBeInTheDocument()

    await user.click(screen.getByText('Edit'))

    expect(await screen.findByLabelText('Update order status')).toBeInTheDocument()

    await user.click(screen.getByText('Done'))

    expect(screen.queryByLabelText('Update order status')).not.toBeInTheDocument()
  })

  it('refreshes the shipment view after an inline edit changes the order status', async () => {
    // Regression test: the inline editor's mutations (status/add/remove/content/paid) must
    // invalidate the shipments query too, not just the separate orders-list page's cache -
    // otherwise this view keeps showing stale data after a successful edit.
    const user = userEvent.setup()
    let callCount = 0
    server.use(
      http.get(`${BASE}/api/admin/shipments`, () => {
        callCount += 1
        const status = callCount === 1 ? 'PREPARING_SHIPPING' : 'IN_PROGRESS'
        return HttpResponse.json([shipment({ orders: [order({ status })] })])
      }),
      http.patch(`${BASE}/api/admin/orders/order-1`, () => HttpResponse.json(order({ status: 'IN_PROGRESS' }))),
    )

    renderAt('/admin/shipments')
    await screen.findByText('Ghibli museum ticket')
    await user.click(screen.getByText('Edit'))

    const statusSelect = await screen.findByLabelText('Update order status')
    await user.selectOptions(statusSelect, 'IN_PROGRESS')

    await user.click(screen.getByText('Done'))

    await waitFor(() => expect(callCount).toBeGreaterThan(1))
    expect(await screen.findByText('In progress', { exact: false })).toBeInTheDocument()
  })
})
