import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminOrdersPage } from './AdminOrdersPage'
import type { OrderDto, Page } from '../../types/api'

const BASE = 'http://localhost:8081'

function order(): OrderDto {
  return {
    id: 'order-12345678',
    userId: 'user-1',
    status: 'IN_PROGRESS',
    notes: null,
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
        purchased: false,
        purchasedAt: null,
        quantity: 1,
      },
    ],
  }
}

function page(content: OrderDto[]): Page<OrderDto> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 }
}

describe('AdminOrdersPage', () => {
  it('lists orders with their items', async () => {
    server.use(http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([order()]))))

    renderWithProviders(<AdminOrdersPage />)

    expect(await screen.findByText(/Order order-12/)).toBeInTheDocument()
    expect(screen.getByText('Ghibli museum ticket')).toBeInTheDocument()
  })

  it('marks an item purchased via the checkbox', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([order()]))),
      http.patch(`${BASE}/api/admin/orders/order-12345678/items/item-1`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(order())
      }),
    )

    renderWithProviders(<AdminOrdersPage />)
    await screen.findByText('Ghibli museum ticket')

    await user.click(screen.getByRole('checkbox'))

    await waitFor(() => expect(capturedBody).toMatchObject({ purchased: true }))
  })

  it('advances the order status', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([order()]))),
      http.patch(`${BASE}/api/admin/orders/order-12345678`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...order(), status: 'SENT' })
      }),
    )

    renderWithProviders(<AdminOrdersPage />)
    await screen.findByText('Ghibli museum ticket')

    await user.selectOptions(screen.getByLabelText('Update status for order order-12345678'), 'SENT')

    await waitFor(() => expect(capturedBody).toEqual({ status: 'SENT' }))
  })

  it('shows an empty state when there are no orders', async () => {
    server.use(http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([]))))

    renderWithProviders(<AdminOrdersPage />)

    expect(await screen.findByText('No orders found.')).toBeInTheDocument()
  })
})
