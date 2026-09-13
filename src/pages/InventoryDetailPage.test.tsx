import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { InventoryDetailPage } from './InventoryDetailPage'
import type { InventoryItem } from '../types/api'

const BASE = 'http://localhost:8081'

function item(): InventoryItem {
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
    categories: [{ id: 'cat-1', name: 'Snacks', slug: 'snacks' }],
    isPreorder: false,
    expectedReleaseDate: null,
    boughtPrice: null,
  }
}

describe('InventoryDetailPage', () => {
  it('renders the item fetched by id', async () => {
    server.use(http.get(`${BASE}/api/inventory/item-1`, () => HttpResponse.json(item())))

    renderWithProviders(
      <Routes>
        <Route path="/inventory/:id" element={<InventoryDetailPage />} />
      </Routes>,
      ['/inventory/item-1'],
    )

    expect(await screen.findByText('Kit Kat matcha')).toBeInTheDocument()
    expect(screen.getByText(/Snacks/)).toBeInTheDocument()
    expect(screen.getByText('Request this item')).toHaveAttribute('href', '/orders/new?inventoryItemId=item-1')
  })

  it('shows a not-found message for a missing item', async () => {
    server.use(http.get(`${BASE}/api/inventory/missing`, () => new HttpResponse(null, { status: 404 })))

    renderWithProviders(
      <Routes>
        <Route path="/inventory/:id" element={<InventoryDetailPage />} />
      </Routes>,
      ['/inventory/missing'],
    )

    expect(await screen.findByText('Item not found.')).toBeInTheDocument()
  })
})
