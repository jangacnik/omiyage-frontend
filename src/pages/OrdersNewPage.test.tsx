import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { OrdersNewPage } from './OrdersNewPage'
import type { InventoryItem, OrderDto } from '../types/api'

const BASE = 'http://localhost:8081'

function renderPage(initialEntries: string[]) {
  return renderWithProviders(
    <Routes>
      <Route path="/orders/new" element={<OrdersNewPage />} />
      <Route path="/orders/:id" element={<div>order detail page</div>} />
    </Routes>,
    initialEntries,
  )
}

describe('OrdersNewPage', () => {
  it('adds a custom item via the form and submits the order', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.post(`${BASE}/api/orders`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'new-order-id', status: 'REQUESTED' } as Partial<OrderDto>, { status: 201 })
      }),
    )

    renderPage(['/orders/new'])

    await user.type(screen.getByLabelText('Title'), 'Ghibli museum ticket')
    await user.type(screen.getByLabelText('Max price'), '2000')
    await user.click(screen.getByText('Add item'))

    expect(await screen.findByText(/Ghibli museum ticket/)).toBeInTheDocument()

    await user.click(screen.getByText('Submit request'))

    await waitFor(() => expect(screen.getByText('order detail page')).toBeInTheDocument())
    expect(capturedBody).toMatchObject({
      items: [{ title: 'Ghibli museum ticket', condition: 'NEW', currency: 'JPY', maxPrice: 2000 }],
    })
  })

  it('sends the entered nickname when submitting', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.post(`${BASE}/api/orders`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'new-order-id', status: 'REQUESTED' } as Partial<OrderDto>, { status: 201 })
      }),
    )

    renderPage(['/orders/new'])

    await user.type(screen.getByLabelText('Order nickname'), "Grandma's gifts")
    await user.type(screen.getByLabelText('Title'), 'Ghibli museum ticket')
    await user.click(screen.getByText('Add item'))
    await user.click(screen.getByText('Submit request'))

    await waitFor(() => expect(capturedBody).toMatchObject({ nickname: "Grandma's gifts" }))
  })

  it('omits nickname when left blank', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.post(`${BASE}/api/orders`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'new-order-id', status: 'REQUESTED' } as Partial<OrderDto>, { status: 201 })
      }),
    )

    renderPage(['/orders/new'])

    await user.type(screen.getByLabelText('Title'), 'Ghibli museum ticket')
    await user.click(screen.getByText('Add item'))
    await user.click(screen.getByText('Submit request'))

    await waitFor(() => expect(capturedBody).toMatchObject({ items: [{ title: 'Ghibli museum ticket' }] }))
    expect((capturedBody as { nickname?: string }).nickname).toBeUndefined()
  })

  it('pre-fills a draft item from an inventoryItemId query param', async () => {
    const item: InventoryItem = {
      id: 'item-1',
      title: 'Kit Kat matcha',
      description: null,
      link: null,
      condition: 'NEW',
      priceAmount: 1200,
      currency: 'JPY',
      stockQuantity: 3,
      status: 'ACTIVE',
      images: [],
      categories: [],
    }
    server.use(http.get(`${BASE}/api/inventory/item-1`, () => HttpResponse.json(item)))

    renderPage(['/orders/new?inventoryItemId=item-1'])

    expect(await screen.findByText(/Inventory item: Kit Kat matcha/)).toBeInTheDocument()
  })
})
