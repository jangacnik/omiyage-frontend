import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminOrdersPage } from './AdminOrdersPage'
import type { OrderDto, Page } from '../../types/api'

const BASE = 'http://localhost:8081'

function order(): OrderDto {
  return {
    id: 'order-12345678',
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

function page(content: OrderDto[]): Page<OrderDto> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 }
}

describe('AdminOrdersPage', () => {
  it('lists orders and opens the management view in a dialog on click', async () => {
    server.use(
      http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([order()]))),
      http.get(`${BASE}/api/orders/order-12345678`, () => HttpResponse.json(order())),
      http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([])),
    )
    const user = userEvent.setup()

    renderWithProviders(<AdminOrdersPage />)

    expect(await screen.findByText(/Order order-12/)).toBeInTheDocument()
    expect(screen.getByText('1 item(s)')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Order order-12/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Order order-12/ }))

    expect(await screen.findByRole('button', { name: 'Close' })).toBeInTheDocument()
    expect(screen.getByText(/Total price:/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no orders', async () => {
    server.use(http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([]))))

    renderWithProviders(<AdminOrdersPage />)

    expect(await screen.findByText('No orders found.')).toBeInTheDocument()
  })

  it('shows the nickname instead of the id when set, with the id still visible', async () => {
    server.use(
      http.get(`${BASE}/api/admin/orders`, () =>
        HttpResponse.json(page([{ ...order(), nickname: "Grandma's Gifts" }])),
      ),
    )

    renderWithProviders(<AdminOrdersPage />)

    expect(await screen.findByText(/Grandma's Gifts/)).toBeInTheDocument()
    expect(screen.getByText('(order-12)')).toBeInTheDocument()
  })

  it('deletes an order after confirming', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([order()]))),
      http.delete(`${BASE}/api/admin/orders/order-12345678`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<AdminOrdersPage />)
    await screen.findByText(/Order order-12/)
    await user.click(screen.getByText('Delete'))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('shows an error message when deleting an order fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([order()]))),
      http.delete(`${BASE}/api/admin/orders/order-12345678`, () => HttpResponse.json({ message: 'nope' }, { status: 409 })),
    )

    renderWithProviders(<AdminOrdersPage />)
    await screen.findByText(/Order order-12/)
    await user.click(screen.getByText('Delete'))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    expect(await screen.findByText('Could not delete that order.')).toBeInTheDocument()
  })

  it('disables merge, with a hint, when selected orders belong to different users', async () => {
    const user = userEvent.setup()
    const a = { ...order(), id: 'order-aaaaaaaa', userId: 'user-1' }
    const b = { ...order(), id: 'order-bbbbbbbb', userId: 'user-2' }
    server.use(http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([a, b]))))

    renderWithProviders(<AdminOrdersPage />)
    await screen.findByText(/Order order-aa/)

    await user.click(screen.getByLabelText('Select order order-aa'))
    await user.click(screen.getByLabelText('Select order order-bb'))

    const mergeButton = screen.getByText('Merge 2 into one order')
    expect(mergeButton).toBeDisabled()
    expect(mergeButton).toHaveAttribute('title', expect.stringContaining('same user'))
  })

  it('merges selected orders belonging to the same user', async () => {
    const user = userEvent.setup()
    let mergedIds: string[] = []
    const a = { ...order(), id: 'order-aaaaaaaa', userId: 'user-1' }
    const b = { ...order(), id: 'order-bbbbbbbb', userId: 'user-1' }
    server.use(
      http.get(`${BASE}/api/admin/orders`, () => HttpResponse.json(page([a, b]))),
      http.post(`${BASE}/api/admin/orders/merge`, async ({ request }) => {
        mergedIds = ((await request.json()) as { orderIds: string[] }).orderIds
        return HttpResponse.json({ ...a, items: [...a.items, ...b.items] })
      }),
    )

    renderWithProviders(<AdminOrdersPage />)
    await screen.findByText(/Order order-aa/)

    await user.click(screen.getByLabelText('Select order order-aa'))
    await user.click(screen.getByLabelText('Select order order-bb'))

    const mergeButton = screen.getByText('Merge 2 into one order')
    expect(mergeButton).not.toBeDisabled()
    await user.click(mergeButton)
    await user.click(await screen.findByRole('button', { name: 'Merge' }))

    await waitFor(() => expect(mergedIds.sort()).toEqual(['order-aaaaaaaa', 'order-bbbbbbbb']))
  })
})
