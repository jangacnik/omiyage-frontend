import { http, HttpResponse } from 'msw'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfirmProvider } from '../components/ConfirmDialog'
import { server } from '../test/server'
import { makeFakeToken } from '../test/fakeJwt'
import { queryClient } from '../lib/queryClient'
import { useAuthStore } from '../store/authStore'
import { router, routes } from './router'

const BASE = 'http://localhost:8081'
const emptyPage = { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }

function renderApp() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </QueryClientProvider>,
  )
}

function signIn(role: 'USER' | 'ADMIN') {
  const exp = Math.floor(Date.now() / 1000) + 3600
  useAuthStore.getState().login(makeFakeToken({ sub: 'u1', nickname: 'bob', role, exp }))
}

describe('router', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null })
    server.use(
      http.get(`${BASE}/api/inventory`, () => HttpResponse.json(emptyPage)),
      http.get(`${BASE}/api/categories`, () => HttpResponse.json([])),
    )
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('shows a loading state while the first lazy page loads', () => {
    render(<>{router.routes[0].hydrateFallbackElement}</>)

    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  it('does not warn about a missing HydrateFallback while a lazy route loads', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const memoryRouter = createMemoryRouter(routes, { initialEntries: ['/login'] })
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={memoryRouter} />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Sign in to browse and request souvenirs.')).toBeInTheDocument()
    expect(warn.mock.calls.flat().join(' ')).not.toMatch(/HydrateFallback/)
    warn.mockRestore()
  })

  it('shows the branded not-found page for an unknown path', async () => {
    await router.navigate('/does-not-exist')
    renderApp()

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(document.title).toBe('Page not found · Omiyage')
  })

  it('sends an unauthenticated visitor to the login page', async () => {
    await router.navigate('/cart')
    renderApp()

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(await screen.findByText('Sign in to browse and request souvenirs.')).toBeInTheDocument()
    expect(document.title).toBe('Sign in · Omiyage')
  })

  it('redirects the root path to the inventory for a signed-in user', async () => {
    signIn('USER')
    await router.navigate('/')
    renderApp()

    await waitFor(() => expect(router.state.location.pathname).toBe('/inventory'))
    await waitFor(() => expect(document.title).toBe('Inventory · Omiyage'))
  })

  it('keeps a non-admin out of the admin area', async () => {
    signIn('USER')
    await router.navigate('/admin/orders')
    renderApp()

    await waitFor(() => expect(router.state.location.pathname).toBe('/inventory'))
  })

  it('titles the cart route for a signed-in user', async () => {
    signIn('USER')
    await router.navigate('/cart')
    renderApp()

    expect(await screen.findByText('Your cart is empty')).toBeInTheDocument()
    expect(document.title).toBe('Cart · Omiyage')
  })
})
