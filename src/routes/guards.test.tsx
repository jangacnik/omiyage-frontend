import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { RequireAdmin, RequireAuth } from './guards'
import { useAuthStore } from '../store/authStore'
import { makeFakeToken } from '../test/fakeJwt'

const futureExp = Math.floor(Date.now() / 1000) + 3600

function renderWithGuard(guard: () => ReactElement, initialPath: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <div>login page</div> },
      { path: '/inventory', element: <div>inventory page</div> },
      {
        element: guard(),
        children: [{ path: '/protected', element: <div>protected page</div> }],
      },
    ],
    { initialEntries: [initialPath] },
  )
  render(<RouterProvider router={router} />)
}

describe('RequireAuth', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null })
  })

  it('redirects to /login when there is no token', () => {
    renderWithGuard(() => <RequireAuth />, '/protected')
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('renders the protected route when a token is present', () => {
    const token = makeFakeToken({ sub: 'u1', nickname: 'bob', role: 'USER', exp: futureExp })
    useAuthStore.getState().login(token)

    renderWithGuard(() => <RequireAuth />, '/protected')
    expect(screen.getByText('protected page')).toBeInTheDocument()
  })
})

describe('RequireAdmin', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null })
  })

  it('redirects a non-admin user to /inventory', () => {
    const token = makeFakeToken({ sub: 'u1', nickname: 'bob', role: 'USER', exp: futureExp })
    useAuthStore.getState().login(token)

    renderWithGuard(() => <RequireAdmin />, '/protected')
    expect(screen.getByText('inventory page')).toBeInTheDocument()
  })

  it('renders the protected route for an admin', () => {
    const token = makeFakeToken({ sub: 'u1', nickname: 'root', role: 'ADMIN', exp: futureExp })
    useAuthStore.getState().login(token)

    renderWithGuard(() => <RequireAdmin />, '/protected')
    expect(screen.getByText('protected page')).toBeInTheDocument()
  })
})
