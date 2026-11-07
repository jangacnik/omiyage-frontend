import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { LoginPage } from './LoginPage'

describe('LoginPage', () => {
  it('announces empty-field errors and links them to the inputs', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    const nickname = await screen.findByLabelText('Nickname')
    expect(nickname).toHaveAttribute('aria-invalid', 'true')
    expect(nickname).toHaveAccessibleDescription('Enter your nickname')
    expect(screen.getAllByRole('alert')).toHaveLength(2)
  })

  describe('Continue with Meishi', () => {
    const CONFIG = 'http://localhost:8081/api/auth/config'
    const assign = vi.fn()
    const originalLocation = window.location

    beforeEach(() => {
      sessionStorage.clear()
      assign.mockReset()
      Object.defineProperty(window, 'location', { configurable: true, value: { origin: 'https://omiyage.example', assign } })
    })

    afterEach(() => {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    })

    it('is hidden while the server has the hosted login off', async () => {
      server.use(http.get(CONFIG, () => HttpResponse.json({ meishiSso: { enabled: false, authorizeUrl: null, clientId: null } })))
      renderWithProviders(<LoginPage />)

      await screen.findByRole('button', { name: 'Sign in' })
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Continue with Meishi' })).not.toBeInTheDocument())
    })

    it('is hidden when the config cannot be loaded', async () => {
      server.use(http.get(CONFIG, () => HttpResponse.json({ error: 'down' }, { status: 500 })))
      renderWithProviders(<LoginPage />)

      await screen.findByRole('button', { name: 'Sign in' })
      expect(screen.queryByRole('button', { name: 'Continue with Meishi' })).not.toBeInTheDocument()
    })

    it('is hidden when the server enables it without a login URL', async () => {
      server.use(http.get(CONFIG, () => HttpResponse.json({ meishiSso: { enabled: true, authorizeUrl: null, clientId: 'omiyage' } })))
      renderWithProviders(<LoginPage />)

      await screen.findByRole('button', { name: 'Sign in' })
      expect(screen.queryByRole('button', { name: 'Continue with Meishi' })).not.toBeInTheDocument()
    })

    it('is hidden when the login URL is not https', async () => {
      server.use(
        http.get(CONFIG, () =>
          HttpResponse.json({ meishiSso: { enabled: true, authorizeUrl: 'javascript:alert(1)', clientId: 'omiyage' } }),
        ),
      )
      renderWithProviders(<LoginPage />)

      await screen.findByRole('button', { name: 'Sign in' })
      expect(screen.queryByRole('button', { name: 'Continue with Meishi' })).not.toBeInTheDocument()
    })

    it('redirects once on a double click and stays disabled', async () => {
      server.use(
        http.get(CONFIG, () =>
          HttpResponse.json({ meishiSso: { enabled: true, authorizeUrl: 'https://meishi.example/oauth/authorize', clientId: 'omiyage' } }),
        ),
      )
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      const button = await screen.findByRole('button', { name: 'Continue with Meishi' })

      await user.dblClick(button)

      await waitFor(() => expect(assign).toHaveBeenCalledTimes(1))
      expect(button).toBeDisabled()
    })

    it('shows an error and allows another try when the request cannot be prepared', async () => {
      server.use(
        http.get(CONFIG, () =>
          HttpResponse.json({ meishiSso: { enabled: true, authorizeUrl: 'https://meishi.example/oauth/authorize', clientId: 'omiyage' } }),
        ),
      )
      const digest = vi.spyOn(crypto.subtle, 'digest').mockRejectedValueOnce(new Error('no crypto'))
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      await user.click(await screen.findByRole('button', { name: 'Continue with Meishi' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not start sign-in with Meishi')
      expect(assign).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: 'Continue with Meishi' })).toBeEnabled()
      digest.mockRestore()
    })

    it('sends the browser to the hosted login with state and a PKCE challenge', async () => {
      server.use(
        http.get(CONFIG, () =>
          HttpResponse.json({ meishiSso: { enabled: true, authorizeUrl: 'https://meishi.example/oauth/authorize', clientId: 'omiyage' } }),
        ),
      )
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      await user.click(await screen.findByRole('button', { name: 'Continue with Meishi' }))

      await waitFor(() => expect(assign).toHaveBeenCalledTimes(1))
      const url = new URL(assign.mock.calls[0][0])
      expect(url.origin + url.pathname).toBe('https://meishi.example/oauth/authorize')
      expect(url.searchParams.get('client_id')).toBe('omiyage')
      expect(url.searchParams.get('redirect_uri')).toBe('https://omiyage.example/auth/callback')
      expect(url.searchParams.get('code_challenge_method')).toBe('S256')
      expect(JSON.parse(sessionStorage.getItem('omiyage.meishiSso') as string).state).toBe(url.searchParams.get('state'))
    })
  })
})
