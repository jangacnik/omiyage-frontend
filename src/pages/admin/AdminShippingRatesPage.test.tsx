import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminShippingRatesPage } from './AdminShippingRatesPage'
import type { ShippingRateDto } from '../../types/api'

const BASE = 'http://localhost:8081'

function rate(overrides: Partial<ShippingRateDto> = {}): ShippingRateDto {
  return {
    id: 'rate-1',
    destination: 'SLOVENIA',
    shippingMethod: 'EMS',
    maxWeightGrams: 1000,
    costJpy: 4400,
    costEur: 32.34,
    estimatedDays: 7,
    ...overrides,
  }
}

describe('AdminShippingRatesPage', () => {
  it('lists existing rates grouped by destination and method', async () => {
    server.use(
      http.get(`${BASE}/api/admin/shipping-rates`, () =>
        HttpResponse.json([
          rate(),
          rate({
            id: 'rate-2',
            destination: 'AUSTRIA',
            shippingMethod: 'SMALL_PACKET',
            maxWeightGrams: 500,
            costJpy: 2000,
            estimatedDays: 10,
          }),
        ] satisfies ShippingRateDto[]),
      ),
    )

    renderWithProviders(<AdminShippingRatesPage />)

    expect(await screen.findByText(/up to 1\.00 kg/)).toBeInTheDocument()
    expect(screen.getByText(/up to 500 g/)).toBeInTheDocument()
    expect(screen.getByText('Slovenia', { selector: 'summary' })).toBeInTheDocument()
    expect(screen.getByText('Austria', { selector: 'summary' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'EMS' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Small Packet (air, up to 2kg)' })).toBeInTheDocument()
  })

  it('creates a rate with the entered values', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/shipping-rates`, () => HttpResponse.json([])),
      http.post(`${BASE}/api/admin/shipping-rates`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(rate(), { status: 201 })
      }),
    )

    renderWithProviders(<AdminShippingRatesPage />)
    await screen.findByText('No shipping rates configured yet.')

    await user.selectOptions(screen.getByLabelText('Destination'), 'SLOVENIA')
    await user.selectOptions(screen.getByLabelText('Shipping method'), 'EMS')
    await user.type(screen.getByLabelText('Max weight grams'), '1000')
    await user.type(screen.getByLabelText('Cost JPY'), '4400')
    await user.type(screen.getByLabelText('Estimated days'), '7')
    await user.click(screen.getByText('Add rate'))

    await waitFor(() =>
      expect(capturedBody).toEqual({
        destination: 'SLOVENIA',
        shippingMethod: 'EMS',
        maxWeightGrams: 1000,
        costJpy: 4400,
        estimatedDays: 7,
      }),
    )
  })

  it('deletes a rate after confirming', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.get(`${BASE}/api/admin/shipping-rates`, () => HttpResponse.json([rate()])),
      http.delete(`${BASE}/api/admin/shipping-rates/rate-1`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<AdminShippingRatesPage />)
    await screen.findByText(/up to 1\.00 kg/)
    await user.click(screen.getByText('Delete'))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('shows the 409 conflict message inline when creating a colliding rate', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/shipping-rates`, () => HttpResponse.json([])),
      http.post(`${BASE}/api/admin/shipping-rates`, () =>
        HttpResponse.json({ error: 'A rate for this destination, method and weight already exists.' }, { status: 409 }),
      ),
    )

    renderWithProviders(<AdminShippingRatesPage />)
    await screen.findByText('No shipping rates configured yet.')

    await user.type(screen.getByLabelText('Max weight grams'), '1000')
    await user.type(screen.getByLabelText('Cost JPY'), '4400')
    await user.type(screen.getByLabelText('Estimated days'), '7')
    await user.click(screen.getByText('Add rate'))

    expect(
      await screen.findByText('A rate for this destination, method and weight already exists.'),
    ).toBeInTheDocument()
  })

  it('starts each destination collapsed and expands it on click', async () => {
    const user = userEvent.setup()
    server.use(http.get(`${BASE}/api/admin/shipping-rates`, () => HttpResponse.json([rate()])))

    renderWithProviders(<AdminShippingRatesPage />)
    const summary = await screen.findByText('Slovenia', { selector: 'summary' })
    const details = summary.closest('details') as HTMLDetailsElement

    expect(details.open).toBe(false)

    await user.click(summary)

    expect(details.open).toBe(true)
  })

  it('shows the saved exchange rate and lets an admin update it', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/shipping-rates`, () => HttpResponse.json([])),
      http.get(`${BASE}/api/admin/exchange-rate`, () => HttpResponse.json({ jpyPerEur: 150 })),
      http.put(`${BASE}/api/admin/exchange-rate`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ jpyPerEur: 160 })
      }),
    )

    renderWithProviders(<AdminShippingRatesPage />)

    const input = await screen.findByLabelText('JPY per 1 EUR')
    await waitFor(() => expect(input).toHaveValue(150))

    await user.clear(input)
    await user.type(input, '160')
    await user.click(screen.getByText('Save rate'))

    await waitFor(() => expect(capturedBody).toEqual({ jpyPerEur: 160 }))
  })

  it('shows an error when saving the exchange rate fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/shipping-rates`, () => HttpResponse.json([])),
      http.get(`${BASE}/api/admin/exchange-rate`, () => HttpResponse.json({ jpyPerEur: 150 })),
      http.put(`${BASE}/api/admin/exchange-rate`, () => HttpResponse.json({ message: 'nope' }, { status: 500 })),
    )

    renderWithProviders(<AdminShippingRatesPage />)
    await waitFor(async () => expect(await screen.findByLabelText('JPY per 1 EUR')).toHaveValue(150))
    await user.click(screen.getByText('Save rate'))

    expect(await screen.findByText('Could not save the exchange rate.')).toBeInTheDocument()
  })
})
