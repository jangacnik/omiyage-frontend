import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminInventoryPage } from './AdminInventoryPage'
import type { InventoryItem, Page } from '../../types/api'

const BASE = 'http://localhost:8081'

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    title: 'Kit Kat matcha',
    description: null,
    link: null,
    condition: 'NEW',
    priceAmount: 1200,
    currency: 'JPY',
    stockQuantity: 3,
    status: 'ACTIVE',
    images: [],
    categories: [],
    isPreorder: false,
    expectedReleaseDate: null,
    boughtPrice: null,
    profitEur: null,
    ...overrides,
  }
}

function page(content: InventoryItem[]): Page<InventoryItem> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 }
}

describe('AdminInventoryPage', () => {
  it('lists existing inventory items', async () => {
    server.use(
      http.get(`${BASE}/api/admin/inventory`, () => HttpResponse.json(page([item()]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<AdminInventoryPage />)

    expect(await screen.findByText(/Kit Kat matcha/)).toBeInTheDocument()
  })

  it('creates an item with the selected category', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/inventory`, () => HttpResponse.json(page([]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([{ id: 'cat-1', name: 'Snacks', slug: 'snacks' }])),
      http.post(`${BASE}/api/admin/inventory`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(item(), { status: 201 })
      }),
    )

    renderWithProviders(<AdminInventoryPage />)
    await screen.findByText('Snacks')

    await user.type(screen.getByLabelText('Title'), 'Pocky strawberry')
    await user.type(screen.getByLabelText('Price in EUR'), '500')
    await user.type(screen.getByLabelText('Stock quantity'), '10')
    await user.click(screen.getByLabelText('Snacks'))
    await user.click(screen.getByText('Create item'))

    await waitFor(() =>
      expect(capturedBody).toMatchObject({
        title: 'Pocky strawberry',
        priceAmount: 500,
        stockQuantity: 10,
        categoryIds: ['cat-1'],
      }),
    )
  })

  it('creates an item with a bought price', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/inventory`, () => HttpResponse.json(page([]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
      http.post(`${BASE}/api/admin/inventory`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(item(), { status: 201 })
      }),
    )

    renderWithProviders(<AdminInventoryPage />)

    await user.type(screen.getByLabelText('Title'), 'Pocky strawberry')
    await user.type(screen.getByLabelText('Price in EUR'), '500')
    await user.type(screen.getByLabelText('Bought price in JPY'), '300')
    await user.type(screen.getByLabelText('Stock quantity'), '10')
    await user.click(screen.getByText('Create item'))

    await waitFor(() => expect(capturedBody).toMatchObject({ priceAmount: 500, boughtPrice: 300 }))
  })

  it('shows profit for an item once a bought price is set', async () => {
    // boughtPrice (JPY) and profitEur (priceAmount[EUR] - converted boughtPrice) are computed
    // server-side - the component just renders profitEur, it never subtracts the two itself.
    server.use(
      http.get(`${BASE}/api/admin/inventory`, () => HttpResponse.json(page([item({ boughtPrice: 500, profitEur: 700 })]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<AdminInventoryPage />)

    expect(await screen.findByText(/profit €700/)).toBeInTheDocument()
  })

  it('has no archive control', async () => {
    server.use(
      http.get(`${BASE}/api/admin/inventory`, () => HttpResponse.json(page([item()]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<AdminInventoryPage />)
    await screen.findByText(/Kit Kat matcha/)

    expect(screen.queryByText('Archive')).not.toBeInTheDocument()
    expect(screen.queryByText('Activate')).not.toBeInTheDocument()
  })

  it('shows an out-of-stock badge when quantity is zero', async () => {
    server.use(
      http.get(`${BASE}/api/admin/inventory`, () => HttpResponse.json(page([item({ stockQuantity: 0 })]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )

    renderWithProviders(<AdminInventoryPage />)

    expect(await screen.findByText('Out of stock')).toBeInTheDocument()
  })

  it('deletes an item after confirming', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.get(`${BASE}/api/admin/inventory`, () => HttpResponse.json(page([item()]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
      http.delete(`${BASE}/api/admin/inventory/item-1`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<AdminInventoryPage />)
    await screen.findByText(/Kit Kat matcha/)
    await user.click(screen.getByLabelText('Delete Kit Kat matcha'))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })

  it('edits an existing item, including its link, without dropping images or categories', async () => {
    const user = userEvent.setup()
    const existing = item({
      images: ['img-key-1', 'img-key-2'],
      categories: [{ id: 'cat-1', name: 'Snacks', slug: 'snacks' }],
    })
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/inventory`, () => HttpResponse.json(page([existing]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([{ id: 'cat-1', name: 'Snacks', slug: 'snacks' }])),
      http.put(`${BASE}/api/admin/inventory/item-1`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ ...existing, link: 'https://example.com/kitkat' })
      }),
    )

    renderWithProviders(<AdminInventoryPage />)
    await screen.findByText(/Kit Kat matcha/)
    await user.click(screen.getByText('Edit'))

    const linkInput = screen.getByLabelText('Link for Kit Kat matcha')
    await user.type(linkInput, 'https://example.com/kitkat')
    await user.click(screen.getByText('Save'))

    await waitFor(() =>
      expect(capturedBody).toMatchObject({
        title: 'Kit Kat matcha',
        link: 'https://example.com/kitkat',
        imageKeys: ['img-key-1', 'img-key-2'],
        categoryIds: ['cat-1'],
      }),
    )
  })

  it('shows an error and stays open when saving an edit fails', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/admin/inventory`, () => HttpResponse.json(page([item()]))),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
      http.put(`${BASE}/api/admin/inventory/item-1`, () => HttpResponse.json({ message: 'conflict' }, { status: 409 })),
    )

    renderWithProviders(<AdminInventoryPage />)
    await screen.findByText(/Kit Kat matcha/)
    await user.click(screen.getByText('Edit'))
    await user.click(screen.getByText('Save'))

    expect(await screen.findByText('Could not save changes.')).toBeInTheDocument()
    expect(screen.getByLabelText('Title for Kit Kat matcha')).toBeInTheDocument()
  })
})
