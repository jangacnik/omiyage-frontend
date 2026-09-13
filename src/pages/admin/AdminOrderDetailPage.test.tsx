import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
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
    open: true,
    notes: null,
    nickname: null,
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
        paid: false,
        paidAt: null,
        link: null,
        purchasedAt: null,
        quantity: 1,
        isPreorder: false,
        expectedReleaseDate: null,
        soldPrice: null,
        profit: null,
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
    await user.type(screen.getByLabelText('Sold price for Ghibli museum ticket'), '2200')
    await user.type(screen.getByLabelText('Weight for Ghibli museum ticket'), '250')
    await user.selectOptions(screen.getByLabelText('Status for Ghibli museum ticket'), 'BOUGHT')

    await waitFor(() =>
      expect(capturedBody).toMatchObject({ status: 'BOUGHT', actualPrice: 1800, soldPrice: 2200, weight: 250 }),
    )
  })

  it('shows an item and order profit once soldPrice is set', async () => {
    const withProfit: OrderDto = {
      ...order(),
      profit: 400,
      items: [{ ...order().items[0], soldPrice: 2200, actualPrice: 1800, profit: 400 }],
    }
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(withProfit)),
      mockShipments(),
    )

    renderPage()

    expect(await screen.findByText('Profit: ¥400')).toBeInTheDocument()
    expect(screen.getByText('Order profit: ¥400')).toBeInTheDocument()
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

  it('offers PREPARING_SHIPPING as an order status option', async () => {
    server.use(http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())), mockShipments())

    renderPage()
    await screen.findByText('Ghibli museum ticket')

    expect(within(screen.getByLabelText('Update order status')).getByText('PREPARING_SHIPPING')).toBeInTheDocument()
  })

  it('marks an item paid', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.patch(`${BASE}/api/admin/orders/order-12345678/items/item-1/paid`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...order(), items: [{ ...order().items[0], paid: true }] })
      }),
    )

    renderPage()
    await user.click(await screen.findByText('Mark paid'))

    await waitFor(() => expect(capturedBody).toEqual({ paid: true }))
  })

  it('adds a new item to the order', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.post(`${BASE}/api/admin/orders/order-12345678/items`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(order())
      }),
    )

    renderPage()
    await user.click(await screen.findByText('Add item'))
    await user.type(screen.getByLabelText('Title'), 'Extra souvenir')
    await user.click(screen.getByText('Add item'))

    await waitFor(() => expect(capturedBody).toMatchObject({ title: 'Extra souvenir', condition: 'NEW', currency: 'JPY' }))
  })

  it('deletes the order after confirming, then navigates away', async () => {
    const user = userEvent.setup()
    let deleted = false
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.delete(`${BASE}/api/admin/orders/order-12345678`, () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderPage()
    await user.click(await screen.findByText('Delete order'))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(deleted).toBe(true))
  })
})
