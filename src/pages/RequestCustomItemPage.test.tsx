import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { RequestCustomItemPage } from './RequestCustomItemPage'
import type { InventoryItem, OrderDto } from '../types/api'

const BASE = 'http://localhost:8081'

const item: InventoryItem = {
  id: 'item-1',
  title: 'Kit Kat matcha',
  description: 'Limited edition',
  link: 'https://example.com/kit-kat',
  condition: 'NEW',
  priceAmount: 12,
  currency: 'EUR',
  stockQuantity: 3,
  status: 'ACTIVE',
  images: ['img-1'],
  categories: [],
  tags: [],
  isPreorder: false,
  expectedReleaseDate: null,
  weight: null,
  boughtPrice: null,
  profitEur: null,
}

function order(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
    id: 'order-1',
    userId: 'user-1',
    status: 'REQUESTED',
    open: true,
    notes: null,
    nickname: 'My order',
    shipmentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    items: [],
    ...overrides,
  }
}

function renderPage() {
  server.use(
    http.get(`${BASE}/api/inventory/item-1`, () => HttpResponse.json(item)),
    http.get(`${BASE}/api/orders/mine`, () => HttpResponse.json({ content: [order()], page: 0, size: 20, totalElements: 1, totalPages: 1 })),
  )
  return renderWithProviders(
    <Routes>
      <Route path="/inventory/:id/request" element={<RequestCustomItemPage />} />
      <Route path="/orders/:id" element={<div>order detail page</div>} />
    </Routes>,
    ['/inventory/item-1/request'],
  )
}

describe('RequestCustomItemPage', () => {
  it('pre-fills the form from the listing', async () => {
    renderPage()

    expect(await screen.findByLabelText('Title')).toHaveValue('Kit Kat matcha')
    expect(screen.getByLabelText('Max price')).toHaveValue(12)
    expect(screen.getByLabelText('Link to store page')).toHaveValue('https://example.com/kit-kat')
  })

  it('submits a new order by default', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.post(`${BASE}/api/orders`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'new-order-id', status: 'REQUESTED' } as Partial<OrderDto>, { status: 201 })
      }),
    )

    renderPage()
    await screen.findByLabelText('Title')
    await user.clear(screen.getByLabelText('Max price'))
    await user.type(screen.getByLabelText('Max price'), '15')
    await user.click(screen.getByText('Submit request'))

    await waitFor(() => expect(screen.getByText('order detail page')).toBeInTheDocument())
    expect(capturedBody).toMatchObject({ items: [{ title: 'Kit Kat matcha', maxPrice: 15, currency: 'EUR' }] })
  })

  it('keeps the edited form filled in when submission fails, instead of reverting to the listing', async () => {
    const user = userEvent.setup()
    server.use(http.post(`${BASE}/api/orders`, () => HttpResponse.json({ error: 'Something went wrong.' }, { status: 500 })))

    renderPage()
    await screen.findByLabelText('Title')
    await user.clear(screen.getByLabelText('Max price'))
    await user.type(screen.getByLabelText('Max price'), '15')
    await user.click(screen.getByText('Submit request'))

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument()
    expect(screen.getByLabelText('Max price')).toHaveValue(15)
  })

  it('adds to an existing open order when one is selected', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.post(`${BASE}/api/orders/order-1/items`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'order-1', status: 'REQUESTED' } as Partial<OrderDto>, { status: 201 })
      }),
    )

    renderPage()
    await screen.findByLabelText('Title')
    await user.selectOptions(screen.getByLabelText('Add to order'), 'order-1')
    await user.click(screen.getByText('Add to order'))

    await waitFor(() => expect(screen.getByText('order detail page')).toBeInTheDocument())
    expect(capturedBody).toMatchObject({ title: 'Kit Kat matcha' })
  })
})
