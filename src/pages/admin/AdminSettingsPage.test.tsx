import { http, HttpResponse } from 'msw'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Route, Routes, Navigate } from 'react-router-dom'
import { server } from '../../test/server'
import { renderWithProviders } from '../../test/renderWithProviders'
import { AdminSettingsPage } from './AdminSettingsPage'
import { AdminCategoriesPage } from './AdminCategoriesPage'
import { AdminShippingRatesPage } from './AdminShippingRatesPage'

const BASE = 'http://localhost:8081'

function renderPage(initialPath = '/admin/settings/categories') {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/settings" element={<AdminSettingsPage />}>
        <Route index element={<Navigate to="/admin/settings/categories" replace />} />
        <Route path="categories" element={<AdminCategoriesPage />} />
        <Route path="shipping-rates" element={<AdminShippingRatesPage />} />
      </Route>
    </Routes>,
    [initialPath],
  )
}

describe('AdminSettingsPage', () => {
  it('shows the categories tab by default and lets an admin switch to shipping rates', async () => {
    const user = userEvent.setup()
    server.use(
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([{ id: 'c1', name: 'Snacks', slug: 'snacks' }])),
      http.get(`${BASE}/api/admin/shipping-rates`, () => HttpResponse.json([])),
    )

    renderPage()

    expect(await screen.findByText('Snacks')).toBeInTheDocument()

    await user.click(screen.getByText('Shipping rates'))

    expect(await screen.findByText('No shipping rates configured yet.')).toBeInTheDocument()
  })

  it('deep-links directly to the shipping rates tab', async () => {
    server.use(http.get(`${BASE}/api/admin/shipping-rates`, () => HttpResponse.json([])))

    renderPage('/admin/settings/shipping-rates')

    expect(await screen.findByText('No shipping rates configured yet.')).toBeInTheDocument()
  })
})
