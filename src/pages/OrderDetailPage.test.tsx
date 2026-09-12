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
        purchasedAt: null,
        quantity: 1,
      },
    ],
  }
}

describe('OrderDetailPage', () => {
  it('renders order items and their status', async () => {
    server.use(http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json(order())))

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    expect(await screen.findByText('Ghibli museum ticket')).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getByText('Requested')).toBeInTheDocument()
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

  it('shows the nickname instead of the id when set, with the id still visible', async () => {
    server.use(http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json({ ...order(), nickname: "Grandma's Gifts" })))

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    expect(await screen.findByText(/Grandma's Gifts/)).toBeInTheDocument()
    expect(screen.getByText('(order-1)')).toBeInTheDocument()
  })

  it('renames the order and sends the new nickname', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json(order())),
      http.patch(`${BASE}/api/orders/order-1/nickname`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...order(), nickname: "Grandma's Gifts" })
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    await user.click(await screen.findByText('Rename'))
    await user.type(screen.getByLabelText('Order nickname'), "Grandma's Gifts")
    await user.click(screen.getByText('Save'))

    await waitFor(() => expect(capturedBody).toEqual({ nickname: "Grandma's Gifts" }))
  })

  it('clearing the nickname sends null, not an empty string', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json({ ...order(), nickname: "Grandma's Gifts" })),
      http.patch(`${BASE}/api/orders/order-1/nickname`, async ({ request }) => {
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

    await user.click(await screen.findByText('Rename'))
    await user.clear(screen.getByLabelText('Order nickname'))
    await user.click(screen.getByText('Save'))

    await waitFor(() => expect(capturedBody).toEqual({ nickname: null }))
  })

  it('cancel reverts to the last-saved nickname without saving', async () => {
    const user = userEvent.setup()
    server.use(http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json({ ...order(), nickname: "Grandma's Gifts" })))

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    await user.click(await screen.findByText('Rename'))
    await user.type(screen.getByLabelText('Order nickname'), ' extra text')
    await user.click(screen.getByText('Cancel'))

    expect(screen.getByText(/Grandma's Gifts/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Order nickname')).not.toBeInTheDocument()
  })
})
