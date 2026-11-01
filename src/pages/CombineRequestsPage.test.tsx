import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { CombineRequestsPage } from './CombineRequestsPage'
import type { CombineRequestDto } from '../types/api'

const BASE = 'http://localhost:8081'

const request: CombineRequestDto = {
  id: 'req-1',
  requesterOrder: { id: 'abcdef12-0000', nickname: 'Gifts', itemCount: 2 },
  targetShipment: { id: 'ship-1234-0000', title: 'October box', itemCount: 3, totalWeightGrams: 500 },
  status: 'PENDING',
  createdAt: '2026-10-01T00:00:00Z',
  respondedAt: null,
  resultingShipmentId: null,
}

function useLists(incoming: CombineRequestDto[], outgoing: CombineRequestDto[]) {
  server.use(
    http.get(`${BASE}/api/orders/combine-requests/incoming`, () => HttpResponse.json(incoming)),
    http.get(`${BASE}/api/orders/combine-requests/outgoing`, () => HttpResponse.json(outgoing)),
  )
}

describe('CombineRequestsPage', () => {
  it('shows empty states when there are no requests', async () => {
    useLists([], [])
    renderWithProviders(<CombineRequestsPage />)

    expect(await screen.findByText('Nothing waiting on you')).toBeInTheDocument()
    expect(await screen.findByText('No requests sent')).toBeInTheDocument()
  })

  it('shows an error with retry when a list fails to load', async () => {
    const user = userEvent.setup()
    let calls = 0
    server.use(
      http.get(`${BASE}/api/orders/combine-requests/incoming`, () => {
        calls += 1
        return calls === 1 ? HttpResponse.json({}, { status: 500 }) : HttpResponse.json([])
      }),
      http.get(`${BASE}/api/orders/combine-requests/outgoing`, () => HttpResponse.json({}, { status: 500 })),
    )
    renderWithProviders(<CombineRequestsPage />)

    expect(await screen.findByText('Could not load incoming requests.')).toBeInTheDocument()
    expect(await screen.findByText('Could not load outgoing requests.')).toBeInTheDocument()

    const incomingSection = screen.getByRole('heading', { name: 'Incoming' }).closest('section') as HTMLElement
    await user.click(within(incomingSection).getByText('Try again'))

    expect(await screen.findByText('Nothing waiting on you')).toBeInTheDocument()
  })

  it('renders incoming requests with the order nickname and shipment title', async () => {
    useLists([request], [])
    renderWithProviders(<CombineRequestsPage />)

    expect(await screen.findByText('Gifts')).toBeInTheDocument()
    expect(screen.getByText('(abcdef12)')).toBeInTheDocument()
    expect(screen.getByText('October box')).toBeInTheDocument()
  })

  it('falls back to short ids when nickname and title are missing', async () => {
    useLists(
      [{ ...request, requesterOrder: { ...request.requesterOrder, nickname: null }, targetShipment: { ...request.targetShipment, title: null } }],
      [],
    )
    renderWithProviders(<CombineRequestsPage />)

    expect(await screen.findByText('abcdef12')).toBeInTheDocument()
    expect(screen.getByText('shipment ship-123')).toBeInTheDocument()
  })

  it('accepts an incoming request via the accept endpoint', async () => {
    const user = userEvent.setup()
    const calls: string[] = []
    useLists([request], [])
    server.use(
      http.post(`${BASE}/api/orders/combine-requests/req-1/accept`, () => {
        calls.push('accept')
        return HttpResponse.json(request)
      }),
    )
    renderWithProviders(<CombineRequestsPage />)

    await user.click(await screen.findByLabelText('Accept'))

    await waitFor(() => expect(calls).toEqual(['accept']))
  })

  it('declines an incoming request via the decline endpoint', async () => {
    const user = userEvent.setup()
    const calls: string[] = []
    useLists([request], [])
    server.use(
      http.post(`${BASE}/api/orders/combine-requests/req-1/decline`, () => {
        calls.push('decline')
        return HttpResponse.json(request)
      }),
    )
    renderWithProviders(<CombineRequestsPage />)

    await user.click(await screen.findByLabelText('Decline'))

    await waitFor(() => expect(calls).toEqual(['decline']))
  })

  it('shows an error when accepting fails', async () => {
    const user = userEvent.setup()
    useLists([request], [])
    server.use(http.post(`${BASE}/api/orders/combine-requests/req-1/accept`, () => HttpResponse.json({}, { status: 500 })))
    renderWithProviders(<CombineRequestsPage />)

    await user.click(await screen.findByLabelText('Accept'))

    expect(await screen.findByText('Could not update this request.')).toBeInTheDocument()
  })

  it('cancels an outgoing request', async () => {
    const user = userEvent.setup()
    let cancelled = false
    useLists([], [request])
    server.use(
      http.delete(`${BASE}/api/orders/combine-requests/req-1`, () => {
        cancelled = true
        return HttpResponse.json(request)
      }),
    )
    renderWithProviders(<CombineRequestsPage />)

    expect(await screen.findByText(/waiting for them to respond/)).toBeInTheDocument()
    await user.click(screen.getByLabelText('Cancel request'))

    await waitFor(() => expect(cancelled).toBe(true))
  })

  it('shows an error when cancelling fails', async () => {
    const user = userEvent.setup()
    useLists([], [request])
    server.use(http.delete(`${BASE}/api/orders/combine-requests/req-1`, () => HttpResponse.json({}, { status: 500 })))
    renderWithProviders(<CombineRequestsPage />)

    await user.click(await screen.findByLabelText('Cancel request'))

    expect(await screen.findByText('Could not cancel this request.')).toBeInTheDocument()
  })
})
