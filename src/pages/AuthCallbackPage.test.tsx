import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders } from '../test/renderWithProviders'
import { makeFakeToken } from '../test/fakeJwt'
import { server } from '../test/server'
import { useAuthStore } from '../store/authStore'
import { AuthCallbackPage } from './AuthCallbackPage'

const EXCHANGE = 'http://localhost:8081/api/auth/meishi/exchange'

function renderCallback(query: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/" element={<p>home</p>} />
      <Route path="/login" element={<p>login</p>} />
    </Routes>,
    [`/auth/callback${query}`],
  )
}

function startLogin() {
  sessionStorage.setItem('omiyage.meishiSso', JSON.stringify({ state: 'state-1', verifier: 'v'.repeat(43) }))
}

function token(exp = Math.floor(Date.now() / 1000) + 3600) {
  return makeFakeToken({ sub: 'u1', nickname: 'bob', role: 'USER', exp })
}

describe('AuthCallbackPage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null })
  })

  it('exchanges the code through omiyage-api, signs in and leaves the callback', async () => {
    startLogin()
    let body: unknown
    server.use(
      http.post(EXCHANGE, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ token: token() })
      }),
    )

    renderCallback('?code=the-code&state=state-1')

    expect(await screen.findByText('home')).toBeInTheDocument()
    expect(body).toEqual({ code: 'the-code', codeVerifier: 'v'.repeat(43), redirectUri: `${window.location.origin}/auth/callback` })
    expect(useAuthStore.getState().token).not.toBeNull()
  })

  it('refuses a response whose state does not match and never calls the server', async () => {
    startLogin()
    server.use(http.post(EXCHANGE, () => HttpResponse.json({ token: token() })))

    renderCallback('?code=the-code&state=forged')

    expect(await screen.findByRole('alert')).toHaveTextContent('did not match this browser session')
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('shows a denied sign-in', async () => {
    startLogin()

    renderCallback('?error=access_denied&state=state-1')

    expect(await screen.findByRole('alert')).toHaveTextContent('cancelled or denied')
  })

  it.each([
    [400, 'expired or was already used'],
    [401, 'expired or was already used'],
    [403, 'frozen'],
    [404, 'turned off'],
    [503, 'turned off'],
    [429, 'Too many sign-in attempts'],
    [500, 'Could not complete sign-in'],
  ])('explains a %i from the exchange', async (status, text) => {
    startLogin()
    server.use(http.post(EXCHANGE, () => HttpResponse.json({ error: 'nope' }, { status })))

    renderCallback('?code=the-code&state=state-1')

    expect(await screen.findByRole('alert')).toHaveTextContent(text)
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('explains a network failure', async () => {
    startLogin()
    server.use(http.post(EXCHANGE, () => HttpResponse.error()))

    renderCallback('?code=the-code&state=state-1')

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not complete sign-in')
  })

  it('does not sign in with a token that is already expired', async () => {
    startLogin()
    server.use(http.post(EXCHANGE, () => HttpResponse.json({ token: token(1) })))

    renderCallback('?code=the-code&state=state-1')

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not complete sign-in')
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('offers a way back to the login page after a failure', async () => {
    renderCallback('')

    const link = await screen.findByRole('link', { name: 'Back to sign in' })
    link.click()

    await waitFor(() => expect(screen.getByText('login')).toBeInTheDocument())
  })
})
