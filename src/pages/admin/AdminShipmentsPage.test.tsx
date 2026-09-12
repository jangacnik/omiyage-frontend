import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminShipmentsPage } from './AdminShipmentsPage'
import type { ShipmentDto } from '../../types/api'

const BASE = 'http://localhost:8081'

function shipment(overrides: Partial<ShipmentDto> = {}): ShipmentDto {
  return {
    id: 'ship-1',
    status: 'PREPARING',
    destination: 'SLOVENIA',
    shippingMethod: 'EMS',
    trackingNumber: null,
    notes: null,
    ownerUserId: 'user-1',
    totalWeightGrams: 500,
    shippingCostJpy: 4400,
    estimatedDays: 7,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    orders: [],
    ...overrides,
  }
}

describe('AdminShipmentsPage', () => {
  it('lists existing shipments', async () => {
    server.use(http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment()])))

    renderWithProviders(<AdminShipmentsPage />)

    expect(await screen.findByText(/Shipment ship-1/)).toBeInTheDocument()
  })

  it('deletes a shipment after confirming', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment()])),
      http.delete(`${BASE}/api/admin/shipments/ship-1`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<AdminShipmentsPage />)
    await screen.findByText(/Shipment ship-1/)
    await user.click(screen.getByText('Delete'))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('shows an error message when deleting a shipment fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/shipments`, () => HttpResponse.json([shipment()])),
      http.delete(`${BASE}/api/admin/shipments/ship-1`, () => HttpResponse.json({ message: 'conflict' }, { status: 409 })),
    )

    renderWithProviders(<AdminShipmentsPage />)
    await screen.findByText(/Shipment ship-1/)
    await user.click(screen.getByText('Delete'))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    expect(await screen.findByText('Could not delete this shipment.')).toBeInTheDocument()
  })
})
