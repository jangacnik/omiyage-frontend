import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { OrderDetailPage } from './OrderDetailPage'
import type { OrderDto } from '../types/api'

const BASE = 'http://localhost:8081'

function order(): OrderDto {
  return {
    id: 'order-1',
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
        weight: null,
        purchased: false,
        purchasedAt: null,
        quantity: 1,
      },
    ],
  }
}

describe('OrderDetailPage', () => {
  it('renders order items and their purchased status', async () => {
    server.use(http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json(order())))

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    expect(await screen.findByText('Ghibli museum ticket')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Not purchased yet')).toBeInTheDocument()
  })

  it('lets the owner edit an item while the order is still editable', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json(order())),
      http.patch(`${BASE}/api/orders/order-1/items/item-1`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(order())
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    await user.click(await screen.findByText('Edit'))
    await user.clear(screen.getByLabelText('Title for Ghibli museum ticket'))
    await user.type(screen.getByLabelText('Title for Ghibli museum ticket'), 'Ghibli museum ticket (2x)')
    await user.click(screen.getByText('Save'))

    await waitFor(() => expect(capturedBody).toMatchObject({ title: 'Ghibli museum ticket (2x)' }))
  })
})
