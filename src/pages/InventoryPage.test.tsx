import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { InventoryPage } from './InventoryPage'
import type { InventoryItem, Page } from '../types/api'

const BASE = 'http://localhost:8081'

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    title: 'Kit Kat matcha',
    description: 'Sealed box',
    condition: 'NEW',
    priceAmount: 1200,
    currency: 'JPY',
    stockQuantity: 3,
    status: 'ACTIVE',
    images: [],
    categories: [],
    ...overrides,
  }
}

function page(content: InventoryItem[]): Page<InventoryItem> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 }
}

describe('InventoryPage', () => {
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

    expect(await screen.findByText('No items found.')).toBeInTheDocument()
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

    await user.type(screen.getByLabelText('Search by title'), 'kitkat')

    await waitFor(() => expect(capturedTitle).toBe('kitkat'))
  })
})
