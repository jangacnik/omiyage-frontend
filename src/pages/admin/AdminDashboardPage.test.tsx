import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminDashboardPage } from './AdminDashboardPage'
import type { OrderDto, UserDashboardEntryDto, UserProfileDto } from '../../types/api'

const BASE = 'http://localhost:8081'

function userProfile(overrides: Partial<UserProfileDto> = {}): UserProfileDto {
  return {
    id: 'user-1',
    nickname: 'Alice',
    email: 'alice@example.com',
    phone: null,
    firstName: null,
    lastName: null,
    addressLine1: null,
    addressLine2: null,
    postalCode: null,
    city: null,
    country: null,
    avatarKey: null,
    ...overrides,
  }
}

function order(overrides: Partial<OrderDto> = {}): OrderDto {
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
    ...overrides,
  }
}

function entry(overrides: Partial<UserDashboardEntryDto> = {}): UserDashboardEntryDto {
  return {
    user: userProfile(),
    orders: [order()],
    deliveredOrderCount: 0,
    pendingAmounts: [{ currency: 'JPY', amount: 2000 }],
    ...overrides,
  }
}

describe('AdminDashboardPage', () => {
  it('shows each user with their pending amount formatted per currency', async () => {
    server.use(
      http.get(`${BASE}/api/admin/dashboard/users`, () =>
        HttpResponse.json([
          entry({
            user: userProfile({ id: 'user-1', nickname: 'Alice' }),
            pendingAmounts: [{ currency: 'JPY', amount: 2000 }],
          }),
          entry({
            user: userProfile({ id: 'user-2', nickname: 'Bob' }),
            orders: [order({ id: 'order-2', userId: 'user-2' })],
            pendingAmounts: [{ currency: 'EUR', amount: 15 }],
          }),
        ]),
      ),
    )

    renderWithProviders(<AdminDashboardPage />)

    expect(await screen.findByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText(/¥2,000 owed/)).toBeInTheDocument()
    expect(screen.getByText(/€15.00 owed/)).toBeInTheDocument()
  })

  it('shows a settled user without any owing indicator', async () => {
    server.use(
      http.get(`${BASE}/api/admin/dashboard/users`, () =>
        HttpResponse.json([entry({ user: userProfile({ nickname: 'Debt-free Dana' }), pendingAmounts: [] })]),
      ),
    )

    renderWithProviders(<AdminDashboardPage />)

    expect(await screen.findByText('Debt-free Dana')).toBeInTheDocument()
    expect(screen.getByText('All settled')).toBeInTheDocument()
    expect(screen.queryByText(/owed/)).not.toBeInTheDocument()
  })

  it('shows an empty state when no users have ordered anything', async () => {
    server.use(http.get(`${BASE}/api/admin/dashboard/users`, () => HttpResponse.json([])))

    renderWithProviders(<AdminDashboardPage />)

    expect(await screen.findByText('No users have placed orders yet.')).toBeInTheDocument()
  })

  it('expands a user to reveal their order items', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/dashboard/users`, () => HttpResponse.json([entry()])),
    )

    renderWithProviders(<AdminDashboardPage />)

    await screen.findByText('Alice')
    expect(screen.queryByText('Ghibli museum ticket')).not.toBeInTheDocument()

    await user.click(screen.getByText('Alice'))

    expect(await screen.findByText('Ghibli museum ticket')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeInTheDocument()
  })

  it('lazily fetches delivered orders only once the accordion is opened', async () => {
    const user = userEvent.setup()
    let deliveredFetched = false
    server.use(
      http.get(`${BASE}/api/admin/dashboard/users`, () => HttpResponse.json([entry({ deliveredOrderCount: 2 })])),
      http.get(`${BASE}/api/admin/dashboard/users/user-1/delivered-orders`, () => {
        deliveredFetched = true
        return HttpResponse.json([order({ id: 'order-delivered', status: 'DELIVERED', nickname: 'Old order' })])
      }),
    )

    renderWithProviders(<AdminDashboardPage />)
    await screen.findByText('Alice')
    await user.click(screen.getByText('Alice'))

    expect(await screen.findByText('2 delivered order(s)')).toBeInTheDocument()
    expect(deliveredFetched).toBe(false)

    await user.click(screen.getByText('2 delivered order(s)'))

    await waitFor(() => expect(deliveredFetched).toBe(true))
    expect(await screen.findByText(/Old order/)).toBeInTheDocument()
  })

  it('shows an error when marking an item paid fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/dashboard/users`, () => HttpResponse.json([entry()])),
      http.patch(`${BASE}/api/admin/orders/order-12345678/items/item-1/paid`, () =>
        HttpResponse.json({ message: 'conflict' }, { status: 409 }),
      ),
    )

    renderWithProviders(<AdminDashboardPage />)
    await screen.findByText('Alice')
    await user.click(screen.getByText('Alice'))
    await user.click(await screen.findByRole('button', { name: 'Mark paid' }))

    expect(await screen.findByText('Could not update paid status.')).toBeInTheDocument()
  })

  it("lets an admin create an order on a user's behalf", async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/dashboard/users`, () => HttpResponse.json([entry()])),
      http.post(`${BASE}/api/admin/orders/for-user/user-1`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(order(), { status: 201 })
      }),
    )

    renderWithProviders(<AdminDashboardPage />)
    await screen.findByText('Alice')
    await user.click(screen.getByRole('button', { name: 'Create order' }))

    await user.type(screen.getByLabelText('Order nickname'), 'Test order')
    await user.click(screen.getByText("Can't find it? Create a custom request"))
    await user.type(screen.getByLabelText('Title'), 'Custom souvenir')
    await user.click(screen.getByText('Add item'))
    await user.click(screen.getByRole('button', { name: 'Create order' }))

    await waitFor(() =>
      expect(capturedBody).toMatchObject({ nickname: 'Test order', items: [{ title: 'Custom souvenir' }] }),
    )
  })

  it('shows an error when creating an order for a user fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/dashboard/users`, () => HttpResponse.json([entry()])),
      http.post(`${BASE}/api/admin/orders/for-user/user-1`, () => HttpResponse.json({ error: 'That user could not be found.' }, { status: 500 })),
    )

    renderWithProviders(<AdminDashboardPage />)
    await screen.findByText('Alice')
    await user.click(screen.getByRole('button', { name: 'Create order' }))
    await user.click(screen.getByText("Can't find it? Create a custom request"))
    await user.type(screen.getByLabelText('Title'), 'Custom souvenir')
    await user.click(screen.getByText('Add item'))
    await user.click(screen.getByRole('button', { name: 'Create order' }))

    expect(await screen.findByText('That user could not be found.')).toBeInTheDocument()
  })
})
