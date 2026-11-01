import { afterEach, beforeEach, describe, expect, vi } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { useAuthStore } from './authStore'
import { makeFakeToken } from '../test/fakeJwt'

const TOKEN_KEY = 'omiyage.token'
const NOW_MS = Date.UTC(2026, 0, 1)
const NOW_S = NOW_MS / 1000

const claims = (exp: number) =>
  fc.record({
    sub: fc.string(),
    nickname: fc.string(),
    role: fc.constantFrom('USER' as const, 'ADMIN' as const),
    exp: fc.constant(exp),
  })

const validToken = fc
  .integer({ min: NOW_S + 1, max: NOW_S + 1_000_000 })
  .chain((exp) => claims(exp))
  .map(makeFakeToken)

type Command = { type: 'login'; token: string } | { type: 'logout' } | { type: 'expire' }

const command: fc.Arbitrary<Command> = fc.oneof(
  validToken.map((token) => ({ type: 'login' as const, token })),
  fc.constant({ type: 'logout' as const }),
  fc.constant({ type: 'expire' as const }),
)

function run(cmd: Command) {
  const store = useAuthStore.getState()
  if (cmd.type === 'login') store.login(cmd.token)
  else if (cmd.type === 'logout') store.logout()
  else store.expireSession()
}

const freshStore = async () => {
  vi.resetModules()
  return (await import('./authStore')).useAuthStore
}

describe('auth store', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW_MS)
    localStorage.clear()
    useAuthStore.setState({ token: null, claims: null, sessionExpired: false })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test.prop([fc.array(command, { maxLength: 30 })])(
    'storage mirrors the store and an authenticated store holds an unexpired token',
    (commands) => {
      localStorage.clear()
      useAuthStore.setState({ token: null, claims: null, sessionExpired: false })

      for (const cmd of commands) {
        run(cmd)
        const { token, claims: decoded, sessionExpired } = useAuthStore.getState()

        expect(localStorage.getItem(TOKEN_KEY)).toBe(token)
        expect(token === null).toBe(decoded === null)
        if (decoded) expect(decoded.exp * 1000).toBeGreaterThan(Date.now())
        if (cmd.type === 'logout') expect(sessionExpired).toBe(false)
        if (cmd.type === 'expire') expect(sessionExpired).toBe(true)
        if (cmd.type === 'login') expect(sessionExpired).toBe(false)
      }
    },
  )

  test.prop([fc.integer({ min: -1_000_000, max: 1_000_000 }), fc.string()])(
    'a stored token is restored on init only while unexpired, otherwise it is removed',
    async (offsetSeconds, nickname) => {
      const token = makeFakeToken({ sub: 'u', nickname, role: 'USER', exp: NOW_S + offsetSeconds })
      localStorage.setItem(TOKEN_KEY, token)

      const store = await freshStore()

      if (offsetSeconds > 0) {
        expect(store.getState().token).toBe(token)
        expect(localStorage.getItem(TOKEN_KEY)).toBe(token)
      } else {
        expect(store.getState().token).toBeNull()
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
      }
    },
  )

  test.prop([fc.string({ minLength: 1 }).filter((text) => !text.includes('.'))])(
    'a corrupt stored token never authenticates and is cleaned up',
    async (garbage) => {
      localStorage.setItem(TOKEN_KEY, garbage)

      const store = await freshStore()

      expect(store.getState().token).toBeNull()
      expect(store.getState().claims).toBeNull()
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    },
  )
})
