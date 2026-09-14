import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { makeFakeToken } from '../test/fakeJwt'
import { useAuthStore } from '../store/authStore'
import { MyShipmentPage } from './MyShipmentPage'
import type { MemberShipmentDto } from '../types/api'

const BASE = 'http://localhost:8081'

function shipment(overrides: Partial<MemberShipmentDto> = {}): MemberShipmentDto {
  return {
    id: 'ship-1',
    title: null,
    status: 'PREPARING',
    destination: 'SLOVENIA',
    shippingMethod: 'EMS',
    trackingNumber: null,
    ownerUserId: 'u1',
    totalWeightGrams: 500,
    shippingCostJpy: 4400,
    shippingCostEur: 32.34,
    estimatedDays: 7,
    shippedAt: null,
    arrivedAt: null,
    members: [
      {
        userId: 'u1',
        nickname: 'me',
        orders: [],
        itemTotals: [{ currency: 'EUR', amount: 25 }],
        shippingShareJpy: 4400,
        shippingShareEur: 32.34,
      },
    ],
    grandTotalItemTotals: [{ currency: 'EUR', amount: 25 }],
    ...overrides,
  }
}

describe('MyShipmentPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null })
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    useAuthStore.getState().login(makeFakeToken({ sub: 'u1', nickname: 'me', role: 'USER', exp: futureExp }))
  })

  it('shows the combined items+shipping total, per member and for the whole shipment', async () => {
    server.use(http.get(`${BASE}/api/shipments/mine/ship-1`, () => HttpResponse.json(shipment())))

    renderWithProviders(
      <Routes>
        <Route path="/shipments/:id" element={<MyShipmentPage />} />
      </Routes>,
      ['/shipments/ship-1'],
    )

    // 25 (items) + 32.34 (shipping) = 57.34, shown for both the member and the shipment overall.
    expect(await screen.findAllByText(/€57\.34 total/)).toHaveLength(2)
  })

  it('lets the owner change destination/method but only saves on an explicit Save click', async () => {
    const user = userEvent.setup()
    let patched: unknown = null
    server.use(
      http.get(`${BASE}/api/shipments/mine/ship-1`, () => HttpResponse.json(shipment())),
      http.patch(`${BASE}/api/shipments/mine/ship-1/shipping`, async ({ request }) => {
        patched = await request.json()
        return HttpResponse.json(shipment({ destination: 'AUSTRIA' }))
      }),
    )

    renderWithProviders(
      <Routes>
        <Route path="/shipments/:id" element={<MyShipmentPage />} />
      </Routes>,
      ['/shipments/ship-1'],
    )

    await screen.findByLabelText('Destination')
    expect(screen.queryByText('Save')).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Destination'), 'AUSTRIA')
    expect(patched).toBeNull()

    await user.click(await screen.findByText('Save'))
    await waitFor(() => expect(patched).toEqual({ destination: 'AUSTRIA', shippingMethod: 'EMS' }))
  })

  it('shows destination/method as read-only text once the shipment is no longer preparing', async () => {
    server.use(http.get(`${BASE}/api/shipments/mine/ship-1`, () => HttpResponse.json(shipment({ status: 'SHIPPED', shippedAt: '2026-01-01T00:00:00Z' }))))

    renderWithProviders(
      <Routes>
        <Route path="/shipments/:id" element={<MyShipmentPage />} />
      </Routes>,
      ['/shipments/ship-1'],
    )

    expect(await screen.findByText('Destination: SLOVENIA')).toBeInTheDocument()
    expect(screen.queryByLabelText('Destination')).not.toBeInTheDocument()
  })
})
