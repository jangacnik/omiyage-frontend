import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { InventoryItemFormDialog } from './InventoryItemFormDialog'
import type { InventoryItem, ItemTemplateDto } from '../types/api'

const BASE = 'http://localhost:8081'

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 'item-1',
    title: 'Kit Kat matcha',
    description: null,
    link: null,
    condition: 'NEW',
    priceAmount: 12,
    currency: 'EUR',
    stockQuantity: 3,
    status: 'ACTIVE',
    images: [],
    categories: [],
    tags: [],
    isPreorder: false,
    expectedReleaseDate: null,
    weight: 250,
    boughtPrice: 1200,
    profitEur: 4,
    ...overrides,
  }
}

function template(overrides: Partial<ItemTemplateDto> = {}): ItemTemplateDto {
  return {
    id: 'template-1',
    name: 'Kit Kat box',
    title: 'Kit Kat matcha 12-pack',
    description: 'Sealed box',
    priceAmount: 12,
    boughtPrice: 1200,
    weight: 300,
    ...overrides,
  }
}

function stubCommonEndpoints(templates: ItemTemplateDto[] = []) {
  server.use(
    http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    http.get(`${BASE}/api/admin/item-templates`, () => HttpResponse.json(templates)),
  )
}

describe('InventoryItemFormDialog', () => {
  it('defaults a new item to zero stock', async () => {
    stubCommonEndpoints()
    renderWithProviders(<InventoryItemFormDialog onDone={() => {}} />)

    expect(await screen.findByLabelText('Stock quantity')).toHaveValue(0)
  })

  it('shows no template selector when there are no templates', async () => {
    stubCommonEndpoints([])
    renderWithProviders(<InventoryItemFormDialog onDone={() => {}} />)

    await screen.findByLabelText('Title')
    expect(screen.queryByLabelText('Start from a template')).not.toBeInTheDocument()
  })

  it('applies a template, filling only the fields it sets', async () => {
    const user = userEvent.setup()
    stubCommonEndpoints([template()])
    renderWithProviders(<InventoryItemFormDialog onDone={() => {}} />)

    await user.selectOptions(await screen.findByLabelText('Start from a template'), 'template-1')

    expect(screen.getByLabelText('Title')).toHaveValue('Kit Kat matcha 12-pack')
    expect(screen.getByLabelText('Price in EUR')).toHaveValue('12')
    expect(screen.getByLabelText('Bought price in JPY')).toHaveValue('1200')
    expect(screen.getByLabelText('Weight in grams')).toHaveValue('300')
  })

  it('does not offer a template selector in edit mode', async () => {
    stubCommonEndpoints([template()])
    renderWithProviders(<InventoryItemFormDialog item={item()} onDone={() => {}} />)

    await screen.findByDisplayValue('Kit Kat matcha')
    expect(screen.queryByLabelText('Start from a template')).not.toBeInTheDocument()
  })

  it('sends weight on create', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    stubCommonEndpoints()
    server.use(
      http.post(`${BASE}/api/admin/inventory`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(item(), { status: 201 })
      }),
    )

    renderWithProviders(<InventoryItemFormDialog onDone={() => {}} />)

    await user.type(await screen.findByLabelText('Title'), 'Pocky strawberry')
    await user.type(screen.getByLabelText('Price in EUR'), '500')
    await user.type(screen.getByLabelText('Weight in grams'), '150')
    await user.click(screen.getByText('Create item'))

    await waitFor(() => expect(capturedBody).toMatchObject({ weight: 150, stockQuantity: 0 }))
  })
})
