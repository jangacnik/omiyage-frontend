import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminOrderDetailPage } from './AdminOrderDetailPage'
import type { OrderDto } from '../../types/api'

const BASE = 'http://localhost:8081'

function order(): OrderDto {
  return {
    id: 'order-12345678',
    userId: 'user-1',
    status: 'IN_PROGRESS',
    notes: null,
    shipmentId: null,
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
        purchasedAt: null,
        quantity: 1,
      },
    ],
  }
}

function mockShipments() {
  return http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([]))
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/orders/:id" element={<AdminOrderDetailPage />} />
    </Routes>,
    ['/admin/orders/order-12345678'],
  )
}

describe('AdminOrderDetailPage', () => {
  it('shows item details and the running totals', async () => {
    server.use(http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())), mockShipments())

    renderPage()

    expect(await screen.findByText('Ghibli museum ticket')).toBeInTheDocument()
    expect(screen.getByText('Total price: 2000.00')).toBeInTheDocument()
    expect(screen.getByText('Total weight: 0 g')).toBeInTheDocument()
  })

  it('saves buy price, weight and status together', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.patch(`${BASE}/api/admin/orders/order-12345678/items/item-1`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(order())
      }),
    )

    renderPage()
    await screen.findByText('Ghibli museum ticket')

    await user.type(screen.getByLabelText('Buy price for Ghibli museum ticket'), '1800')
    await user.type(screen.getByLabelText('Weight for Ghibli museum ticket'), '250')
    await user.selectOptions(screen.getByLabelText('Status for Ghibli museum ticket'), 'BOUGHT')

    await waitFor(() => expect(capturedBody).toMatchObject({ status: 'BOUGHT', actualPrice: 1800, weight: 250 }))
  })

  it('advances the order status', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.patch(`${BASE}/api/admin/orders/order-12345678`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...order(), status: 'SENT' })
      }),
    )

    renderPage()
    await screen.findByText('Ghibli museum ticket')

    await user.selectOptions(screen.getByLabelText('Update order status'), 'SENT')

    await waitFor(() => expect(capturedBody).toEqual({ status: 'SENT' }))
  })
})
