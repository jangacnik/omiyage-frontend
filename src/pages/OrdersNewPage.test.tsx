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
    await user.click(screen.getByText("Can't find it? Create a custom request"))

    await user.type(screen.getByLabelText('Title'), 'Ghibli museum ticket')
    await user.type(screen.getByLabelText('Max price'), '2000')
    await user.click(screen.getByText('Add item'))

    expect(await screen.findByText(/Ghibli museum ticket/)).toBeInTheDocument()

    await user.click(screen.getByText('Submit request'))

    await waitFor(() => expect(screen.getByText('order detail page')).toBeInTheDocument())
    // Max price is always EUR now - fixed by policy, no currency picker in this form anymore.
    expect(capturedBody).toMatchObject({
      items: [{ title: 'Ghibli museum ticket', condition: 'NEW', currency: 'EUR', maxPrice: 2000 }],
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
    await user.click(screen.getByText("Can't find it? Create a custom request"))

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
    await user.click(screen.getByText("Can't find it? Create a custom request"))

    await user.type(screen.getByLabelText('Title'), 'Ghibli museum ticket')
    await user.click(screen.getByText('Add item'))
    await user.click(screen.getByText('Submit request'))

    await waitFor(() => expect(capturedBody).toMatchObject({ items: [{ title: 'Ghibli museum ticket' }] }))
    expect((capturedBody as { nickname?: string }).nickname).toBeUndefined()
  })

  it('shows an error and stays on the page when submitting fails', async () => {
    const user = userEvent.setup()
    server.use(http.post(`${BASE}/api/orders`, () => HttpResponse.json({ message: 'nope' }, { status: 500 })))

    renderPage(['/orders/new'])
    await user.click(screen.getByText("Can't find it? Create a custom request"))
    await user.type(screen.getByLabelText('Title'), 'Ghibli museum ticket')
    await user.click(screen.getByText('Add item'))
    await user.click(screen.getByText('Submit request'))

    expect(await screen.findByText('Could not submit request.')).toBeInTheDocument()
    expect(screen.getByLabelText('Order nickname')).toBeInTheDocument()
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
      isPreorder: false,
      expectedReleaseDate: null,
      boughtPrice: null,
      profitEur: null,
    }
    server.use(http.get(`${BASE}/api/inventory/item-1`, () => HttpResponse.json(item)))

    renderPage(['/orders/new?inventoryItemId=item-1'])

    expect(await screen.findByText('Kit Kat matcha')).toBeInTheDocument()
  })

  it('adds an inventory item found via search, without opening the custom form', async () => {
    const user = userEvent.setup()
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
      isPreorder: false,
      expectedReleaseDate: null,
      boughtPrice: null,
      profitEur: null,
    }
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/inventory`, () => HttpResponse.json({ content: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 })),
      http.post(`${BASE}/api/orders`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'new-order-id', status: 'REQUESTED' } as Partial<OrderDto>, { status: 201 })
      }),
    )

    renderPage(['/orders/new'])
    await user.type(screen.getByLabelText('Search inventory'), 'Kit Kat')
    await user.click(await screen.findByText('Kit Kat matcha'))

    expect(screen.getByText('Kit Kat matcha')).toBeInTheDocument()
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()

    await user.click(screen.getByText('Submit request'))

    await waitFor(() => expect(capturedBody).toMatchObject({ items: [{ inventoryItemId: 'item-1' }] }))
  })

  it("offers a custom request when the search finds nothing", async () => {
    const user = userEvent.setup()
    server.use(http.get(`${BASE}/api/inventory`, () => HttpResponse.json({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 })))

    renderPage(['/orders/new'])
    await user.type(screen.getByLabelText('Search inventory'), 'Nonexistent thing')

    await user.click(await screen.findByText('Create a custom request instead'))

    expect(screen.getByLabelText('Title')).toBeInTheDocument()
  })
})
