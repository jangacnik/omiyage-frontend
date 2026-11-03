import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
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

  it("shows the first item's image as the order icon, or a placeholder without one", async () => {
    server.use(
      http.get(`${BASE}/api/orders/mine`, () =>
        HttpResponse.json(page([order({ id: 'with-icon-1', iconUrl: '/api/images/abc' }), order({ id: 'no-icon-22' })])),
      ),
    )

    const { container } = renderWithProviders(<OrdersListPage />)

    await screen.findByText(/Order with-ico/)
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(container.querySelector('img')).toHaveAttribute('src', `${BASE}/api/images/abc`)
    expect(screen.getAllByTestId('order-icon')).toHaveLength(2)
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
  describe('merging', () => {
    const two = [order({ id: 'aaaaaaaa-1' }), order({ id: 'bbbbbbbb-2' })]

    it('offers merge only once two orders are selected and posts the selected ids after confirming', async () => {
      const user = userEvent.setup()
      let body: unknown = null
      server.use(
        http.get(`${BASE}/api/orders/mine`, () => HttpResponse.json(page(two))),
        http.post(`${BASE}/api/orders/merge`, async ({ request }) => {
          body = await request.json()
          return HttpResponse.json(two[0])
        }),
      )
      renderWithProviders(<OrdersListPage />)

      await user.click(await screen.findByLabelText('Select order aaaaaaaa to merge'))
      expect(screen.queryByText('Merge selected')).not.toBeInTheDocument()
      await user.click(screen.getByLabelText('Select order bbbbbbbb to merge'))
      expect(screen.getByText('2 orders selected')).toBeInTheDocument()

      await user.click(screen.getByText('Merge selected'))
      await user.click(await screen.findByRole('button', { name: 'Merge' }))

      await waitFor(() => expect(body).toEqual({ orderIds: ['aaaaaaaa-1', 'bbbbbbbb-2'] }))
      await waitFor(() => expect(screen.queryByText('2 orders selected')).not.toBeInTheDocument())
    })

    it('does not merge when the confirmation is cancelled', async () => {
      const user = userEvent.setup()
      let merged = false
      server.use(
        http.get(`${BASE}/api/orders/mine`, () => HttpResponse.json(page(two))),
        http.post(`${BASE}/api/orders/merge`, () => {
          merged = true
          return HttpResponse.json(two[0])
        }),
      )
      renderWithProviders(<OrdersListPage />)

      await user.click(await screen.findByLabelText('Select order aaaaaaaa to merge'))
      await user.click(screen.getByLabelText('Select order bbbbbbbb to merge'))
      await user.click(screen.getByText('Merge selected'))
      await user.click(await screen.findByRole('button', { name: 'Cancel' }))

      expect(merged).toBe(false)
      expect(screen.getByText('2 orders selected')).toBeInTheDocument()
    })

    it('shows the server error when merging fails', async () => {
      const user = userEvent.setup()
      server.use(
        http.get(`${BASE}/api/orders/mine`, () => HttpResponse.json(page(two))),
        http.post(`${BASE}/api/orders/merge`, () => HttpResponse.json({ error: 'Orders are in different states.' }, { status: 409 })),
      )
      renderWithProviders(<OrdersListPage />)

      await user.click(await screen.findByLabelText('Select order aaaaaaaa to merge'))
      await user.click(screen.getByLabelText('Select order bbbbbbbb to merge'))
      await user.click(screen.getByText('Merge selected'))
      await user.click(await screen.findByRole('button', { name: 'Merge' }))

      expect(await screen.findByText('Orders are in different states.')).toBeInTheDocument()
    })

    it('disables selection and hides the combine action for orders that are not open', async () => {
      server.use(http.get(`${BASE}/api/orders/mine`, () => HttpResponse.json(page([order({ open: false })]))))
      renderWithProviders(<OrdersListPage />)

      expect(await screen.findByLabelText('Select order order-12 to merge')).toBeDisabled()
      expect(screen.getByText("can't merge")).toBeInTheDocument()
      expect(screen.queryByLabelText(/Ask to join another member/)).not.toBeInTheDocument()
    })
  })

  it('groups orders sharing a shipment and switches between them with tabs', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/orders/mine`, () =>
        HttpResponse.json(
          page([
            order({ id: 'aaaaaaaa-1', shipmentId: 'ship-12345678', items: [] }),
            order({ id: 'bbbbbbbb-2', shipmentId: 'ship-12345678', status: 'PURCHASED' }),
          ]),
        ),
      ),
    )
    renderWithProviders(<OrdersListPage />)

    expect(await screen.findByText('Shipment ship-123')).toBeInTheDocument()
    expect(screen.getByText('Requested')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Order bbbbbbbb/ }))

    expect(screen.getByRole('link', { name: '0 item(s)' })).toHaveAttribute('href', '/orders/bbbbbbbb-2')
    expect(screen.queryByText('Requested')).not.toBeInTheDocument()
  })

  it('opens the combine request modal from an open order', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/orders/mine`, () => HttpResponse.json(page([order()]))),
      http.get(`${BASE}/api/shipments/browsable`, () => HttpResponse.json([])),
    )
    renderWithProviders(<OrdersListPage />)

    await user.click(await screen.findByLabelText(/Ask to join another member/))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })
})
