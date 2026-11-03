import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './authStore'
import { makeFakeToken, makeTokenWithPayload } from '../test/fakeJwt'

const futureExp = Math.floor(Date.now() / 1000) + 3600
const pastExp = Math.floor(Date.now() / 1000) - 3600

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null, sessionExpired: false })
  })

  it.each([
    ['no exp', { sub: 'u', nickname: 'n', role: 'USER' }],
    ['a past exp', { sub: 'u', nickname: 'n', role: 'USER', exp: 1 }],
    ['a non-object payload', 5],
  ])('login rejects a token with %s and stores nothing', (_name, payload) => {
    expect(() => useAuthStore.getState().login(makeTokenWithPayload(payload))).toThrow(Error)

    expect(useAuthStore.getState().token).toBeNull()
    expect(localStorage.getItem('omiyage.token')).toBeNull()
  })

  it('login stores the token and decodes claims', () => {
    const token = makeFakeToken({ sub: 'user-1', nickname: 'bob', role: 'USER', exp: futureExp })
    useAuthStore.getState().login(token)

    expect(useAuthStore.getState().token).toBe(token)
    expect(useAuthStore.getState().claims?.nickname).toBe('bob')
    expect(localStorage.getItem('omiyage.token')).toBe(token)
  })

  it('logout clears token, claims, and localStorage', () => {
    const token = makeFakeToken({ sub: 'user-1', nickname: 'bob', role: 'USER', exp: futureExp })
    useAuthStore.getState().login(token)

    useAuthStore.getState().logout()

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().claims).toBeNull()
    expect(localStorage.getItem('omiyage.token')).toBeNull()
  })

  it('does not restore an expired token from localStorage on module init', async () => {
    const token = makeFakeToken({ sub: 'user-1', nickname: 'bob', role: 'USER', exp: pastExp })
    localStorage.setItem('omiyage.token', token)

    vi.resetModules()
    const { useAuthStore: freshStore } = await import('./authStore')

    expect(freshStore.getState().token).toBeNull()
    expect(localStorage.getItem('omiyage.token')).toBeNull()
  })

  it.each([[{}], [5], [null], [[]]])('does not restore a token with payload %j and removes it', async (payload) => {
    localStorage.setItem('omiyage.token', makeTokenWithPayload(payload))

    vi.resetModules()
    const { useAuthStore: freshStore } = await import('./authStore')

    expect(freshStore.getState().token).toBeNull()
    expect(localStorage.getItem('omiyage.token')).toBeNull()
  })

  it('restores a valid token from localStorage on module init', async () => {
    const token = makeFakeToken({ sub: 'user-1', nickname: 'bob', role: 'USER', exp: futureExp })
    localStorage.setItem('omiyage.token', token)

    vi.resetModules()
    const { useAuthStore: freshStore } = await import('./authStore')

    expect(freshStore.getState().token).toBe(token)
    expect(freshStore.getState().claims?.nickname).toBe('bob')
  })
})
