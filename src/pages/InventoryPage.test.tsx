import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { useAuthStore } from '../store/authStore'
import { makeFakeToken } from '../test/fakeJwt'
import { InventoryPage } from './InventoryPage'
import type { InventoryItem, Page } from '../types/api'

const futureExp = Math.floor(Date.now() / 1000) + 3600

const BASE = 'http://localhost:8081'

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    title: 'Kit Kat matcha',
    description: 'Sealed box',
    link: null,
    condition: 'NEW',
    priceAmount: 1200,
    currency: 'JPY',
    stockQuantity: 3,
    status: 'ACTIVE',
    images: [],
    categories: [],
    tags: [],
    isPreorder: false,
    expectedReleaseDate: null,
    weight: null,
    boughtPrice: null,
    profitEur: null,
    ...overrides,
  }
}

function page(content: InventoryItem[]): Page<InventoryItem> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 }
}

describe('InventoryPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null })
  })

  it('renders items returned by the API', async () => {
    server.use(
      http.get(`${BASE}/api/inventory`, () => HttpResponse.json(page([item()]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />)

    expect(await screen.findByText('Kit Kat matcha')).toBeInTheDocument()
  })

  it('shows an empty state when there are no results', async () => {
    server.use(
      http.get(`${BASE}/api/inventory`, () => HttpResponse.json(page([]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />)

    expect(await screen.findByText('No inventory yet')).toBeInTheDocument()
  })

  it('offers Clear filters when a search matches nothing', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/inventory`, ({ request }) =>
        HttpResponse.json(page(new URL(request.url).searchParams.get('title') ? [] : [item()])),
      ),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />)
    await screen.findByText('Kit Kat matcha')
    await user.type(screen.getByLabelText('Search'), 'zzz')
    await user.click(await screen.findByRole('button', { name: 'Clear filters' }))

    expect(await screen.findByText('Kit Kat matcha')).toBeInTheDocument()
    expect(screen.getByLabelText('Search')).toHaveValue('')
  })

  it('sends the typed search term as a title filter', async () => {
    const user = userEvent.setup()
    let capturedTitle: string | null = null
    server.use(
      http.get(`${BASE}/api/inventory`, ({ request }) => {
        capturedTitle = new URL(request.url).searchParams.get('title')
        return HttpResponse.json(page([item()]))
      }),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />)
    await screen.findByText('Kit Kat matcha')

    await user.type(screen.getByLabelText('Search'), 'kitkat')

    await waitFor(() => expect(capturedTitle).toBe('kitkat'))
  })

  it('toggling "In stock only" sends inStockOnly=true, and off omits it', async () => {
    const user = userEvent.setup()
    let capturedParam: string | null = null
    server.use(
      http.get(`${BASE}/api/inventory`, ({ request }) => {
        capturedParam = new URL(request.url).searchParams.get('inStockOnly')
        return HttpResponse.json(page([item()]))
      }),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />)
    await screen.findByText('Kit Kat matcha')
    expect(capturedParam).toBeNull()

    await user.click(screen.getByLabelText('In stock only'))
    await waitFor(() => expect(capturedParam).toBe('true'))

    await user.click(screen.getByLabelText('In stock only'))
    await waitFor(() => expect(capturedParam).toBeNull())
  })

  it('reads page and size from the URL and resets the page when the size changes', async () => {
    const user = userEvent.setup()
    let captured = { page: '', size: '' }
    server.use(
      http.get(`${BASE}/api/inventory`, ({ request }) => {
        const params = new URL(request.url).searchParams
        captured = { page: params.get('page') ?? '', size: params.get('size') ?? '' }
        return HttpResponse.json(page([item()]))
      }),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />, ['/?page=2&size=40'])
    await screen.findByText('Kit Kat matcha')
    expect(captured).toEqual({ page: '2', size: '40' })

    await user.selectOptions(screen.getByLabelText('Per page'), '80')

    await waitFor(() => expect(captured).toEqual({ page: '0', size: '80' }))
  })

  it('shows a request-only badge for a zero-quantity item', async () => {
    server.use(
      http.get(`${BASE}/api/inventory`, () => HttpResponse.json(page([item({ stockQuantity: 0 })]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />)

    expect(await screen.findByText('Request only')).toBeInTheDocument()
  })

  it('shows the stock quantity for an available item', async () => {
    server.use(
      http.get(`${BASE}/api/inventory`, () => HttpResponse.json(page([item({ stockQuantity: 3 })]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />)

    expect(await screen.findByText('3 in stock')).toBeInTheDocument()
  })

  it('does not show edit or delete controls to a regular user', async () => {
    server.use(
      http.get(`${BASE}/api/inventory`, () => HttpResponse.json(page([item()]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />)
    await screen.findByText('Kit Kat matcha')

    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument()
  })

  it('shows edit and delete controls to an admin', async () => {
    const token = makeFakeToken({ sub: 'u1', nickname: 'root', role: 'ADMIN', exp: futureExp })
    useAuthStore.getState().login(token)
    server.use(
      http.get(`${BASE}/api/inventory`, () => HttpResponse.json(page([item()]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<InventoryPage />)
    await screen.findByText('Kit Kat matcha')

    expect(screen.getByRole('button', { name: 'Edit Kit Kat matcha' })).toBeInTheDocument()
  })
})
