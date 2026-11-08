import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NotFoundPage, RouteErrorPage } from './ErrorPages'

afterEach(() => vi.restoreAllMocks())

function renderRoutes(initialEntry: string, routes: Parameters<typeof createMemoryRouter>[0]) {
  return render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [initialEntry] })} />)
}

describe('NotFoundPage', () => {
  it('says the page does not exist and links home', () => {
    renderRoutes('/nope', [
      { path: '/', element: <div>home</div> },
      { path: '*', element: <NotFoundPage /> },
    ])

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute('href', '/')
  })
})

describe('RouteErrorPage', () => {
  it('shows friendly text without the error message or stack when a route throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderRoutes('/', [
      {
        path: '/',
        element: <Boom />,
        errorElement: <RouteErrorPage />,
      },
    ])

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.queryByText(/secret internal detail/)).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the start page' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('shows the not-found page for a 404 response thrown by a route', () => {
    renderRoutes('/', [
      {
        path: '/',
        loader: () => {
          throw new Response('', { status: 404 })
        },
        element: <div>never</div>,
        errorElement: <RouteErrorPage />,
      },
    ])

    return screen.findByRole('heading', { name: 'Page not found' })
  })
})

function Boom(): never {
  throw new Error('secret internal detail')
}
