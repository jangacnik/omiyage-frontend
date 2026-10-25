import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { OrdersListPage } from './OrdersListPage'
import type { OrderDto, Page } from '../types/api'

const BASE = 'http://localhost:8081'

function order(overrides: Partial<OrderDto> = {}): OrderDto {
  return {
    id: 'order-123456789',
    userId: 'user-1',
    status: 'REQUESTED',
    open: true,
    notes: null,
    nickname: null,
    shipmentId: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    items: [],
    ...overrides,
  }
}

function page(content: OrderDto[]): Page<OrderDto> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 }
}

describe('OrdersListPage', () => {
  it('renders the caller\'s orders with a status badge', async () => {
    server.use(http.get(`${BASE}/api/orders/mine`, () => HttpResponse.json(page([order()]))))

    renderWithProviders(<OrdersListPage />)

    expect(await screen.findByText(/Order order-12/)).toBeInTheDocument()
    expect(screen.getByText('Requested')).toBeInTheDocument()
  })

  it('shows an empty state when there are no orders', async () => {
    server.use(http.get(`${BASE}/api/orders/mine`, () => HttpResponse.json(page([]))))

    renderWithProviders(<OrdersListPage />)

    expect(await screen.findByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Browse inventory' })).toHaveAttribute('href', '/inventory')
  })

  it('shows the nickname instead of the id when set, with the id still visible', async () => {
    server.use(
      http.get(`${BASE}/api/orders/mine`, () => HttpResponse.json(page([order({ nickname: "Grandma's Gifts" })]))),
    )

    renderWithProviders(<OrdersListPage />)

    expect(await screen.findByText(/Grandma's Gifts/)).toBeInTheDocument()
    expect(screen.getByText('(order-12)')).toBeInTheDocument()
  })

  it('shows an error state and retries with a text button', async () => {
    const user = userEvent.setup()
    let calls = 0
    server.use(
      http.get(`${BASE}/api/orders/mine`, () => {
        calls += 1
        return calls === 1 ? HttpResponse.json({ error: 'boom' }, { status: 500 }) : HttpResponse.json(page([order()]))
      }),
    )

    renderWithProviders(<OrdersListPage />)
    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText(/Order order-12/)).toBeInTheDocument()
  })
})
