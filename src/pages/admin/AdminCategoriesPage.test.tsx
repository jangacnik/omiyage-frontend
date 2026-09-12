import { http, HttpResponse } from 'msw'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminCategoriesPage } from './AdminCategoriesPage'
import type { Category } from '../../types/api'

const BASE = 'http://localhost:8081'

describe('AdminCategoriesPage', () => {
  it('lists existing categories', async () => {
    server.use(http.get(`${BASE}/api/categories`, () => HttpResponse.json([{ id: 'c1', name: 'Snacks', slug: 'snacks' }] satisfies Category[])))

    renderWithProviders(<AdminCategoriesPage />)

    expect(await screen.findByText('Snacks')).toBeInTheDocument()
  })

  it('creates a category with a slugified name', async () => {
    const user = userEvent.setup()
    let capturedBody: unknown = null
    server.use(
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
      http.post(`${BASE}/api/admin/categories`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'c2', name: 'Video Games', slug: 'video-games' }, { status: 201 })
      }),
    )

    renderWithProviders(<AdminCategoriesPage />)
    await user.type(screen.getByLabelText('Category name'), 'Video Games')
    await user.click(screen.getByText('Add category'))

    await waitFor(() => expect(capturedBody).toEqual({ name: 'Video Games', slug: 'video-games' }))
  })

  it('deletes a category after confirming', async () => {
    const user = userEvent.setup()
    let deleteCalled = false
    server.use(
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([{ id: 'c1', name: 'Snacks', slug: 'snacks' }] satisfies Category[])),
      http.delete(`${BASE}/api/admin/categories/c1`, () => {
        deleteCalled = true
        return new HttpResponse(null, { status: 204 })
      }),
    )

    renderWithProviders(<AdminCategoriesPage />)
    await screen.findByText('Snacks')
    await user.click(screen.getByText('Delete'))

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByText('Delete'))

    await waitFor(() => expect(deleteCalled).toBe(true))
  })
})
