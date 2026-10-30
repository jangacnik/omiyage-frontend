import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { BasketPage } from './BasketPage'
import type { BasketLineDto } from '../types/api'

const BASE = 'http://localhost:8081'

function line(overrides: Partial<BasketLineDto> = {}): BasketLineDto {
  return {
    id: 'line-1',
    inventoryItemId: null,
    customTitle: 'Rare figure',
    customDescription: 'boxed',
    currency: 'JPY',
    maxPrice: 1500,
    quantity: 2,
    createdAt: '2026-10-30T00:00:00Z',
    ...overrides,
  }
}

describe('BasketPage', () => {
  it('shows an empty state', async () => {
    server.use(http.get(`${BASE}/api/basket`, () => HttpResponse.json([])))

    renderWithProviders(<BasketPage />)

    expect(await screen.findByText('Your basket is empty')).toBeInTheDocument()
  })

  it('lists custom lines with their max price', async () => {
    server.use(http.get(`${BASE}/api/basket`, () => HttpResponse.json([line()])))

    renderWithProviders(<BasketPage />)

    expect(await screen.findByText('Rare figure')).toBeInTheDocument()
    expect(screen.getByText(/Max .*1,500.* each/)).toBeInTheDocument()
  })

  it('sends the whole line back when the quantity changes', async () => {
    const user = userEvent.setup()
    let body: unknown = null
    server.use(
      http.get(`${BASE}/api/basket`, () => HttpResponse.json([line()])),
      http.put(`${BASE}/api/basket/lines/line-1`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(line({ quantity: 3 }))
      }),
    )

    renderWithProviders(<BasketPage />)
    await screen.findByText('Rare figure')
    await user.click(screen.getByLabelText('Increase quantity'))

    await waitFor(() =>
      expect(body).toEqual({ customTitle: 'Rare figure', customDescription: 'boxed', maxPrice: 1500, quantity: 3 }),
    )
  })

  it('summarises the basket and shows the retention period', async () => {
    server.use(http.get(`${BASE}/api/basket`, () => HttpResponse.json([line()])))

    renderWithProviders(<BasketPage />)

    expect(await screen.findByText(/2 items: .*3,000/)).toBeInTheDocument()
    expect(screen.getByText('Unconfirmed baskets are kept for 7 days.')).toBeInTheDocument()
  })

  it('confirms once and opens the created order', async () => {
    const user = userEvent.setup()
    let confirmCalls = 0
    server.use(
      http.get(`${BASE}/api/basket`, () => HttpResponse.json([line()])),
      http.post(`${BASE}/api/basket/confirm`, async () => {
        confirmCalls += 1
        await new Promise((resolve) => setTimeout(resolve, 50))
        return HttpResponse.json({ id: 'order-9' })
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/" element={<BasketPage />} />
        <Route path="/orders/:id" element={<p>Order page</p>} />
      </Routes>,
    )
    const button = await screen.findByRole('button', { name: 'Confirm order' })
    await user.dblClick(button)

    expect(await screen.findByText('Order page')).toBeInTheDocument()
    expect(confirmCalls).toBe(1)
  })

  it('keeps the basket and shows the error when confirming fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/basket`, () => HttpResponse.json([line()])),
      http.post(`${BASE}/api/basket/confirm`, () => HttpResponse.json({ error: 'basket is empty' }, { status: 409 })),
    )

    renderWithProviders(<BasketPage />)
    await user.click(await screen.findByRole('button', { name: 'Confirm order' }))

    expect(await screen.findByText('basket is empty')).toBeInTheDocument()
    expect(screen.getByText('Rare figure')).toBeInTheDocument()
  })

  it('removes a line', async () => {
    const user = userEvent.setup()
    let removed = false
    server.use(
      http.get(`${BASE}/api/basket`, () => HttpResponse.json(removed ? [] : [line()])),
      http.delete(`${BASE}/api/basket/lines/line-1`, () => {
        removed = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<BasketPage />)
    await user.click(await screen.findByLabelText('Remove Rare figure from basket'))

    expect(await screen.findByText('Your basket is empty')).toBeInTheDocument()
  })
})
