import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { RouteTitle } from './RouteTitle'

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      {
        element: <RouteTitle />,
        children: [
          { path: '/titled', handle: { title: 'Inventory' }, element: <div>titled page</div> },
          {
            path: '/outer',
            handle: { title: 'Settings' },
            element: <div>outer</div>,
            children: [{ path: 'inner', handle: { title: 'Categories' }, element: <div>inner</div> }],
          },
          { path: '/untitled', element: <div>untitled page</div> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
}

describe('RouteTitle', () => {
  afterEach(() => {
    document.title = ''
  })

  it('sets the document title from the route handle', () => {
    renderAt('/titled')

    expect(screen.getByText('titled page')).toBeInTheDocument()
    expect(document.title).toBe('Inventory · Omiyage')
  })

  it('uses the deepest matching title', () => {
    renderAt('/outer/inner')

    expect(document.title).toBe('Categories · Omiyage')
  })

  it('falls back to the app name when no route has a title', () => {
    renderAt('/untitled')

    expect(document.title).toBe('Omiyage')
  })
})
