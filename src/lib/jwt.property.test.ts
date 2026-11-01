import { afterEach, describe, expect, vi } from 'vitest'
import { test, fc } from '@fast-check/vitest'
import { decodeJwt, isExpired } from './jwt'
import { makeFakeToken } from '../test/fakeJwt'

const toBase64Url = (text: string, keepPadding: boolean) => {
  const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_')
  return keepPadding ? base64 : base64.replace(/=+$/, '')
}

const tokenWithPayload = (payload: string) => `header.${payload}.signature`

const claims = fc.record({
  sub: fc.string(),
  nickname: fc.oneof(fc.string({ unit: 'binary' }), fc.constantFrom('😀', 'たろう', 'é', '👨‍👩‍👧')),
  role: fc.constantFrom('USER' as const, 'ADMIN' as const),
  exp: fc.integer({ min: 0, max: 4_000_000_000 }),
})

describe('decodeJwt', () => {
  test.prop([claims])('round-trips arbitrary claims including multi-byte nicknames', (value) => {
    expect(decodeJwt(makeFakeToken(value))).toEqual(value)
  })

  test.prop([claims])('accepts base64url payloads with padding', (value) => {
    expect(decodeJwt(tokenWithPayload(toBase64Url(JSON.stringify(value), true)))).toEqual(value)
  })

  test.prop([fc.string().filter((text) => !text.includes('.'))])('rejects tokens without dots', (token) => {
    expect(() => decodeJwt(token)).toThrow(Error)
  })

  test.prop([fc.stringMatching(/^[!*@#$%^&]{1,20}$/)])('rejects payloads that are not base64', (payload) => {
    expect(() => decodeJwt(tokenWithPayload(payload))).toThrow(Error)
  })

  test.prop([
    fc.string().filter((text) => {
      try {
        JSON.parse(text)
        return false
      } catch {
        return true
      }
    }),
  ])('rejects payloads that are not JSON', (text) => {
    expect(() => decodeJwt(tokenWithPayload(toBase64Url(text, false)))).toThrow(Error)
  })
})

describe('isExpired', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const at = (nowMs: number, exp: number) => {
    vi.useFakeTimers()
    vi.setSystemTime(nowMs)
    return isExpired({ sub: 'u', nickname: 'n', role: 'USER', exp })
  }

  test.prop([fc.integer({ min: 0, max: 4_000_000_000 }), fc.integer({ min: 0, max: 4_000_000_000_000 })])(
    'is expired iff now >= exp * 1000',
    (exp, nowMs) => {
      expect(at(nowMs, exp)).toBe(nowMs >= exp * 1000)
    },
  )

  test.prop([fc.integer({ min: 0, max: 4_000_000_000 }), fc.integer({ min: 0, max: 1_000_000 })])(
    'stays expired as time moves forward',
    (exp, later) => {
      expect(at(exp * 1000 + later, exp)).toBe(true)
    },
  )

  test.prop([fc.integer({ min: 1, max: 4_000_000_000 })])('boundary is exact to the millisecond', (exp) => {
    expect(at(exp * 1000 - 1, exp)).toBe(false)
    expect(at(exp * 1000, exp)).toBe(true)
  })
})
