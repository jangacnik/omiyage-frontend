import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { CartPage } from './CartPage'
import { useCartStore, type CartItem } from '../store/cartStore'

const BASE = 'http://localhost:8081'

const kitKat: CartItem = {
  inventoryItemId: 'item-1',
  title: 'Kit Kat matcha',
  priceAmount: 10,
  currency: 'EUR',
  quantity: 2,
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/cart" element={<CartPage />} />
      <Route path="/inventory" element={<div>inventory page</div>} />
      <Route path="/orders/:id" element={<div>order detail page</div>} />
    </Routes>,
    ['/cart'],
  )
}

describe('CartPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
  })

  it('shows an empty state linking to the inventory', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    await user.click(screen.getByText('Browse inventory'))

    expect(screen.getByText('inventory page')).toBeInTheDocument()
  })

  it('lists items with line totals and the cart total', () => {
    useCartStore.setState({ items: [kitKat, { ...kitKat, inventoryItemId: 'item-2', title: 'Pocky', priceAmount: 5, quantity: 1 }] })
    renderPage()

    expect(screen.getByText('Kit Kat matcha')).toBeInTheDocument()
    expect(screen.getByText('Pocky')).toBeInTheDocument()
    expect(screen.getByText('€20.00')).toBeInTheDocument()
    expect(screen.getByText('€5.00')).toBeInTheDocument()
    expect(screen.getByText(/^Total:/)).toHaveTextContent(/^Total: €25\.00$/)
  })

  it('warns when the quantity exceeds the stock recorded at add time', () => {
    useCartStore.setState({ items: [{ ...kitKat, stockQuantity: 1 }] })
    renderPage()

    expect(screen.getByText(/Only 1 in stock/)).toBeInTheDocument()
  })

  it('shows the preorder badge for preorder items', () => {
    useCartStore.setState({ items: [{ ...kitKat, isPreorder: true, expectedReleaseDate: '2026-12-01' }] })
    renderPage()

    expect(screen.getByText(/Preorder · 2026-12-01/)).toBeInTheDocument()
  })

  it('removes an item from the cart', async () => {
    const user = userEvent.setup()
    useCartStore.setState({ items: [kitKat] })
    renderPage()

    await user.click(screen.getByLabelText('Remove Kit Kat matcha from cart'))

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(useCartStore.getState().items).toEqual([])
  })

  it('changes the quantity through the stepper', async () => {
    const user = userEvent.setup()
    useCartStore.setState({ items: [kitKat] })
    renderPage()

    await user.click(screen.getByRole('button', { name: 'Increase quantity' }))

    expect(useCartStore.getState().items[0].quantity).toBe(3)
  })

  it('submits the order with a trimmed nickname, clears the cart and opens the order', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.post(`${BASE}/api/orders`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'order-9', status: 'REQUESTED' }, { status: 201 })
      }),
    )
    useCartStore.setState({ items: [kitKat] })
    renderPage()

    await user.type(screen.getByLabelText('Order name'), '  Gifts  ')
    await user.click(screen.getByText('Submit order'))

    await waitFor(() => expect(screen.getByText('order detail page')).toBeInTheDocument())
    expect(capturedBody).toEqual({
      nickname: 'Gifts',
      items: [{ inventoryItemId: 'item-1', currency: 'EUR', quantity: 2 }],
    })
    expect(useCartStore.getState().items).toEqual([])
  })

  it('omits the nickname when blank', async () => {
    const user = userEvent.setup()
    let capturedBody: { nickname?: string } = {}
    server.use(
      http.post(`${BASE}/api/orders`, async ({ request }) => {
        capturedBody = (await request.json()) as { nickname?: string }
        return HttpResponse.json({ id: 'order-9', status: 'REQUESTED' }, { status: 201 })
      }),
    )
    useCartStore.setState({ items: [kitKat] })
    renderPage()

    await user.type(screen.getByLabelText('Order name'), '   ')
    await user.click(screen.getByText('Submit order'))

    await waitFor(() => expect(screen.getByText('order detail page')).toBeInTheDocument())
    expect(capturedBody.nickname).toBeUndefined()
  })

  it('keeps the cart and shows the error when submitting fails', async () => {
    const user = userEvent.setup()
    server.use(http.post(`${BASE}/api/orders`, () => HttpResponse.json({ error: 'Item sold out.' }, { status: 409 })))
    useCartStore.setState({ items: [kitKat] })
    renderPage()

    await user.click(screen.getByText('Submit order'))

    expect(await screen.findByText('Item sold out.')).toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})
