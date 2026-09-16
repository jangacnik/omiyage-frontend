import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminItemTemplatesPage } from './AdminItemTemplatesPage'
import type { ItemTemplateDto } from '../../types/api'

const BASE = 'http://localhost:8081'

function template(overrides: Partial<ItemTemplateDto> = {}): ItemTemplateDto {
  return {
    id: 'template-1',
    name: 'Kit Kat box',
    title: 'Kit Kat matcha 12-pack',
    description: null,
    priceAmount: 12,
    boughtPrice: 1200,
    weight: 300,
    ...overrides,
  }
}

describe('AdminItemTemplatesPage', () => {
  it('lists existing templates with their preset values', async () => {
    server.use(http.get(`${BASE}/api/admin/item-templates`, () => HttpResponse.json([template()])))

    renderWithProviders(<AdminItemTemplatesPage />)

    expect(await screen.findByText('Kit Kat box')).toBeInTheDocument()
    expect(screen.getByText(/Kit Kat matcha 12-pack/)).toBeInTheDocument()
    expect(screen.getByText(/€12\.00/)).toBeInTheDocument()
    expect(screen.getByText(/¥1,200/)).toBeInTheDocument()
    expect(screen.getByText(/300 g/)).toBeInTheDocument()
  })

  it('shows a placeholder when a template has no preset values', async () => {
    server.use(
      http.get(`${BASE}/api/admin/item-templates`, () =>
        HttpResponse.json([template({ title: null, priceAmount: null, boughtPrice: null, weight: null })]),
      ),
    )

    renderWithProviders(<AdminItemTemplatesPage />)

    expect(await screen.findByText('No preset values')).toBeInTheDocument()
  })

  it('creates a template with the entered values', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/item-templates`, () => HttpResponse.json([])),
      http.post(`${BASE}/api/admin/item-templates`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(template(), { status: 201 })
      }),
    )

    renderWithProviders(<AdminItemTemplatesPage />)
    await screen.findByText('No item templates yet.')

    await user.type(screen.getByLabelText('Template name (new)'), 'Kit Kat box')
    await user.type(screen.getByLabelText('Item title (new)'), 'Kit Kat matcha 12-pack')
    await user.type(screen.getByLabelText('Price (new)'), '12')
    await user.type(screen.getByLabelText('Bought price (new)'), '1200')
    await user.type(screen.getByLabelText('Weight (new)'), '300')
    await user.click(screen.getByText('Add template'))

    await waitFor(() =>
      expect(capturedBody).toEqual({
        name: 'Kit Kat box',
        title: 'Kit Kat matcha 12-pack',
        priceAmount: 12,
        boughtPrice: 1200,
        weight: 300,
      }),
    )
  })

  it('edits a template', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/admin/item-templates`, () => HttpResponse.json([template()])),
      http.patch(`${BASE}/api/admin/item-templates/template-1`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(template({ name: 'Renamed box' }))
      }),
    )

    renderWithProviders(<AdminItemTemplatesPage />)
    await screen.findByText('Kit Kat box')
    await user.click(screen.getByText('Edit'))

    const nameInput = screen.getByLabelText('Template name (template-1)')
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed box')
    await user.click(screen.getByText('Save'))

    await waitFor(() => expect(capturedBody).toMatchObject({ name: 'Renamed box' }))
  })

  it('deletes a template after confirming', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.get(`${BASE}/api/admin/item-templates`, () => HttpResponse.json([template()])),
      http.delete(`${BASE}/api/admin/item-templates/template-1`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<AdminItemTemplatesPage />)
    await screen.findByText('Kit Kat box')
    await user.click(screen.getByText('Delete'))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })
})
