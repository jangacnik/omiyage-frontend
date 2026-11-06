import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { OrderDetailPage } from './OrderDetailPage'
import type { InventoryItem, OrderDto } from '../types/api'

const BASE = 'http://localhost:8081'

function order(): OrderDto {
  return {
    id: 'order-1',
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

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Title'))
    await user.type(screen.getByLabelText('Title'), 'Ghibli museum ticket (2x)')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(capturedBody).toMatchObject({ title: 'Ghibli museum ticket (2x)' }))
  })

  it('saves link, max price and description from the edit dialog', async () => {
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

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Link to store page'))
    await user.type(screen.getByLabelText('Link to store page'), 'https://example.com/ticket')
    await user.clear(screen.getByLabelText('Max price'))
    await user.type(screen.getByLabelText('Max price'), '25')
    await user.type(screen.getByLabelText('Description'), 'Two adults')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() =>
      expect(capturedBody).toMatchObject({ link: 'https://example.com/ticket', maxPrice: 25, description: expect.stringContaining('Two adults') }),
    )
  })

  it('groups the item edit dialog like the request form, with a text Save and Cancel', async () => {
    const user = userEvent.setup()
    server.use(http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json(order())))

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const legends = [...document.querySelectorAll('dialog legend')].map((legend) => legend.textContent)
    expect(legends).toEqual(['Basics', 'Pricing', 'Details'])
    expect(screen.getByRole('button', { name: 'Save' })).toHaveClass('btn-primary')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
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

    await user.click(await screen.findByRole('button', { name: 'Rename' }))
    await user.type(screen.getByLabelText('Order name'), "Grandma's Gifts")
    await user.click(screen.getByRole('button', { name: 'Save' }))

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

    await user.click(await screen.findByRole('button', { name: 'Rename' }))
    await user.clear(screen.getByLabelText('Order name'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

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

    await user.click(await screen.findByRole('button', { name: 'Rename' }))
    await user.type(screen.getByLabelText('Order name'), ' extra text')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText(/Grandma's Gifts/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Order name')).not.toBeInTheDocument()
  })

  it('cancels the order after confirming', async () => {
    const user = userEvent.setup()
    let cancelled = false
    server.use(
      http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json(order())),
      http.post(`${BASE}/api/orders/order-1/cancel`, () => {
        cancelled = true
        return HttpResponse.json({ ...order(), status: 'CANCELLED', open: false })
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    await user.click(await screen.findByText('Cancel order'))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel order' }))

    await waitFor(() => expect(cancelled).toBe(true))
  })

  it('disables submit for shipping, with a hint, when an item is a preorder', async () => {
    server.use(http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json({
      ...order(),
      items: [{ ...order().items[0], isPreorder: true, expectedReleaseDate: '2026-06-01' }],
    })))

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    const button = await screen.findByText('Submit for shipping')
    expect(button).toBeDisabled()
    expect(await screen.findByText(/preorder item/)).toBeInTheDocument()
  })

  it('submits for shipping after confirming', async () => {
    const user = userEvent.setup()
    let submitted = false
    server.use(
      http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json(order())),
      http.post(`${BASE}/api/orders/order-1/submit-for-shipping`, () => {
        submitted = true
        return HttpResponse.json({ ...order(), status: 'PREPARING_SHIPPING', open: false })
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    await user.click(await screen.findByText('Submit for shipping'))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(submitted).toBe(true))
  })

  it('a closed order hides edit/add/cancel controls', async () => {
    server.use(
      http.get(`${BASE}/api/orders/order-1`, () =>
        HttpResponse.json({ ...order(), status: 'PREPARING_SHIPPING', open: false }),
      ),
    )

    renderWithProviders(
      <Routes>
        <Route path="/orders/:id" element={<OrderDetailPage />} />
      </Routes>,
      ['/orders/order-1'],
    )

    expect(await screen.findByText('Ghibli museum ticket')).toBeInTheDocument()
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
    expect(screen.queryByText('Add item')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancel order')).not.toBeInTheDocument()
    expect(screen.getByText(/no longer open/)).toBeInTheDocument()
  })

  it('adds a new item to an open order', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json(order())),
      http.post(`${BASE}/api/orders/order-1/items`, async ({ request }) => {
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

    await user.click(await screen.findByText('Add item'))
    await user.click(screen.getByText("Can't find it? Create a custom request"))
    await user.type(screen.getByLabelText('Title'), 'Studio Ghibli tote bag')
    await user.type(screen.getByLabelText('Link to store page'), 'https://example.com/tote')
    await user.click(screen.getByText('Add item'))

    // Max price is always EUR now - fixed by policy, no currency picker in this form anymore.
    await waitFor(() =>
      expect(capturedBody).toMatchObject({
        title: 'Studio Ghibli tote bag',
        condition: 'NEW',
        currency: 'EUR',
        quantity: 1,
        link: 'https://example.com/tote',
      }),
    )
  })

  it('adds an inventory item found via search, without opening the custom form', async () => {
    const user = userEvent.setup()
    const inventoryItem: InventoryItem = {
      id: 'inv-1',
      title: 'Kit Kat matcha',
      description: null,
      link: null,
      condition: 'NEW',
      priceAmount: 1200,
      currency: 'EUR',
      stockQuantity: 3,
      status: 'ACTIVE',
      images: [],
      categories: [],
      tags: [],
      isPreorder: false,
      expectedReleaseDate: null,
      weight: null,
      boughtPrice: null,
      profitEur: null,
    }
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/orders/order-1`, () => HttpResponse.json(order())),
      http.get(`${BASE}/api/inventory`, () =>
        HttpResponse.json({ content: [inventoryItem], page: 0, size: 20, totalElements: 1, totalPages: 1 }),
      ),
      http.post(`${BASE}/api/orders/order-1/items`, async ({ request }) => {
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

    await user.click(await screen.findByText('Add item'))
    await user.type(screen.getByLabelText('Search inventory'), 'Kit Kat')
    await user.click(await screen.findByText('Kit Kat matcha'))

    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()

    await waitFor(() => expect(capturedBody).toMatchObject({ inventoryItemId: 'inv-1' }))
  })
})
