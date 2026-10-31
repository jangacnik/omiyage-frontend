import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminExchangeRatePage } from './AdminExchangeRatePage'

const BASE = 'http://localhost:8081'

function useRates() {
  server.use(
    http.get(`${BASE}/api/admin/exchange-rate`, () => HttpResponse.json({ jpyPerEur: 160 })),
    http.get(`${BASE}/api/admin/exchange-rate/shipping`, () => HttpResponse.json({ shippingJpyPerEur: 170 })),
  )
}

describe('AdminExchangeRatePage', () => {
  it('prefills both rates from the server', async () => {
    useRates()
    renderWithProviders(<AdminExchangeRatePage />)

    expect(await screen.findByLabelText('JPY per EUR')).toHaveValue(160)
    expect(await screen.findByLabelText('Shipping JPY per EUR')).toHaveValue(170)
  })

  it('saves the item rate and confirms', async () => {
    const user = userEvent.setup()
    let body: unknown = null
    useRates()
    server.use(
      http.put(`${BASE}/api/admin/exchange-rate`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ jpyPerEur: 155.5 })
      }),
    )
    renderWithProviders(<AdminExchangeRatePage />)

    const input = await screen.findByLabelText('JPY per EUR')
    await user.clear(input)
    await user.type(input, '155.5')
    await user.click(screen.getAllByText('Save')[0])

    expect(await screen.findByText('Saved.')).toBeInTheDocument()
    expect(body).toEqual({ jpyPerEur: 155.5 })
  })

  it('saves the shipping rate independently', async () => {
    const user = userEvent.setup()
    let body: unknown = null
    useRates()
    server.use(
      http.put(`${BASE}/api/admin/exchange-rate/shipping`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ shippingJpyPerEur: 180 })
      }),
    )
    renderWithProviders(<AdminExchangeRatePage />)

    const input = await screen.findByLabelText('Shipping JPY per EUR')
    await user.clear(input)
    await user.type(input, '180')
    await user.click(screen.getAllByText('Save')[1])

    await waitFor(() => expect(body).toEqual({ shippingJpyPerEur: 180 }))
  })

  it.each(['', '0', '-3'])('does not submit the invalid value "%s"', async (value) => {
    const user = userEvent.setup()
    let called = false
    useRates()
    server.use(
      http.put(`${BASE}/api/admin/exchange-rate`, () => {
        called = true
        return HttpResponse.json({ jpyPerEur: 1 })
      }),
    )
    renderWithProviders(<AdminExchangeRatePage />)

    const input = await screen.findByLabelText('JPY per EUR')
    await user.clear(input)
    if (value) await user.type(input, value)
    await user.click(screen.getAllByText('Save')[0])

    expect(called).toBe(false)
    expect(screen.queryByText('Saved.')).not.toBeInTheDocument()
  })

  it('shows an error when saving fails', async () => {
    const user = userEvent.setup()
    useRates()
    server.use(http.put(`${BASE}/api/admin/exchange-rate`, () => HttpResponse.json({}, { status: 500 })))
    renderWithProviders(<AdminExchangeRatePage />)

    await screen.findByLabelText('JPY per EUR')
    await user.click(screen.getAllByText('Save')[0])

    expect(await screen.findByText('Could not save the rate.')).toBeInTheDocument()
  })
})
