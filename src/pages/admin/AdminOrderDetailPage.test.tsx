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
        actualPriceCurrency: null,
        soldPrice: null,
        soldPriceCurrency: null,
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
    expect(screen.getByText('Total price: €2,000.00')).toBeInTheDocument()
    expect(screen.getByText('Total weight: 0 g')).toBeInTheDocument()
  })

  it('saves bought price, sold price, weight and status together via the edit dialog', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.patch(`${BASE}/api/admin/orders/order-12345678/items/item-1`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(order())
      }),
      http.patch(`${BASE}/api/admin/orders/order-12345678/items/item-1/details`, () => HttpResponse.json(order())),
    )

    renderPage()
    await screen.findByText('Ghibli museum ticket')
    await user.click(screen.getByRole('button', { name: 'Edit' }))

    await user.type(await screen.findByLabelText('Bought for, in JPY'), '1800')
    await user.type(screen.getByLabelText('Sold for, in EUR'), '2200')
    await user.type(screen.getByLabelText('Weight'), '250')
    await user.selectOptions(screen.getByLabelText('Status'), 'BOUGHT')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    // actualPrice is always JPY and soldPrice is always EUR now - no currency to send.
    await waitFor(() =>
      expect(capturedBody).toMatchObject({
        status: 'BOUGHT',
        actualPrice: 1800,
        soldPrice: 2200,
        weight: 250,
      }),
    )
  })

  it('lets an admin add a custom item to inventory manually, once', async () => {
    const user = userEvent.setup()
    let calls = 0
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.post(`${BASE}/api/admin/orders/order-12345678/items/item-1/add-to-inventory`, () => {
        calls++
        return HttpResponse.json(order(), { status: 201 })
      }),
    )

    renderPage()
    await screen.findByText('Ghibli museum ticket')
    await user.click(screen.getByRole('button', { name: 'Add to inventory' }))

    expect(await screen.findByRole('button', { name: 'Added to inventory' })).toBeDisabled()
    expect(calls).toBe(1)
  })

  it('shows the server message when adding to inventory fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.post(`${BASE}/api/admin/orders/order-12345678/items/item-1/add-to-inventory`, () =>
        HttpResponse.json({ message: 'already exists' }, { status: 409 }),
      ),
    )

    renderPage()
    await screen.findByText('Ghibli museum ticket')
    await user.click(screen.getByRole('button', { name: 'Add to inventory' }))

    expect(await screen.findByText(/already exists/)).toBeInTheDocument()
  })

  it('does not offer add to inventory for an item already linked to inventory', async () => {
    const linked: OrderDto = { ...order(), items: [{ ...order().items[0], inventoryItemId: 'inv-1' }] }
    server.use(http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(linked)), mockShipments())

    renderPage()
    await screen.findByText('Ghibli museum ticket')

    expect(screen.queryByRole('button', { name: /inventory/i })).not.toBeInTheDocument()
  })

  it('shows only the order-level total profit, not a per-item breakdown', async () => {
    // soldPrice/soldPriceCurrency are always EUR, actualPrice/actualPriceCurrency always JPY -
    // profit itself is always EUR (converted server-side before subtracting).
    const withProfit: OrderDto = {
      ...order(),
      profit: 400,
      items: [
        { ...order().items[0], soldPrice: 2200, soldPriceCurrency: 'EUR', actualPrice: 1800, actualPriceCurrency: 'JPY', profit: 400 },
      ],
    }
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(withProfit)),
      mockShipments(),
    )

    renderPage()

    expect(await screen.findByText('Order profit: €400.00')).toBeInTheDocument()
    expect(screen.queryByText(/^Profit: /)).not.toBeInTheDocument()
  })

  it('lets an admin set a nickname on the order', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.patch(`${BASE}/api/admin/orders/order-12345678/nickname`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...order(), nickname: "Grandma's Gifts" })
      }),
    )

    renderPage()
    await screen.findByText('Ghibli museum ticket')

    await user.click(screen.getByRole('button', { name: 'Rename' }))
    await user.type(screen.getByLabelText('Order name'), "Grandma's Gifts")
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(capturedBody).toEqual({ nickname: "Grandma's Gifts" }))
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
    await user.click(await screen.findByRole('button', { name: 'Mark paid' }))

    await waitFor(() => expect(capturedBody).toEqual({ paid: true }))
  })

  it('moves an item onto another of the same user\'s orders', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      mockShipments(),
      http.get(`${BASE}/api/admin/orders/by-user/user-1`, () =>
        HttpResponse.json([order(), { ...order(), id: 'order-other', status: 'IN_PROGRESS' }]),
      ),
      http.post(`${BASE}/api/admin/orders/order-12345678/items/move`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ source: order(), target: order() })
      }),
    )

    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Move to another order' }))
    await user.selectOptions(await screen.findByLabelText('Move to order'), 'order-other')
    await user.click(screen.getByText('Move', { selector: 'button.btn-primary' }))

    await waitFor(() => expect(capturedBody).toEqual({ itemIds: ['item-1'], targetOrderId: 'order-other' }))
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
    await user.click(screen.getByText("Can't find it? Create a custom request"))
    await user.type(screen.getByLabelText('Title'), 'Extra souvenir')
    await user.click(screen.getByText('Add item'))

    // Max price is always EUR now - fixed by policy, no currency picker in this form anymore.
    await waitFor(() => expect(capturedBody).toMatchObject({ title: 'Extra souvenir', condition: 'NEW', currency: 'EUR' }))
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
