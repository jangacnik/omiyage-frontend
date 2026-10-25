import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../test/server'
import { api, BASE_URL } from './apiClient'
import { useAuthStore } from '../store/authStore'
import { makeFakeToken } from '../test/fakeJwt'

const exp = Math.floor(Date.now() / 1000) + 3600

describe('apiClient 401 handling', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null, sessionExpired: false })
    server.use(http.get(`${BASE_URL}/api/x`, () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 })))
  })

  it('logs out and flags the session as expired when a signed-in request gets 401', async () => {
    useAuthStore.getState().login(makeFakeToken({ sub: 'u1', nickname: 'bob', role: 'USER', exp }))

    await expect(api.get('/api/x')).rejects.toMatchObject({ status: 401 })

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().sessionExpired).toBe(true)
  })

  it('does not flag expiry for a 401 without a token (failed login)', async () => {
    await expect(api.get('/api/x')).rejects.toMatchObject({ status: 401 })

    expect(useAuthStore.getState().sessionExpired).toBe(false)
  })
})
