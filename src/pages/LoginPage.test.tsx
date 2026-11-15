import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { server } from '../test/server'
import { renderWithProviders } from '../test/renderWithProviders'
import { useAuthStore } from '../store/authStore'
import { makeFakeToken } from '../test/fakeJwt'
import { LoginPage } from './LoginPage'

const LOGIN = 'http://localhost:8081/api/auth/login'

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nickname'), 'someone')
  await user.type(screen.getByLabelText('Password'), 'wrong{Enter}')
}

function renderLoginAt(entry: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>home page</p>} />
      <Route path="/orders" element={<p>orders page</p>} />
    </Routes>,
    [entry],
  )
}

describe('LoginPage', () => {
  beforeEach(() => useAuthStore.setState({ token: null, claims: null, sessionExpired: false }))

  describe('return to the requested page', () => {
    const TOKEN_RESPONSE = () => HttpResponse.json({ token: makeFakeToken({ sub: 'u1', nickname: 'bob', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 }) })

    it.each([
      ['the requested page', '/login?redirect=%2Forders', 'orders page'],
      ['the home page without a redirect', '/login', 'home page'],
      ['the home page for an off-site redirect', '/login?redirect=https%3A%2F%2Fevil.example', 'home page'],
      ['the home page for a protocol-relative redirect', '/login?redirect=%2F%2Fevil.example', 'home page'],
      ['the home page for a dot-segment redirect', '/login?redirect=%2F.%2F%2Fevil.example', 'home page'],
      ['the home page for a double-dot-segment redirect', '/login?redirect=%2F..%2F%2Fevil.example', 'home page'],
    ])('after password sign-in lands on %s', async (_name, entry, landing) => {
      server.use(http.post(LOGIN, TOKEN_RESPONSE))
      const user = userEvent.setup()
      renderLoginAt(entry)

      await user.type(screen.getByLabelText('Nickname'), 'bob')
      await user.type(screen.getByLabelText('Password'), 'secret{Enter}')

      expect(await screen.findByText(landing)).toBeInTheDocument()
    })

    it('sends an already signed-in visitor to the requested page', () => {
      useAuthStore.getState().login(makeFakeToken({ sub: 'u1', nickname: 'bob', role: 'USER', exp: Math.floor(Date.now() / 1000) + 3600 }))
      renderLoginAt('/login?redirect=%2Forders')

      expect(screen.getByText('orders page')).toBeInTheDocument()
    })
  })

  describe('failed sign-in', () => {
    const INCORRECT = 'Nickname or password is incorrect. After several failed tries the account is locked for a while.'

    it.each([
      ['wrong password, unknown nickname or locked account (one 401 from Meishi)', 401, 'invalid credentials', INCORRECT],
      ['frozen account', 403, 'account is frozen', 'This account is frozen. Ask an admin to reactivate it.'],
      ['rate limit', 429, 'too many login attempts', 'Too many sign-in attempts. Wait a few minutes, then try again.'],
      ['server error', 500, 'Internal Server Error', 'The server ran into a problem. Please try again in a moment.'],
      ['bad gateway', 502, 'Bad Gateway', 'The server ran into a problem. Please try again in a moment.'],
      ['other client error', 400, 'nickname must not be blank', INCORRECT],
    ])('%s: shows a clear message', async (_name, status, error, message) => {
      server.use(http.post(LOGIN, () => HttpResponse.json({ error }, { status })))
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
    })

    it('says the server cannot be reached when the request fails', async () => {
      server.use(http.post(LOGIN, () => HttpResponse.error()))
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      await submit(user)

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach the server. Check your connection and try again.')
    })

    it('moves focus to the error so it is seen and read', async () => {
      server.use(http.post(LOGIN, () => HttpResponse.json({ error: 'invalid credentials' }, { status: 401 })))
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      await submit(user)

      const alert = await screen.findByRole('alert')
      await waitFor(() => expect(alert).toHaveFocus())
    })

    it('replaces the session-expired notice with the new error', async () => {
      useAuthStore.setState({ sessionExpired: true })
      server.use(http.post(LOGIN, () => HttpResponse.json({ error: 'invalid credentials' }, { status: 401 })))
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)
      expect(screen.getByRole('alert')).toHaveTextContent('Session expired')

      await submit(user)

      await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(1))
      expect(screen.getByRole('alert')).toHaveTextContent(INCORRECT)
    })

    it('disables the button while signing in and submits on Enter', async () => {
      let release = () => {}
      server.use(http.post(LOGIN, () => new Promise<Response>((resolve) => {
        release = () => resolve(HttpResponse.json({ error: 'invalid credentials' }, { status: 401 }))
      })))
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />)

      await submit(user)

      const button = await screen.findByRole('button', { name: /Signing in/ })
      expect(button).toBeDisabled()
      release()
      expect(await screen.findByRole('button', { name: 'Sign in' })).toBeEnabled()
    })

    it('marks the fields for password managers', () => {
      renderWithProviders(<LoginPage />)

      expect(screen.getByLabelText('Nickname')).toHaveAttribute('autocomplete', 'username')
      expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    })
  })

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

    it('keeps the requested page for after the hosted login', async () => {
      server.use(
        http.get(CONFIG, () =>
          HttpResponse.json({ meishiSso: { enabled: true, authorizeUrl: 'https://meishi.example/oauth/authorize', clientId: 'omiyage' } }),
        ),
      )
      const user = userEvent.setup()
      renderWithProviders(<LoginPage />, ['/login?redirect=%2Forders%2F42'])

      await user.click(await screen.findByRole('button', { name: 'Continue with Meishi' }))

      await waitFor(() => expect(assign).toHaveBeenCalledTimes(1))
      expect(JSON.parse(sessionStorage.getItem('omiyage.meishiSso') as string).returnTo).toBe('/orders/42')
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
