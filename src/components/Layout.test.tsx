import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../test/renderWithProviders'
import { useAuthStore } from '../store/authStore'
import { makeFakeToken } from '../test/fakeJwt'
import { Layout } from './Layout'

const futureExp = Math.floor(Date.now() / 1000) + 3600

function renderLayout() {
  return renderWithProviders(
    <Routes>
      <Route element={<Layout />}>
        <Route path="/inventory" element={<div>inventory page</div>} />
        <Route path="/profile" element={<div>profile page</div>} />
      </Route>
    </Routes>,
    ['/inventory'],
  )
}

describe('Layout account menu', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('omiyage.onboarding.dismissed', '1')
    const token = makeFakeToken({ sub: 'u1', nickname: 'bob', role: 'USER', exp: futureExp })
    useAuthStore.getState().login(token)
  })

  it('keeps Profile and Log out collapsed under the nickname until opened', () => {
    renderLayout()

    const summary = screen.getByText('bob')
    const details = summary.closest('details') as HTMLDetailsElement
    expect(details.open).toBe(false)
  })

  it('opens Profile and Log out from a dropdown under the nickname', async () => {
    const user = userEvent.setup()
    renderLayout()

    await user.click(screen.getByText('bob'))

    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('logs out and navigates to Profile from the dropdown, closing it after', async () => {
    const user = userEvent.setup()
    renderLayout()

    const summary = screen.getByText('bob')
    const details = summary.closest('details') as HTMLDetailsElement

    await user.click(summary)
    await user.click(screen.getByRole('link', { name: 'Profile' }))

    expect(await screen.findByText('profile page')).toBeInTheDocument()
    expect(details.open).toBe(false)
  })

  it('closes the dropdown after logging out', async () => {
    const user = userEvent.setup()
    renderLayout()

    const summary = screen.getByText('bob')
    const details = summary.closest('details') as HTMLDetailsElement

    await user.click(summary)
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(details.open).toBe(false)
  })
})
